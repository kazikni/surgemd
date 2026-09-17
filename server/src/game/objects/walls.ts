import { Stream, Orientation, Vec2, CheckpointContext, HitboxGroup2D, RectHitbox2D, Hitbox2D, NullHitbox2D, v2 } from "common/engine/core.ts";
import { StaticBody, StaticBodyPhysicalData } from "./static_body.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Obstacle } from "./obstacle.ts";
import { WallsDef, WallsTD } from "common/scripts/definitions/objects/walls.ts";
export class Walls extends StaticBody {
    override string_type = "walls"
    override number_type = GameObjectType.Walls

    def!:WallsDef
    physical_data:{
        dirty:boolean
        side:Orientation

        hitbox:Hitbox2D
    }&StaticBodyPhysicalData={
        dirty:false,
        side:0,

        reflect_bullets:false,
        no_collision:false,
        no_pathfinding_collision:false,
        no_bullets_collision:false,
        no_spawn_collision:true,
        passable_by_bullets:false,
        hitbox:new NullHitbox2D(v2.zero),
        stairs:[]
    }

    objects_ids:Record<number,Obstacle>={}

    constructor() {
        super()

        this.allow_net_update=true
        this.allow_checkpoint=true
    }

    override update_hitbox(): void {
        super.update_hitbox()
    }
    override on_net_update(): void {
        this.physical_data.dirty=false
    }

    set_walls(w:WallsDef,set_position=true) {
        this.physical_data.dirty=true
        this.def=w

        this.physical_data.hitbox=new HitboxGroup2D(...HitboxGroup2D.walls(w.positions,w.width??0.3))
        if(w.no_collisions)this.physical_data.no_collision=w.no_collisions
        if(w.no_bullet_collision)this.physical_data.no_bullets_collision=w.no_bullet_collision
        if(w.reflect_bullets)this.physical_data.reflect_bullets=w.reflect_bullets
        if(w.passable_by_bullets)this.physical_data.passable_by_bullets=w.passable_by_bullets

        if(set_position)this.set_position(w.position??v2.zero,(w.side??0) as Orientation)
    }
    set_position(position:Vec2,side:Orientation){
        this.physical_data.dirty=true
        this.physical_data.side=side
        this.position=position

        this.base_hitbox=this.physical_data.hitbox.transform(undefined,undefined,undefined,side)

        const rect=this.base_hitbox.to_rect()
        this.spawn_hitbox=new RectHitbox2D(rect.min,rect.max)
        this.spawn_hitbox.translate(position)

        this.set_dirty_part()
    }

    override on_encode_net(stream: Stream, full: boolean): void {
        stream.write_boolean_group(this.physical_data.dirty)
        if(this.physical_data.dirty||full){
            stream.write_boolean_group(this.physical_data.no_collision,this.physical_data.no_bullets_collision,this.physical_data.passable_by_bullets)
            stream.write_pos2(this.position)
            stream.write_uint8(this.physical_data.side)

            stream.write_array(this.def.positions,(v)=>stream.write_array(v,(v)=>stream.write_pos2(v),2),1)
            stream.write_any(this.def.assets,4,4)
            stream.write_float32(this.def.width??0.3)
            stream.write_float32(this.def.stroke_width??0)
            stream.write_uint32(this.def.tint??0)
        }
    }
    override on_encode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        stream.write_pos2(this.position)
        stream.write_uint8(this.physical_data.side)
        stream.write_td(this.def,WallsTD)
    }
    override on_decode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        const pos=stream.read_pos2()
        const side=stream.read_uint8()
        this.set_walls(stream.read_td(WallsTD),false)
        this.set_position(pos,side as Orientation)
    }
}
