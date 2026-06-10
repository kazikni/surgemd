import { Numeric, v2, v2m, Vec2, type Stream } from "common/engine/core.ts";
import { GameObject } from "../others/gameObject.ts";
export interface MovingBodyPhysicalData{
    rotation:number
}
export abstract class MovingBody extends GameObject{
    abstract physical_data:MovingBodyPhysicalData

    old_pos?:Vec2
    dest_pos:Vec2=v2.zero()
    dest_rot:number=0
    distance_walked=0

    enable_auto_rot:boolean=true
    constructor(){
        super()

        this.allow_tick=true
    }
    override on_tick(dt: number): void {
        this.distance_walked=0
        if(!this.old_pos){
            this.old_pos=v2.clone(this.position)
        }else if(!v2.is(this.old_pos,this._position)){
            this.distance_walked=v2.distance(this.old_pos, this.position)
            this.old_pos=v2.clone(this.position)
        }
        v2m.lerp(this.position,this.dest_pos,this.game.global_interpolation)
        if(this.enable_auto_rot)this.physical_data.rotation=Numeric.lerp_rad(this.physical_data.rotation,this.dest_rot!,this.game.global_interpolation)
    }
    decode_physical_data(stream:Stream,full:boolean):void{
        this.dest_pos=stream.read_pos2()
        this.dest_rot=stream.read_rad()
        if(full){
            this.position=this.dest_pos
            this.physical_data.rotation=this.dest_rot
        }
    }
}