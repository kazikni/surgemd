import { Stream, Orientation, Vec2, CheckpointContext, v2, NullCollider2D, ColliderGroup2D, RectCollider2D } from "common/engine/core.ts";
import { StaticBody} from "./static_body.ts";
import { object_instance_type } from "common/scripts/others/constants.ts";
import { type Obstacle } from "./obstacle.ts";
import { WallsDef, WallsTD } from "common/scripts/definitions/objects/walls.ts";
export class Walls extends StaticBody {
    override instance_type: number=object_instance_type.wall

    def!:WallsDef
    override physical:{
        dirty:boolean
        side:Orientation

    }&StaticBody["physical"]={
        dirty:false,
        side:0,

        no_projectiles_collision:false,
        no_spawn_collision:true,
        collider:new NullCollider2D(v2.zero),
    }

    objects_ids:Record<number,Obstacle>={}

    constructor() {
        super()

        this.allow_net_update=true
        this.allow_checkpoint=true
    }

    on_net_update(): void {
        this.physical.dirty=false
    }

    set_walls(w:WallsDef,set_position=true) {
        this.physical.dirty=true
        this.def=w

        this.physical.collider=new ColliderGroup2D(...ColliderGroup2D.walls(w.positions,w.width??0.3))
        if(w.no_collisions)this.physical.no_collision=w.no_collisions
        if(w.no_projectiles_collision)this.physical.no_projectiles_collision=w.no_projectiles_collision
        if(w.reflect_bullets)this.physical.reflect_projectiles=w.reflect_bullets
        if(w.passable_by_bullets)this.physical.passable_by_projectiles=w.passable_by_bullets

        if(set_position)this.set_position(v2.zero,0)
    }
    set_position(position:Vec2,side:Orientation){
        this.physical.dirty=true
        this.physical.side=side
        this.position=position

        this.base_collider=this.physical.collider.transform(undefined,undefined,undefined,side)

        /*
        const rect=this.base_collider.to_rect()
        this.spawn_collider=new RectCollider2D(rect.min,rect.max)
        this.spawn_collider.translate(position)*/

        this.set_dirty_part()
    }

    on_encode_net(stream: Stream, full: boolean): void {
        stream.write_boolean_group(this.physical.dirty)
        if(this.physical.dirty||full){
            stream.write_boolean_group(this.physical.no_collision,this.physical.no_projectiles_collision,this.physical.passable_by_projectiles)
            stream.write_pos2(this.position)
            stream.write_uint8(this.physical.side)

            stream.write_array(this.def.positions,(v)=>stream.write_array(v,(v)=>stream.write_pos2(v),2),1)
            stream.write_any(this.def.assets,4,4)
            stream.write_float32(this.def.width??0.3)
            stream.write_float32(this.def.stroke_width??0)
            stream.write_uint32(this.def.tint??0)
        }
    }
    on_encode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        stream.write_pos2(this.position)
        stream.write_uint8(this.physical.side)
        stream.write_td(this.def,WallsTD)
    }
    on_decode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        const pos=stream.read_pos2()
        const side=stream.read_uint8()
        this.set_walls(stream.read_td(WallsTD),false)
        this.set_position(pos,side as Orientation)
    }
}