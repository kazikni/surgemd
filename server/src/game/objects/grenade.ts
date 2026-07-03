import { GameObjectType } from "common/scripts/others/constants.ts";
import { Projectile, ProjectileData, ProjectilePhysicalData } from "./projectile.ts";
import { CircleHitbox2D, Stream, Numeric, v2, v2m, Vec2, CheckpointContext } from "common/engine/core.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { type Human } from "./human.ts";
import { Floors, FloorType } from "common/scripts/others/terrain.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { type StaticBody } from "./static_body.ts";
import { type Obstacle } from "./obstacle.ts";

export type GrenadePhysicalData=ProjectilePhysicalData&{
    current_floor:FloorType
    zpos:number
    zpos_speed:number
}
export class Grenade extends Projectile{
    string_type:string="grenade"
    number_type: number=GameObjectType.Grenade

    override physical_data: GrenadePhysicalData
    fuse_delay:number=0
    projectile_data:ProjectileData={}
    def!:GrenadeDef

    old_pos?:Vec2
    constructor(){
        super()
        this.physical_data={
            current_floor:0,
            angular_velocity:0,
            rotation:0,
            velocity:v2.zero(),
            zpos:0,
            zpos_speed:0,
        }
    }

    override on_collided(obj:ServerGameObject,dt:number){
        switch(obj.number_type){
            case GameObjectType.Obstacle:
            case GameObjectType.Building:{
                if((obj as StaticBody).physical_data.stairs.length>0){
                    for(const s of (obj as StaticBody).physical_data.stairs){
                        if(s.hitbox.colliding_with(this.hitbox))this.manager.set_layer(this,obj.layer+s.dest_layer)
                    }
                }
                if((obj as StaticBody).physical_data.no_collision)break
                if(obj.number_type===GameObjectType.Obstacle){
                    if((obj as Obstacle).def.height===2||((obj as Obstacle).def.height===1&&this.physical_data.zpos>=0.5))break
                }
                const collisions=this.hitbox.overlap_collisions(obj.hitbox)
                for(const col of collisions){
                    const normal = col.dir
                    const vel = this.physical_data.velocity

                    const dot = v2.dot(vel, normal)
                    const reflected = v2.sub(vel, v2.scale(normal, 2 * dot))

                    this.physical_data.velocity=v2.scale(reflected, 0.4)
                    if(this.def.cook?.impact){
                        this.kill()
                        break
                    }
                }
                break
            }
            case GameObjectType.Human:{
                if((obj as Human).dead||(this.owner&&obj.id===this.owner.id))break
                const collisions=this.hitbox.overlap_collisions(obj.hitbox)
                for(const col of collisions){
                    const normal = col.dir
                    const vel = this.physical_data.velocity

                    const dot = v2.dot(vel, normal)
                    const reflected = v2.sub(vel, v2.scale(normal, 2 * dot))

                    this.physical_data.velocity=v2.scale(reflected, 0.4)
                    if(this.def.cook?.impact){
                        this.kill()
                        break
                    }
                }
                break
            }
        }
    }
    override on_tick(dt:number): void {
        super.on_tick(dt)

        if(this.physical_data.zpos>0){
            this.physical_data.zpos_speed=Numeric.clamp(this.physical_data.zpos_speed-this.def.gravity*dt,-3,3)
            this.physical_data.zpos=Numeric.clamp(this.physical_data.zpos+this.physical_data.zpos_speed*dt,0,1)
        }else{
            const fd=Floors[this.physical_data.current_floor]
            const vel = this.physical_data.velocity

            const drag=fd.acceleration*fd.drag

            v2m.scale(vel, vel, 1/(1+dt*(this.def.decays.ground_speed/drag)))
            this.physical_data.angular_velocity *= 1/(1+dt*(this.def.decays.ground_rotation/drag))

            if(this.def.cook?.ground){
                this.kill()
            }
        }
        if(this.def.cook&&this.def.cook.fuse_time){
            this.fuse_delay-=dt
            if(this.fuse_delay<=0){
                this.kill()
            }
        }

        if(!this.old_pos||!v2.is(this.position,this.old_pos)){
            this.old_pos=this.position
            this.physical_data.current_floor=this.game.map.terrain.get_floor_type(this.position,this.layer,this.game.map.default_floor)

            // Fall
            /*if(this.physical_data.current_floor===FloorType.Void){
                if(this.layer>Layers.Normal){
                    this.set_layer(this.layer-1)
                }
            }*/
        }
        this.set_dirty_part()
    }
    set_configuration(def:GrenadeDef,position:Vec2,owner?:Human){
        this.def=def
        this.base_hitbox=new CircleHitbox2D(v2(0,0),this.def.radius)
        this.position=position
        if(this.def.cook){
            this.fuse_delay=this.def.cook.fuse_time??0
        }
        this.owner=owner
        if(this.def.explosion)this.projectile_data.explosion=this.game.definitions.explosions.getFromString(this.def.explosion)

        if(this.def.call_airdrop){
            this.game.add_timeout(()=>{
                this.game.add_airdrop(this.position)
            },this.def.call_airdrop.delay)
        }
        if(this.def.call_airstrike){
            this.game.add_timeout(()=>{
                const pos=v2.clone(this.position)
                const def=this.game.definitions.grenades.getFromString(this.def.call_airstrike!.bomb.def)
                const count=this.def.call_airstrike?.count??1
                const gap=this.def.call_airstrike?.delay_gap??1
                for(let c=0;c<count;c++){
                    this.game.add_timeout(()=>{
                        this.game.add_airstrike(pos,def,this.def.call_airstrike?.bomb.count??1,this.def.call_airstrike?.bomb.radius??0,this.owner)
                    },c*gap)
                }
            },this.def.call_airstrike.delay)
        }
    }
    override on_create(args?: {def:GrenadeDef,position:Vec2,owner?:Human}): void {
        if(args)this.set_configuration(args.def,args.position,args.owner)
    }
    override on_encode_net(stream: Stream, full: boolean): void {
        this.physical_encode(stream)
        stream.write_float(this.physical_data.zpos,0,1,1)
        if(full){
            stream.write_id(this.def.idNumber!)
        }
    }
    override on_encode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        stream.write_uint16(this.def.idNumber!)
        .write_pos2(this.position)
        .write_pos2(this.physical_data.velocity)
        .write_float32(this.physical_data.rotation)
        .write_float32(this.physical_data.angular_velocity)
        .write_float32(this.physical_data.zpos)
        .write_float32(this.physical_data.zpos_speed)
        .write_float32(this.fuse_delay)
        .write_uint8(this.physical_data.current_floor)
        .write_boolean_group(this.owner !== undefined)
        if (this.owner) {
            stream.write_id(ctx.idco[this.owner.id])
        }
    }
    override on_decode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        const def = this.game.definitions.grenades.valueNumber[stream.read_uint16()]
        this.set_configuration(def, v2.zero())
        this.position = stream.read_pos2()
        this.physical_data.velocity=stream.read_pos2()
        this.physical_data.rotation = stream.read_float32()
        this.physical_data.angular_velocity = stream.read_float32()
        this.physical_data.zpos = stream.read_float32()
        this.physical_data.zpos_speed = stream.read_float32()
        this.fuse_delay = stream.read_float32()
        this.physical_data.current_floor = stream.read_uint8() as FloorType
        const bg=stream.read_boolean_group()
        if(bg[0]){
            const id = stream.read_id()
            this.owner = this.manager.objects[ctx.coid[id]] as Human
        }

        this.update_hitbox()
    }
}