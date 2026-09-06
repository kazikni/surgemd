import { Hitbox2D, Stream, SeededRandom, v2, v2m, Vec2, DynamicStream, Rect, GameComponent, Scene2DInstance } from "common/engine/core.ts";
import { MapBiomeDef } from "common/scripts/definitions/maps/base.ts"
import { MapRegion } from "common/scripts/packets/map_message.ts"
import { FloorType, River, TerrainManager } from "common/scripts/others/terrain.ts"
import { GameObjectType, Layers, SpawnMode, SpawnModeType } from "common/scripts/others/constants.ts"

export type map_gen_position=(hitbox:Hitbox2D,map:BaseGameMap,random:SeededRandom)=>Vec2
export type map_gen_valid=(hitbox:Hitbox2D,id:number,layer:number,mode:SpawnMode,map:BaseGameMap)=>boolean

export interface BaseScene extends Scene2DInstance{
    map:BaseGameMap
    deadzone:BaseDeadzone
}
export abstract class BaseDeadzone extends GameComponent{
    abstract random_point_inside_cb(hitbox:Hitbox2D,map:BaseGameMap,random:SeededRandom):Vec2
}
export abstract class BaseGameMap{
    scene:BaseScene

    size:Vec2
    seed:number=0
    bounds:Rect
    air_bounds:Rect

    map_stream:Stream=new DynamicStream()
    terrain:TerrainManager=new TerrainManager()
    random!:SeededRandom

    regions:MapRegion[]=[]
    rivers:River[]=[]

    biome!:MapBiomeDef
    default_floor:FloorType=FloorType.Void

    minimap_enabled:boolean=true
    constructor(scene:BaseScene){
        this.scene=scene
        this.size=v2(10,10)
        this.bounds={min:v2.zero(),max:v2.zero()}
        this.air_bounds={min:v2.zero(),max:v2.zero()}
    }

    point_is_valid(hitbox:Hitbox2D,id:number,layer:number,mode:SpawnMode,map:BaseGameMap){
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
        const objs=map.scene.objects.cells.get_objects(hitbox,layer)
        for(const o of objs){
            if(o.id!==id){
                if((o.number_type===GameObjectType.Obstacle||o.number_type===GameObjectType.Building)&&hitbox.colliding_with(o.spawn_hitbox??o.hitbox)){
                    return false
                }
            }
        }
        return true
    }
    random_point_inside(hitbox:Hitbox2D,map:BaseGameMap,random:SeededRandom):Vec2{
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
                gp=this.scene.deadzone.random_point_inside_cb.bind(this.scene.deadzone)
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

    add_region(position:Vec2,name:string):MapRegion{
        const ret={
            position:position,
            name:name
        }
        this.regions.push(ret)
        return ret
    }
}