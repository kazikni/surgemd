import { Numeric, v2, v2m, Vec2, type NetStream } from "common/engine/core.ts";
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
    constructor(){
        super()
    }
    override update(dt: number): void {
        if(!this.old_pos){
            this.old_pos=v2.clone(this.position)
            this.manager.cells.updateObject(this)
        }else if(!v2.is(this.old_pos,this._position)){
            const dist = v2.distance(this.old_pos, this.position)
            this.old_pos=v2.clone(this.position)
            this.manager.cells.updateObject(this)
            this.distance_walked=dist
        }
        v2m.lerp(this.position,this.dest_pos,this.game.global_interpolation)
        this.physical_data.rotation=Numeric.lerp_rad(this.physical_data.rotation,this.dest_rot!,this.game.global_interpolation)
    }
    decode_physical_data(stream:NetStream,full:boolean):void{
        this.dest_pos=stream.readPos2()
        this.dest_rot=stream.readRad()
        if(full){
            this.position=this.dest_pos
            this.physical_data.rotation=this.dest_rot
        }
    }
}