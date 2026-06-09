import { GameObjectType } from "common/scripts/others/constants.ts"
import { ServerGameObject } from "../others/gameObject.ts"
import { CircleHitbox2D, NetStream, v2, v2m, Vec2 } from "common/engine/core.ts"
import { DecalTint } from "common/scripts/definitions/objects/decals.ts"
import { BadgeDef } from "common/scripts/definitions/loadout/badges.ts"

export class HumanBody extends ServerGameObject{
    string_type:string="human_body"
    number_type: number=GameObjectType.HumanBody

    name:string=""
    badge?:BadgeDef

    old_position?:Vec2
    velocity:Vec2=v2.zero()

    constructor(){
        super()
        this.allow_tick=true
    }

    override on_tick(dt:number): void {
        if(this.velocity.x!=0||this.velocity.y!=0){
            v2m.scale(this.velocity,this.velocity,1/(1+dt*3))
            v2m.add(this.position,this.position,v2.scale(this.velocity,dt))
        }
        if(!this.old_position||this.old_position.x!==this.position.x||this.old_position.y!==this.position.y){
            this.old_position=v2.clone(this.position)
            this.set_dirty_part()
        }
    }
    override on_create(args: {position:Vec2,name:string,angle:number,badge?:BadgeDef,tint?:DecalTint,scale?:number}): void {
        this.name=args.name
        this.badge=args.badge
        this.base_hitbox=new CircleHitbox2D(v2.zero(),1)
        this.position=args.position
        this.velocity=v2.from_RadAngle(args.angle+Math.PI,7)
    }
    override on_encode(stream: NetStream, full: boolean): void {
        stream.writePos2(this.position)
        if(full){
            stream.writeStringSized(30,this.name)
            .writeUint8(this.badge===undefined?0:this.badge.idNumber!+1)
        }
    }
}