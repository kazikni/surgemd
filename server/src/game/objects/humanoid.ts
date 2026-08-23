import { FloorType } from "common/scripts/others/terrain.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { BaseObject2D, CircleHitbox2D, GameObjectManager2D, Hitbox2D, PolarMovement, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { GameConstants, GameObjectType, HumanoidVisualData } from "common/scripts/others/constants.ts";
import { LoadoutBodyDef, LoadoutLegDef, LoadoutShirtDef } from "common/scripts/definitions/loadout/skins.ts";
import { type StaticBody } from "./static_body.ts";
import { type Obstacle } from "./obstacle.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { type Building } from "./building.ts";
export type HumanoidPhysicalData=MovingBodyPhysicalData&{
    dirty:boolean
    scale:number
    current_floor:FloorType
}
export type HumanoidInput={
    movement:PolarMovement
    rotation:number
}
export type HumanoidAnimationData={
    dirty:boolean
    alt_animations:string[]
}
export class Humanoid extends MovingBody {
    string_type:string="humanoid"
    number_type:number=GameObjectType.Humanoid

    health:{
        value:number
        max:number
        old:number
        invensibility:number
    }

    old_position:Vec2=v2.zero()
    physical_data: HumanoidPhysicalData = {
        rotation: 0,
        scale: 1,
        velocity: v2.zero(),
        current_floor:0,
        dirty:true,
    }

    dead = false
    downed = false

    animation_data:HumanoidAnimationData={
        dirty:false,
        alt_animations:[]
    }
    visual!:HumanoidVisualData
    input: HumanoidInput={rotation:0,movement:{dir:0,scale:0}}

    constructor() {
        super()

        this.old_position=v2.clone(this.position)
        this.base_hitbox = new CircleHitbox2D(v2.zero(),GameConstants.humanoid.radius)

        this.health={
            invensibility:0,
            max:100,
            value:100,
            old:-1,
        }
    }
    update_body(){
        this.base_hitbox = new CircleHitbox2D(v2(0,0),GameConstants.humanoid.radius*this.physical_data.scale)
    }

    override on_create(args:any){
        super.on_create(args)
        this.visual={
            accessorys:[],
            body:{def:this.game.definitions.loadout.getFromString("body_1") as LoadoutBodyDef,tint:0x000000},
            legs:this.game.definitions.loadout.getFromString("blue_jeans_pants") as LoadoutLegDef,
            shirt:this.game.definitions.loadout.getFromString("black_shirt") as LoadoutShirtDef,
            
        }
    }
    isBlockedForPath(manager: GameObjectManager2D<BaseObject2D>,hb: Hitbox2D,_x: number,_y: number,layer: number): boolean {
        for (const obj of manager.cells.get_objects(hb, layer)) {
            if ((obj.number_type===GameObjectType.Building||obj.number_type===GameObjectType.Obstacle)&&!(obj as StaticBody).physical_data.no_collision&&!(obj as StaticBody).physical_data.no_pathfinding_collision){
                if(hb.colliding_with(obj.hitbox))return true
            }
        }
        return false
    }

    override on_collided(obj: ServerGameObject,_dt:number): void {
        switch(obj.number_type){
            case GameObjectType.Building:
            case GameObjectType.Obstacle:{
                if((obj as Obstacle|Building).physical_data.stairs.length>0){
                    for(const s of (obj as Obstacle|Building).physical_data.stairs){
                        if(s.hitbox.colliding_with(this.hitbox))this.manager.set_layer(this,obj.layer+s.dest_layer)
                    }
                }
                if((obj as Obstacle|Building).physical_data.no_collision)break
                const collision=this.hitbox.overlap_collisions(obj.hitbox)
                for(const col of collision){
                    v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
                }
                break
            }
        }
    }
    tick_movement(dt: number) {
    }
    update_skin() {
    }

    override on_net_update(): void {
        super.on_net_update()
        this.physical_data.dirty=false
        this.animation_data.dirty=false
        this.animation_data.alt_animations.length=0
    }
    encode_net_visual(stream:Stream){
        stream.write_uint16(this.visual.body.def.idNumber!)
        .write_uint16(this.visual.hair?.def.idNumber??0)
        .write_uint16(this.visual.eyes?.idNumber??0)
        .write_uint16(this.visual.shirt.idNumber!)
        .write_uint16(this.visual.legs.idNumber!)
        .write_uint16(this.visual.foot?.idNumber??0)
        if(this.visual.hair){
            stream.write_uint32(this.visual.hair.tint)
        }
        stream.write_uint32(this.visual.body.tint)
        .write_array(this.visual.accessorys,(v)=>{
            stream.write_uint16(v.idNumber!)
        },1)
        return stream
    }
}