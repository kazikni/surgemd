import { GameConstants, GameObjectType } from "common/scripts/others/constants.ts"
import { ServerGameObject } from "../others/gameObject.ts"
import { CircleHitbox2D, Stream, v2, v2m, Vec2 } from "common/engine/core.ts"
import { DecalTint } from "common/scripts/definitions/objects/decals.ts"
import { BadgeDef } from "common/scripts/definitions/loadout/badges.ts"
import { CheckpointContext } from "common/engine/core/game/gameObject.ts";

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

    
    override on_create(args?: {position:Vec2,name:string,angle:number,badge?:BadgeDef,tint?:DecalTint,scale?:number}): void {
        this.base_hitbox=new CircleHitbox2D(v2.zero(),1)
        if(args){
            this.name=args.name
            this.badge=args.badge
            this.position=args.position
            this.velocity=v2.from_RadAngle(args.angle+Math.PI,7)
        }
    }
    override on_encode_net(stream: Stream, full: boolean): void {
        stream.write_pos2(this.position)
        if(full){
            stream.write_string_sized(this.name,30)
            .write_uint8(this.badge===undefined?0:this.badge.idNumber!+1)
        }
    }

    override on_encode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        stream.write_string_sized(this.name,GameConstants.player.max_name_size)
        .write_uint16(this.badge?.idNumber??0)
        .write_pos2(this.position)
        .write_pos2(this.velocity)
    }
    override on_decode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        this.name=stream.read_string_sized(GameConstants.player.max_name_size)
        this.badge=this.game.definitions.badges.getFromNumberSafe(stream.read_uint16())
        this.position=stream.read_pos2()
        this.velocity=stream.read_pos2()
    }
}