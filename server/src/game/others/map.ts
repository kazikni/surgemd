import { CircleHitbox2D,Hitbox2D, Stream, Polygon2D, PolygonHitbox2D, random, RectHitbox2D, SeededRandom, v2, v2m, Vec2, DynamicStream, Rect } from "common/engine/core.ts";
import { type Game } from "./game.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts"
import { MapBiomeDef, MapDef, MapObjectGeneration, MapStructureDef } from "common/scripts/definitions/maps/base.ts"
import { MapPacket,MapObjectEncode, MapRegion } from "common/scripts/packets/map_packet.ts"
import { Floors, FloorType, generate_terrain_shape, River, TerrainManager } from "common/scripts/others/terrain.ts"
import { GameObjectType, Layers, Spawn, SpawnMode, SpawnModeType } from "common/scripts/others/constants.ts"
import { StaticBody } from "../objects/static_body.ts";
import { Obstacle } from "../objects/obstacle.ts"
import { BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts";
import { Building } from "../objects/building.ts";
import { VehicleDef } from "common/scripts/definitions/objects/vehicles.ts";
import { Vehicle } from "../objects/vehicle.ts";
import { ServerGameObject } from "./gameObject.ts";
import { GameADefinitions } from "common/scripts/definitions/game_defs.ts";
import { MapZone } from "common/scripts/packets/general_update.ts";
export type map_gen_position=(hitbox:Hitbox2D,map:GameMap,random:SeededRandom)=>Vec2
export type map_gen_valid=(hitbox:Hitbox2D,id:number,layer:number,mode:SpawnMode,map:GameMap)=>boolean
export type map_gen_algorithm=(map:GameMap,random:SeededRandom)=>void
export interface MapStructure{
    def:MapStructureDef
    shape:Polygon2D
    hb:PolygonHitbox2D
    circle_hb:CircleHitbox2D
    position:Vec2
}

export class GameMap{
    size:Vec2
    bounds:Rect
    air_bounds:Rect
    game:Game
    constructor(game:Game,_seed:number=0){
        this.size=v2(10,10)
        this.bounds={min:v2.zero(),max:v2.zero()}
        this.air_bounds={min:v2.zero(),max:v2.zero()}
        this.game=game
    }
    map_packet_stream:Stream=new DynamicStream()
    terrain:TerrainManager=new TerrainManager()
    random!:SeededRandom

    regions:MapRegion[]=[]
    rivers:River[]=[]
    objects:StaticBody[]=[]
    structures:MapStructure[]=[]

    definitions:GameADefinitions={}
    biome!:MapBiomeDef
    default_floor:FloorType=FloorType.Void

    point_is_valid(hitbox:Hitbox2D,id:number,layer:number,mode:SpawnMode,map:GameMap){
        switch(mode.type){
            case SpawnModeType.any:
                break
            case SpawnModeType.blacklist:{
                const floor=map.terrain.get_floor_type(hitbox.position,layer,FloorType.Void)
                if(mode.list.includes(floor))return false
                break
            }
            case SpawnModeType.whitelist:{
                const floor=map.terrain.get_floor_type(hitbox.position,layer,FloorType.Void)
                if(!mode.list.includes(floor))return false
                break
            }
            case SpawnModeType.river:{
                let some=false
                for(const river of map.rivers){
                    if(river.get_point_inside(hitbox.position)){
                        if(mode.list.length>0){
                            const floor=map.terrain.get_floor_type(hitbox.position,layer,FloorType.Void)
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
        const objs=map.game.scene_2d.objects.cells.get_objects(hitbox,layer)
        for(const o of objs){
            if(o.id!==id){
                if((o.number_type===GameObjectType.Obstacle||o.number_type===GameObjectType.Building)&&hitbox.colliding_with((o as StaticBody).spawn_hitbox??o.hitbox)){
                    return false
                }
            }
        }
        return true
    }
    random_point_inside(hitbox:Hitbox2D,map:GameMap,random:SeededRandom):Vec2{
        return v2.random2_s(v2.zero,map.size,random)
    }
    getRandomPosition(hitbox:Hitbox2D,id:number,layer:number=Layers.Normal,mode:SpawnMode,random:SeededRandom,gp?:map_gen_position,valid?:map_gen_valid,maxAttempts:number=100):Vec2|undefined{
        if(mode.type===SpawnModeType.fixed)return mode.position
        let pos:Vec2|undefined=undefined
        let attempt=0
        if(!valid){
            valid=this.point_is_valid
        }
        if(!gp){
            if(mode.position_generator==="deadzone"){
                gp=this.game.deadzone.random_point_inside_cb.bind(this.game.deadzone)
            }else{
                gp=this.random_point_inside
            }
        }
        const hb=hitbox.clone()
        while(!pos){
            if(attempt>=maxAttempts)break
            pos=gp!(hb,this,random)
            hb.copy_from(hitbox)
            hb.translate(pos)
            if(!valid!(hb,id,layer,mode,this)){
                pos=undefined
            }
            attempt++
        }
        return pos
    }
    
    get_biome(pos:Vec2):MapBiomeDef{
        return this.biome
    }
    clamp_hitbox(position:Vec2,hb:Hitbox2D):Vec2{
        return hb.clamp(position,this.bounds.min,this.bounds.max)
    }
    clamp(v:Vec2){
        v2m.clamp2(v,v2.zero,this.size)
    }
    add_obstacle(def:ObstacleDef,layer?:number):Obstacle{
        const o=this.game.scene_2d.objects.add_object(new Obstacle(),layer??Layers.Normal,undefined,{def:def}) as Obstacle
        this.objects.push(o)
        return o
    }
    generate_object(name:string,random:SeededRandom,layer?:Layers,spawn?:SpawnMode,gen_position?:map_gen_position,gen_valid?:map_gen_valid):ServerGameObject|undefined{
        let obj:ServerGameObject|undefined
        if(this.game.definitions.creatures.exist(name)){
            const def=this.game.definitions.creatures.getFromString(name)
            obj=this.game.add_creature(v2(0,0),def,layer)
            const pos=this.getRandomPosition(obj.hitbox,obj.id,obj.layer,spawn??def.spawn??{
                type:SpawnModeType.whitelist,
                list:[FloorType.Grass,FloorType.Ice]
            },random,gen_position,gen_valid)
            if(!pos){
                obj.destroy()
                return
            }
            obj.position=pos
        }else if(this.game.definitions.buildings.exist(name)){
            const def=this.game.definitions.buildings.getFromString(name)
            obj=this.generate_building(def,random,spawn,layer,gen_position,gen_valid)
        }else if(this.game.definitions.obstacles.exist(name)){
            const def=this.game.definitions.obstacles.getFromString(name)
            obj=this.generate_obstacle(def,random,spawn,layer,gen_position,gen_valid)
        }else if(this.game.definitions.vehicles.exist(name)){
            const def=this.game.definitions.vehicles.getFromString(name)
            obj=this.generate_vehicle(def,random,spawn,layer)
            if(obj)(obj as Vehicle).physical_data.rotation=random.rad()
        }else if(this.game.loot_tables.tables.has(name)){
            const loot=this.game.get_loot_table(name)
            const pos:Vec2|undefined=this.getRandomPosition(new CircleHitbox2D(v2(0,0),0.6),-1,layer??Layers.Normal,Spawn.grass,random,gen_position,gen_valid)
            if(!pos)return
            for(const ll of loot){
                const l = this.game.add_loot(pos,ll,layer)
                if(!obj)obj=l
            }
        }
        return obj
    }
    generate_objects(obj:MapObjectGeneration,random:SeededRandom,gen_position?:map_gen_position,gen_valid?:map_gen_valid){
        const count=random.random1(obj.count)
        for(let idx=0;idx<count;idx++){
            const name=typeof obj.def==="string"?obj.def:random.weight2(obj.def).def
            this.generate_object(name,random,obj.layer,obj.spawn,gen_position,gen_valid)
        }
    }
    generate_obstacle(def:ObstacleDef,random:SeededRandom,spawn?:SpawnMode,layer?:Layers,gen_position?:map_gen_position,gen_valid?:map_gen_valid):Obstacle|undefined{
        const o=this.add_obstacle(def,layer)
        o.initialize()

        const p=this.getRandomPosition(o.physical_data.spawn_hitbox,o.id,layer??o.layer,spawn??o.def.spawnMode??Spawn.grass,random,gen_position,gen_valid)
        if(!p){
            const idx=this.objects.indexOf(o)
            if(idx!==-1)this.objects.splice(idx,1)
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
        const o=this.game.add_vehicle(v2(0,0),def,layer)
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
        b.layer=layer??Layers.Normal
        b.init()
        const p=this.getRandomPosition(b.physical_data.spawn_hitbox,b.id,layer??b.layer,spawn??b.def.spawnMode??Spawn.grass,random,gen_position,gen_valid)
        if(!p){
            b.destroy()
            return undefined
        }
        this.game.scene_2d.objects.add_object(b,b.layer,undefined,{
            def:def
        })
        b.generate(p)
        return b
    }
    generate_structures(structures:MapStructureDef[],spawn:CircleHitbox2D,random:SeededRandom){
        for(const def of structures){
            this.generate_structure_before(spawn,def,random)
        }
        for(const s of this.structures){
            this.generate_structure_after(s,random)
        }
    }
    generate_structure_before(spawn:CircleHitbox2D,def:MapStructureDef,random:SeededRandom):MapStructure|undefined{
        let position:Vec2|undefined
        const circle_hb=new CircleHitbox2D(v2(0,0),def.radius)
        let attempts=100
        while(attempts>0&&position===undefined){
            position=spawn.random_point()
            circle_hb.position=position
            for(const o_s of this.structures){
                if(o_s.circle_hb.colliding_with(circle_hb)){
                    position=undefined
                    break
                }
            }
            attempts++
        }
        if(!position)return
        const terrain_shape=generate_terrain_shape(def,this.terrain,random,Layers.Normal,position)
        const struct:MapStructure={
            position:position,
            shape:terrain_shape,
            hb:new PolygonHitbox2D(terrain_shape),
            def:def,
            circle_hb:circle_hb,
        }
        this.structures.push(struct)
        if(def.region)this.add_region(v2.add(def.region.position,position),def.region.name)
    }
    generate_structure_after(struct:MapStructure,random:SeededRandom){
        for(const spawn of struct.def.spawn??[]){
            this.generate_objects(spawn,random,(h,m,r)=>{
                    const pos=r.random_in_circle(struct.circle_hb.radius)
                    v2m.add(pos,pos,struct.circle_hb.position)
                    return pos
                },(hb,id,layer,mode,map)=>{
                const ok=struct.hb.point_inside(hb.position)&&map.point_is_valid(hb,id,layer,mode,map)
                return ok
            })
        }
    }
    
    generate(definition:MapDef,seed:number=random.float(0,231412)){
        const random=new SeededRandom(definition.seed??seed)
        this.random=random

        this.game.loot_tables.clear()
        this.game.loot_tables.add_tables(definition.loot_tables)

        this.game.definitions.add_definitions(definition.definitions??{})
        if(this.game.mods){
            for(const k of this.game.mods.getLoadOrder()){
                const mod=this.game.mods.loaded.get(k)
                if(mod?.module.on_mode_init){
                    mod.module.on_map_generate(mod.ctx,this)
                }
            }
        }

        const bounds_size=definition.bounds_size===undefined?100:definition.bounds_size
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
        this.definitions=definition.definitions??{}
        //Terrain
        this.rivers.length=0
        this.terrain.add_floor({
            type:definition.generation.base,
            hb:new RectHitbox2D(v2(0,0),this.size),
            layer:Layers.Normal,
            visible:true,
            smooth:false,
            tint:definition.generation.base_tint
        })
        for(const def of definition.generation.islands??[]){
            const position=def.position??v2.scale(this.size,0.5)
            const size=def.size??this.size
            const rect=RectHitbox2D.centered(position,size)
            if(def.terrain){
                const base=generate_terrain_shape(def.terrain,this.terrain,random,Layers.Normal,position)
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
                                layer:layer.layer??Layers.Normal,
                            })
                        }
                    }
                }
            }
            this.generate_structures(def.structures??[],new CircleHitbox2D(position,Math.max(size.x,size.y)*0.3),random)
            for(const spawn of def.spawn??[]){
                this.generate_objects(spawn,random,(h,m,r)=>{
                    return v2(r.float(rect.min.x,rect.max.x),r.float(rect.min.y,rect.max.y))
                })
            }
        }
        if(definition.generation.callback)definition.generation.callback(this)
        for(const spawn of definition.generation.spawn??[]){
            this.generate_objects(spawn,random)
        }

        for(const b of definition.generation.objects?.buildings??[]){
            const obj=this.add_building(this.game.definitions.buildings.getFromString(b.def),b.layer)
            obj.init(b.side)
            obj.generate(b.position)
        }
        for(const i of definition.generation.objects?.items??[]){
            const obj=this.game.add_loot(i.position,{count:i.count,item:this.game.definitions.game_items.valueString[i.def],skin:i.skin},i.layer)
            if(i.velocity)obj.velocity=v2.clone(i.velocity)
        }

        this.game.start_settings.textures.push(...definition.assets?.textures??[])
        this.game.start_settings.textures.push(...definition.biome.textures)
        this.game.start_settings.musics.push(...definition.biome.musics)

        this.game.deadzone.reset()
        this.game.clients.packets_manager.encode(this.encode(seed),this.map_packet_stream)
        this.map_packet_stream.lock()
    }
    generate_with_algorithm(algorithm:map_gen_algorithm,seed:number=random.float(0,231412)){
        const random=new SeededRandom(seed)
        this.random=random
        algorithm(this,random)
        this.game.clients.packets_manager.encode(this.encode(seed),this.map_packet_stream)
        this.map_packet_stream.lock()
    }
    soft_reset(){
        this.random.reset()
        for(const o of this.objects){
            if(o instanceof Obstacle){
                o.reset()
            }
        }
    }
    add_building(def:BuildingDef,layer:number=Layers.Normal){
        const b=new Building()
        b.set_definition(def)
        this.game.scene_2d.objects.add_object(b,layer,undefined,{})
        return b
    }
    add_region(position:Vec2,name:string):MapRegion{
        const ret={
            position:position,
            name:name
        }
        this.regions.push(ret)
        return ret
    }
    encode(seed:number):MapPacket{
        const p=new MapPacket()
        const objects:MapObjectEncode[]=[]
        for(const o of this.objects){
            if(o instanceof Obstacle){
                if(!o.def.invisible_on_map){
                    objects.push({
                        type:0,
                        def:o.def.idNumber!,
                        position:o.position,
                        rotation:o.physical_data.rotation,
                        scale:o.physical_data.scale,
                        variation:o.visual_data.variation,
                        skin:o.visual_data.skin,
                    })
                }
            }
        }
        p.map={
            terrain:this.terrain.floors,
            size:this.size,
            seed:seed,
            objects,
            biome:this.biome,
            definitions:this.definitions,
            regions:this.regions
        }
        return p
    }
}