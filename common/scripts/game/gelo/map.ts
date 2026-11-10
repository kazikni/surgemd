import { CircleCollider2D, Collider2D, gel_events, GELComponent, Polygon2D, PolygonCollider2D, random, Rect, RectCollider2D, SeededRandom, v2, v2m, Vec2 } from "../../../engine/core.ts";
import { MapBiomeDef, MapDef, MapObjectGeneration, MapStructureDef } from "../../definitions/maps/base.ts";
import { ObstacleDef } from "../../definitions/objects/obstacles.ts";
import { gelo_instance_type, Layers, object_instance_type, ObjectType, Spawn, SpawnMode, SpawnModeType } from "../../others/constants.ts";
import { FloorType, generate_terrain_shape, River, TerrainManager } from "../../others/terrain.ts";
import { CommonGELO, CommonPlayScene, SimulatedGELO, SimulatedObject, SimulatedScene, type CommonApplication } from "../base.ts";
import { type SI_Obstacle } from "../objects/static_body/obstacle.ts";
import { type SI_StaticBody } from "../objects/static_body/static_body.ts";

export type map_gen_position=(collider:Collider2D,map:SI_GameMap)=>Vec2
export type map_gen_valid=(collider:Collider2D,id:number,layer:number,mode:SpawnMode,map:SI_GameMap)=>boolean

export const gamemap_events={
    generated:gel_events.last+1
}

export interface MapRegion{
    name:string
    position:Vec2
}
export type C_GameMap=CommonGELO&{
    app: CommonApplication;
    scene: CommonPlayScene;
    id: string | number;

    terrain:TerrainManager
    seed:number
    size:Vec2
    biome:MapBiomeDef
    regions:MapRegion[]

    default_layer:number
    default_floor:FloorType
}

export const c_gamemap:GELComponent<C_GameMap>={
    id_string:"c_gamemap",
    events:{
        [gel_events.bind]:function(){
            this.instance_type=gelo_instance_type.map
            this.terrain=new TerrainManager()
            this.seed=0
            this.size=v2.zero
            this.regions=[]
            this.default_layer=Layers.Normal
            this.default_floor=FloorType.Void
        }
    },
}

export interface MapStructure{
    def:MapStructureDef
    shape:Polygon2D
    col:PolygonCollider2D
    circle_col:CircleCollider2D
    position:Vec2
}
export type SI_GameMap=C_GameMap&SimulatedGELO&{
    scene: SimulatedScene
    bounds:Rect
    air_bounds:Rect

    default_spawn_mode:SpawnMode

    random:SeededRandom

    rivers:River[]
    structures:MapStructure[]

    clamp_collider(position:Vec2,col:Collider2D):Vec2
    clamp(v:Vec2):void

    point_is_valid(collider:Collider2D,id:number,layer:number,mode:SpawnMode,map:SI_GameMap):boolean
    random_point_inside(collider:Collider2D,map:SI_GameMap):Vec2

    get_random_position(collider:Collider2D,id:number,layer:number,mode:SpawnMode,gp?:map_gen_position,valid?:map_gen_valid,maxAttempts?:number):Vec2|undefined
    
    generate_obstacle(def:ObstacleDef,spawn?:SpawnMode,layer?:Layers,gen_position?:map_gen_position,gen_valid?:map_gen_valid):SI_Obstacle|undefined
    generate_object(name:string,layer?:Layers,spawn?:SpawnMode,gen_position?:map_gen_position,gen_valid?:map_gen_valid):SimulatedObject
    generate_objects(obj:MapObjectGeneration,gen_position?:map_gen_position,gen_valid?:map_gen_valid):void

    generate_structures(structures:MapStructureDef[],spawn:CircleCollider2D):void
    generate_structure_before(spawn:CircleCollider2D,def:MapStructureDef):MapStructure|undefined
    generate_structure_after(struct:MapStructure):void

    generate(definition:MapDef,seed?:number,minimap_enabled?:boolean):void

}
export const si_gamemap:GELComponent<SI_GameMap>={
    id_string:"si_gamemap",
    extensions:[c_gamemap],
    events:{
        [gel_events.bind]:function(){
            this.bounds={min:v2.zero(),max:v2.zero()}
            this.air_bounds={min:v2.zero(),max:v2.zero()}
            this.default_spawn_mode=Spawn.grass
            this.rivers=[]
            this.structures=[]
        }
    },
    methods:{
        clamp_collider(position:Vec2,col:Collider2D):Vec2{
            return col.clamp(position,this.bounds.min,this.bounds.max)
        },
        clamp(v:Vec2):void{
            v2m.clamp2(v,this.bounds.min,this.bounds.max)
        },

        point_is_valid(collider:Collider2D,id:number,layer:number,mode:SpawnMode,map:SI_GameMap){
            switch(mode.type){
                case SpawnModeType.any:
                    break
                case SpawnModeType.blacklist:{
                    const floor=map.terrain.get_floor_type(collider.position,layer,map.default_floor)
                    if(mode.list.includes(floor))return false
                    break
                }
                case SpawnModeType.whitelist:{
                    const floor=map.terrain.get_floor_type(collider.position,layer,map.default_floor)
                    if(!mode.list.includes(floor))return false
                    break
                }
                case SpawnModeType.river:{
                    let some=false
                    for(const river of map.rivers){
                        if(river.get_point_inside(collider.position)){
                            if(mode.list.length>0){
                                const floor=map.terrain.get_floor_type(collider.position,layer,map.default_floor)
                                if(!mode.list.includes(floor))continue
                            }
                            some=true
                            break
                        }
                    }
                    if(!some)return false
                    break
                }
            }
            const objs:SimulatedObject[]=map.scene.cells.get_objects(collider,layer)
            for(const o of objs){
                if(o.id!==id){
                    if((o.__components.has("c_static_body"))&&!(o as SI_StaticBody).physical.no_spawn_collision&&collider.colliding_with((o as SI_StaticBody).spawn_collider??o.collider)){
                        return false
                    }
                }
            }
            return true
        },
        random_point_inside(_collider:Collider2D,map:SI_GameMap):Vec2{
            return v2.random2_s(v2.zero,map.size,map.random)
        },
        get_random_position(collider:Collider2D,id:number,layer:number,mode:SpawnMode,gp?:map_gen_position,valid?:map_gen_valid,maxAttempts:number=100):Vec2|undefined{
            if(mode.type===SpawnModeType.fixed)return mode.position
            let pos:Vec2|undefined=undefined
            let attempt=0
            if(!valid){
                valid=this.point_is_valid
            }
            if(!gp){
                gp=this.random_point_inside
            }
            const hb=collider.clone()
            while(!pos){
                if(attempt>=maxAttempts)break
                pos=gp!(hb,this)
                hb.copy_from(collider)
                hb.translate(pos)
                if(!valid!(hb,id,layer,mode,this)){
                    pos=undefined
                }
                attempt++
            }
            return pos
        },

        generate(definition:MapDef,seed:number=random.int(0,231412)){
            this.seed=seed
            const random=new SeededRandom(definition.seed??seed)
            this.random=random

            this.scene.mode.loot_tables.clear()
            this.scene.mode.loot_tables.add_tables(definition.loot_tables)

            this.default_floor=definition.default_floor??FloorType.Void

            const bounds_size=definition.bounds_size===undefined?0:definition.bounds_size
            this.size=definition.size
            this.bounds=definition.bounds??{
                min:v2(-bounds_size,-bounds_size),
                max:v2(this.size.x+bounds_size,this.size.y+bounds_size)
            }
            this.air_bounds=definition.bounds??{
                min:v2(-40,-40),
                max:v2(this.size.x+40,this.size.y+40)
            }
            this.biome=definition.biome
            //Terrain
            this.terrain.add_floor({
                type:definition.generation.base,
                hb:new RectCollider2D(v2(0,0),this.size),
                layer:this.default_layer,
                visible:true,
                smooth:false,
                tint:definition.generation.base_tint
            })
            for(const def of definition.generation.islands??[]){
                const position=def.position??v2.scale(this.size,0.5)
                const size=def.size??this.size
                const rect=RectCollider2D.centered(position,size)
                if(def.terrain){
                    const base=generate_terrain_shape(def.terrain,this.terrain,random,0,position)
                    if(def.terrain.rivers){
                        const rivers=River.generate_rivers(base,def.terrain.rivers.defs,random)
                        this.rivers.push(...rivers)
                        for(const r of rivers){
                            for(const layer of r.layers){
                                this.terrain.add_floor({
                                    type:layer.floor,
                                    hb:layer.hb,
                                    visible:true,
                                    smooth:true,
                                    tint:layer.floor_tint,
                                    layer:layer.layer??this.default_layer,
                                })
                            }
                        }
                    }
                }
                this.generate_structures(def.structures??[],new CircleCollider2D(position,Math.max(size.x,size.y)*0.3))
                for(const spawn of def.spawn??[]){
                    this.generate_objects(spawn,(h,m)=>{
                        return v2(m.random.float(rect.min.x,rect.max.x),m.random.float(rect.min.y,rect.max.y))
                    })
                }
            }
            if(definition.generation.callback)definition.generation.callback(this)
            for(const spawn of definition.generation.spawn??[]){
                this.generate_objects(spawn)
            }
            /*for(const b of definition.generation.objects?.buildings??[]){
                const obj=this.add_building(this.scene.game.definitions.buildings.getFromString(b.def),b.layer)
                obj.init(b.side)
                obj.generate(b.position)
            }
            for(const i of definition.generation.objects?.items??[]){
                const obj=this.scene.add_loot(i.position,{count:i.count,item:this.scene.game.definitions.game_items.valueString[i.def],skin:i.skin},i.layer)
                if(i.velocity)obj.velocity=v2.clone(i.velocity)
            }

            this.scene.game.start_settings.textures.push(...definition.assets?.textures??[])
            this.scene.game.start_settings.textures.push(...definition.biome.textures)
            this.scene.game.start_settings.musics.push(...definition.biome.musics)

            this.map_stream.clear(true)
            this.encode(this.map_stream)
            this.map_stream.lock()*/

            this.emit_event(gamemap_events.generated)
        },

        generate_obstacle(def:ObstacleDef,spawn?:SpawnMode,layer?:number,gen_position?:map_gen_position,gen_valid?:map_gen_valid):SI_Obstacle|undefined{
            const o=this.scene.add_object(this.scene.make_object(object_instance_type.obstacle),layer??this.default_layer,undefined,{def}) as SI_Obstacle
            o.init()
            const p=this.get_random_position(o.physical.spawn_collider??o.base_collider,o.id,o.layer,spawn??o.def.spawnMode??this.default_spawn_mode,gen_position,gen_valid)
            if(!p){
                o.destroy()
                return undefined
            }
            o.set_position(p)
            o.manager.cells.update_object(o)
            return o
        },
        generate_object(name:string,layer?:Layers,spawn?:SpawnMode,gen_position?:map_gen_position,gen_valid?:map_gen_valid):SimulatedObject|undefined{
            let obj:SimulatedObject|undefined

            if(this.scene.app.definitions.creatures.exist(name)){
                /*const def=this.scene.app.definitions.creatures.getFromString(name)
                obj=this.scene.add_creature(v2(0,0),def,layer)
                const pos=this.getRandomPosition(obj.hitbox,obj.id,obj.layer,spawn??def.spawn??{
                    type:SpawnModeType.whitelist,
                    list:[FloorType.Grass,FloorType.Ice]
                },random,gen_position,gen_valid)
                if(!pos){
                    obj.destroy()
                    return
                }
                obj.position=pos*/
            }else if(this.scene.app.definitions.buildings.exist(name)){
                const def=this.scene.app.definitions.buildings.getFromString(name)
                //obj=this.generate_building(def,random,spawn,layer,gen_position,gen_valid)
            }else if(this.scene.app.definitions.obstacles.exist(name)){
                const def=this.scene.app.definitions.obstacles.getFromString(name)
                obj=this.generate_obstacle(def,spawn,layer,gen_position,gen_valid)
            }else if(this.scene.app.definitions.vehicles.exist(name)){
                const def=this.scene.app.definitions.vehicles.getFromString(name)
                //obj=this.generate_vehicle(def,random,spawn,layer)
                //if(obj)(obj as Vehicle).physical_data.rotation=random.rad()
            }else if(this.scene.mode.loot_tables.tables.has(name)){
                const position:Vec2|undefined=this.get_random_position(new CircleCollider2D(v2(0,0),0.6),-1,layer??this.default_layer,spawn??this.default_spawn_mode,gen_position,gen_valid)
                if(!position)return
                const loot=this.scene.mode.get_loot(name)
                for(const data of loot){
                    const l=this.scene.add_object(this.scene.make_object(object_instance_type.loot),layer??this.default_layer,undefined,{data,position})
                    if(!obj)obj=l
                }
            }
            return obj
        },
        generate_objects(obj:MapObjectGeneration,gen_position?:map_gen_position,gen_valid?:map_gen_valid){
            const count=this.random.random1(obj.count)
            for(let idx=0;idx<count;idx++){
                const name=typeof obj.def==="string"?obj.def:this.random.weight2(obj.def).def
                this.generate_object(name,obj.layer,obj.spawn,gen_position,gen_valid)
            }
        },
        generate_structures(structures:MapStructureDef[],spawn:CircleCollider2D){
            for(const def of structures){
                this.generate_structure_before(spawn,def)
            }
            for(const s of this.structures){
                this.generate_structure_after(s)
            }
        },
        generate_structure_before(spawn:CircleCollider2D,def:MapStructureDef):MapStructure|undefined{
            let position:Vec2|undefined
            const circle_hb=new CircleCollider2D(v2(0,0),def.radius)
            let attempts=100
            while(attempts>0&&position===undefined){
                position=spawn.random_point()
                circle_hb.position=position
                for(const o_s of this.structures){
                    if(o_s.circle_col.colliding_with(circle_hb)){
                        position=undefined
                        break
                    }
                }
                attempts++
            }
            if(!position)return
            const terrain_shape=generate_terrain_shape(def,this.terrain,this.random,this.default_layer,position)
            const struct:MapStructure={
                position:position,
                shape:terrain_shape,
                col:new PolygonCollider2D(terrain_shape),
                def:def,
                circle_col:circle_hb,
            }
            this.structures.push(struct)
            if(def.region)this.regions.push({name:def.region.name,position:v2.add(def.region.position,position)})
        },
        generate_structure_after(struct:MapStructure){
            for(const spawn of struct.def.spawn??[]){
                this.generate_objects(spawn,(h,m)=>{
                        const pos=m.random.random_in_circle(struct.circle_col.radius)
                        v2m.add(pos,pos,struct.circle_col.position)
                        return pos
                    },(col,id,layer,mode,map)=>{
                        const ok=struct.col.point_inside(col.position)&&map.point_is_valid(col,id,layer,mode,map)
                        return ok
                    }
                )
            }
        }
        /*generate_obstacle(def:ObstacleDef,random:SeededRandom,spawn?:SpawnMode,layer?:Layers,gen_position?:map_gen_position,gen_valid?:map_gen_valid):Obstacle|undefined{
            const o=this.add_obstacle(def,layer)
            o.initialize()

            const p=this.getRandomPosition(o.physical_data.spawn_hitbox??o.base_hitbox,o.id,layer??o.layer,spawn??o.def.spawnMode??Spawn.grass,random,gen_position,gen_valid)
            if(!p){
                o.destroy()
                return undefined
            }
            o.set_position(p,true)

            const floor=this.terrain.get_floor_type(p,o.layer,FloorType.Void)
            const skin_apply=Floors[floor as FloorType]?.skin_apply
            if(skin_apply){
                const idx=(def.assets?.frame?.biome_skins??[]).indexOf(skin_apply)
                if(idx!==-1){
                    o.visual_data.skin=idx+1
                }
            }
            o.manager.cells.update_object(o)

            return o
        }
        generate_vehicle(def:VehicleDef,random:SeededRandom,spawn?:SpawnMode,layer?:Layers,gen_position?:map_gen_position,gen_valid?:map_gen_valid):Vehicle|undefined{
            const o=this.scene.add_vehicle(v2(0,0),def,layer)
            const p=this.getRandomPosition(o.base_hitbox,o.id,layer??o.layer,spawn??def.spawn??Spawn.grass,random,gen_position,gen_valid)
            if(!p){
                o.destroy()
                return undefined
            }
            o.position=p
            o.physical_data.dirty=true
            o.manager.cells.update_object(o)
            return o
        }
        generate_building(def:BuildingDef,random:SeededRandom,spawn?:SpawnMode,layer?:Layers,gen_position?:map_gen_position,gen_valid?:map_gen_valid):Building|undefined{
            const b=new Building()
            b.set_definition(def)
            b.layer=layer??this.default_layer
            b.init()
            const p=this.getRandomPosition(b.physical_data.spawn_hitbox??b.base_hitbox,b.id,layer??b.layer,spawn??b.def.spawnMode??Spawn.grass,random,gen_position,gen_valid)
            if(!p){
                b.destroy()
                return undefined
            }
            this.scene.objects.add_object(b,b.layer,undefined,{
                def:def
            })
            b.generate(p)
            return b
        }
        */
    }
}