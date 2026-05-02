import { GameObjectType } from "common/scripts/others/constants.ts";
import { Projectile, ProjectileData, ProjectilePhysicalData } from "./projectile.ts";
import { CircleHitbox2D, NetStream, Numeric, v2, v2m, Vec2 } from "common/engine/core.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { type Human } from "./human.ts";
import { FloorType } from "common/scripts/others/terrain.ts";
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
            // deno-lint-ignore no-fallthrough
            case GameObjectType.Obstacle:
                if((obj as Obstacle).physical_data.stairs.length>0){
                    for(const s of (obj as Obstacle).physical_data.stairs){
                        if(s.hitbox.colliding_with(this.hitbox))this.set_layer(this.layer+s.dest_layer)
                    }
                }
            case GameObjectType.Building:{
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
                if((obj as Human).health_data.dead||(this.owner&&obj.id===this.owner.id))break
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
    override update(dt:number): void {
        super.update(dt)

        if(this.physical_data.zpos>0){
            this.physical_data.zpos_speed=Numeric.clamp(this.physical_data.zpos_speed-this.def.gravity*dt,-3,3)
            this.physical_data.zpos=Numeric.clamp(this.physical_data.zpos+this.physical_data.zpos_speed*dt,0,1)
        }else{
            const vel = this.physical_data.velocity

            const speedDecay = Math.exp(-this.def.decays.ground_speed * dt)
            const rotDecay   = Math.exp(-this.def.decays.ground_rotation * dt)

            v2m.scale(vel, vel, speedDecay)

            this.physical_data.angular_velocity *= rotDecay

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
            // Fall
            /*if(this.physical_data.current_floor===FloorType.Void){
                if(this.layer>Layers.Normal){
                    this.set_layer(this.layer-1)
                }
            }*/
        }
        this.net_sync.part=true
    }
    create(args: {def:GrenadeDef,position:Vec2,owner?:Human}): void {
        this.def=args.def
        this.base_hitbox=new CircleHitbox2D(v2(0,0),this.def.radius)
        this.position=args.position
        if(this.def.cook){
            this.fuse_delay=this.def.cook.fuse_time??0
        }
        this.owner=args.owner

        if(this.def.explosion)this.projectile_data.explosion=this.game.definitions.explosions.getFromString(this.def.explosion)

        if(this.def.call_airdrop){
            this.game.add_timeout(()=>{
                this.game.add_airdrop(this.position)
            },this.def.call_airdrop.delay)
        }
        if(this.def.call_airstrike){
            this.game.add_timeout(()=>{
                const def=this.game.definitions.grenades.getFromString(this.def.call_airstrike!.def)
                this.game.add_airstrike(this.position,def,this.owner)
            },this.def.call_airstrike.delay)
        }
    }
    override encode(stream: NetStream, full: boolean): void {
        this.physical_encode(stream)
        stream.writeFloat(this.physical_data.zpos,0,1,1)
        if(full){
            stream.writeID(this.def.idNumber!)
        }
    }
}