import { CircleHitbox2D, Hitbox2D, NetStream, polygon2, PolygonHitbox2D, random, RectHitbox2D, SeededRandom, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Game } from "./game.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts"
import { IslandDef, MapDef } from "common/scripts/definitions/maps/base.ts"
import { MapPacket,MapObjectEncode } from "common/scripts/packets/map_packet.ts"
import { FloorType, rivers, TerrainManager } from "common/scripts/others/terrain.ts"
import { Layers, Spawn, SpawnMode, SpawnModeType } from "common/scripts/others/constants.ts"
import { StaticBody } from "../objects/static_body.ts";
import { Obstacle } from "../objects/obstacle.ts"
import { BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts";
import { Building } from "../objects/building.ts";
import { VehicleDef } from "common/scripts/definitions/objects/vehicles.ts";
import { Vehicle } from "../objects/vehicle.ts";
export type map_gen_algorithm=(map:GameMap,random:SeededRandom)=>void
export const generation={
    island:(def:IslandDef)=>{
        return (map:GameMap,random:SeededRandom)=>{
            //Terrain
            map.size=def.size
            map.terrain.add_floor(def.terrain.base,new RectHitbox2D(v2(0,0),v2(map.size.x,map.size.y)),Layers.Normal,false,false)
            let cp=0
            const hitboxes:Hitbox2D[]=[]
            for(const f of def.terrain.floors.sort()){
                cp+=f.padding
                const min=v2(cp,cp),max=v2(map.size.x-cp,map.size.y-cp)
                const hb=new PolygonHitbox2D(polygon2.jagged_rectangle(min,max,f.spacing,f.variation,random))
                hitboxes.push(hb)
                map.terrain.add_floor(f.type,hb,Layers.Normal,true,true,true,hb)
            }
            if(def.terrain.rivers){
                const r=hitboxes[def.terrain.rivers.spawn_floor].to_rect()
                const ri=rivers.generate(new RectHitbox2D(r.min,r.max),def.terrain.rivers.defs,random,def.terrain.rivers.expansion)
                for(const r of ri){
                    map.terrain.add_floor(def.terrain.rivers.floor??FloorType.Water,r.collisions.main,Layers.Normal)
                }
            }
            for(const spawn of def.spawn??[]){
                for(const item of spawn){
                    const count=random.irandom1(item.count)
                    for(let idx=0;idx<count;idx++){
                        const itd=typeof item.def==="string"?item.def:random.weight2(item.def)!.def
                        if(map.game.definitions.creatures.exist(itd)){
                            const def=map.game.definitions.creatures.getFromString(itd)
                            const obj=map.game.add_creature(v2(0,0),def,item.layer)
                            const pos=map.getRandomPosition(obj.hitbox,obj.id,obj.layer,item.spawn??def.spawn??{
                                type:SpawnModeType.whitelist,
                                list:[FloorType.Grass,FloorType.Ice]
                            },random)
                            if(!pos){
                                obj.destroy()
                                break
                            }
                            obj.position=pos
                        }else if(map.game.definitions.buildings.exist(itd)){
                            const def=map.game.definitions.buildings.getFromString(itd)
                            const obj=map.generate_building(def,random,item.spawn,item.layer)
                            if(!obj)break
                        }else if(map.game.definitions.obstacles.exist(itd)){
                            const def=map.game.definitions.obstacles.getFromString(itd)
                            const obj=map.generate_obstacle(def,random,item.spawn,item.layer)
                            if(!obj)break
                        }else if(map.game.definitions.vehicles.exist(itd)){
                            const def=map.game.definitions.vehicles.getFromString(itd)
                            const obj=map.generate_vehicle(def,random,item.spawn,item.layer)
                            if(!obj)break
                        }else if(map.game.loot_tables.tables.has(itd)){
                            const count=random.irandom1(item.count)
                            const layer=item.layer??Layers.Normal
                            const loot=map.game.loot_tables.get_loot(itd,{withammo:true},map.game)
                            const pos:Vec2|undefined=map.getRandomPosition(new CircleHitbox2D(v2(0,0),0.6),-1,layer,{
                                type:SpawnModeType.blacklist,
                                list:[map.def.default_floor??FloorType.Water]
                            },random)
                            if(!pos)break
                            for(const ll of loot){
                                const l = map.game.add_loot(pos,ll.item,ll.count)
                            }
                        }
                    }
                }
            }
        }
    }
}

export class GameMap{
    size:Vec2
    game:Game
    constructor(game:Game,_seed:number=0){
        this.size=v2(10,10)
        this.game=game
    }
    map_packet_stream:NetStream=new NetStream(new ArrayBuffer(400*1024))
    terrain:TerrainManager=new TerrainManager()
    random!:SeededRandom

    objects:StaticBody[]=[]

    point_is_valid(hitbox:Hitbox2D,id:number,layer:number,mode:SpawnMode,map:GameMap){
        const objs=map.game.scene_2d.objects.cells.get_objects(hitbox,layer)
        for(const o of objs){
            if(!(o.id===id&&o.layer===layer)){
                if((o.string_type==="obstacle"||o.string_type==="building")&&hitbox.collidingWith((o as StaticBody).spawn_hitbox??o.hitbox)){
                    return false
                }
            }
        }
        switch(mode.type){
            case SpawnModeType.any:
                break
            case SpawnModeType.blacklist:{
                const floor=map.terrain.get_floor_type(hitbox.position,layer,FloorType.Water)
                return !mode.list.includes(floor)
            }
            case SpawnModeType.whitelist:{
                const floor=map.terrain.get_floor_type(hitbox.position,layer,FloorType.Water)
                return mode.list.includes(floor)
            }
        }
        return true
    }
    random_point_inside(hitbox:Hitbox2D,map:GameMap,random:SeededRandom):Vec2{
        return v2.random2_s(v2.zero,map.size,random)
    }
    getRandomPosition(hitbox:Hitbox2D,id:number,layer:number=Layers.Normal,mode:SpawnMode,random:SeededRandom,gp?:(hitbox:Hitbox2D,map:GameMap,random:SeededRandom)=>Vec2,valid?:(hitbox:Hitbox2D,id:number,layer:number,mode:SpawnMode,map:GameMap)=>boolean,maxAttempts:number=100):Vec2|undefined{
        let pos:Vec2|undefined=undefined
        let attempt=0
        if(!valid){
            valid=this.point_is_valid
        }
        if(!gp){
            gp=this.random_point_inside
        }
        const hb=hitbox
        while(!pos){
            if(attempt>=maxAttempts)break
            pos=gp!(hb,this,random)
            const hh=hb.transform(pos)
            if(!valid!(hh,id,layer,mode,this)){
                pos=undefined
            }
            attempt++
        }
        return pos
    }
    clamp_hitbox(position:Vec2,hb:Hitbox2D):Vec2{
        return hb.clamp(position,v2(0,0),this.size)
    }
    clamp(v:Vec2){
        v2m.clamp2(v,v2.zero,this.size)
    }
    add_obstacle(def:ObstacleDef,layer?:number):Obstacle{
        const o=this.game.scene_2d.objects.add_object(new Obstacle(),layer??Layers.Normal,undefined,{def:def}) as Obstacle
        this.objects.push(o)
        return o
    }
    generate_obstacle(def:ObstacleDef,random:SeededRandom,spawn?:SpawnMode,layer?:Layers):Obstacle|undefined{
        const o=this.add_obstacle(def,layer)
        o.initialize()

        const p=this.getRandomPosition(o.physical_data.spawn_hitbox,o.id,layer??o.layer,spawn??o.def.spawnMode??Spawn.grass,random)
        if(!p){
            o.destroy()
            return undefined
        }
        o.set_position(p)
        o.manager.cells.update_object(o)

        return o
    }
    generate_vehicle(def:VehicleDef,random:SeededRandom,spawn?:SpawnMode,layer?:Layers):Vehicle|undefined{
        const o=this.game.add_vehicle(v2(0,0),def,layer)
        const p=this.getRandomPosition(o.base_hitbox,o.id,layer??o.layer,spawn??Spawn.grass,random)
        if(!p){
            o.destroy()
            return undefined
        }
        o.position=p
        o.physical_data.dirty=true
        o.manager.cells.update_object(o)
        return o
    }
    generate_building(def:BuildingDef,random:SeededRandom,spawn?:SpawnMode,layer?:Layers):Building|undefined{
        const b=new Building()
        b.set_definition(def)
        b.layer=layer??Layers.Normal
        b.init()
        const p=this.getRandomPosition(b.physical_data.spawn_hitbox,b.id,layer??b.layer,spawn??b.def.spawnMode??Spawn.grass,random)
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
    def!:MapDef
    generate(definition:MapDef,seed:number=random.float(0,231412)){
        const random=new SeededRandom(definition.seed??seed)
        this.random=random
        this.def=definition

        this.game.loot_tables.clear()
        this.game.loot_tables.add_tables(definition.loot_tables)

        if(definition.generation.island)generation.island(definition.generation.island)(this,random)

        if(definition.gen_callback)definition.gen_callback(this)

        if(this.game.mods){
            for(const k of this.game.mods.getLoadOrder()){
                const mod=this.game.mods.loaded.get(k)
                if(mod?.module.on_mode_init){
                    mod.module.on_map_generate(mod.ctx,this)
                }
            }
        }

        this.game.deadzone.reset()
        this.game.clients.packets_manager.encode(this.encode(seed),this.map_packet_stream)
    }
    generate_with_algorithm(algorithm:map_gen_algorithm,seed:number=random.float(0,231412)){
        const random=new SeededRandom(seed)
        this.random=random
        algorithm(this,random)
        this.game.clients.packets_manager.encode(this.encode(seed),this.map_packet_stream)
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
        this.game.scene_2d.objects.add_object(b,layer,undefined,{})
        b.set_definition(def)
        return b
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
            biome:this.def.biome
        }
        return p
    }
}