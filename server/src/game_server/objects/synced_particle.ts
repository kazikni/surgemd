import { CircleHitbox2D, NetStream, Numeric, random, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { MovingBody } from "./moving_body.ts";
import { SyncedParticleDef } from "common/scripts/definitions/objects/synced_particle.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
import { type StaticBody } from "./static_body.ts";
export class SyncedParticle extends MovingBody {
    string_type="synced"
    number_type=GameObjectType.SyncedParticle

    owner?:Human
    def!:SyncedParticleDef

    physical_data={
        rotation:0,
        velocity:v2.zero()
    }

    action_tick:number=0
    action_time!:number

    angular_speed=0
    time=0
    spiral_origin=v2.zero()

    override on_collided(obj:ServerGameObject,dt:number){
        if(this.def.movement?.type==="direction"){
            switch(obj.number_type){
                case GameObjectType.Obstacle:
                case GameObjectType.Building:{
                    const ov=this.hitbox.overlapCollision((obj as StaticBody).hitbox)
                    if(ov.length>0&&this.def.side_effect&&this.action_tick>=this.action_time){
                        for(const s of this.def.side_effect){
                            (obj as StaticBody).side_effect(s,this.owner)
                        }
                    }
                    if((obj as StaticBody).physical_data.no_collision)break
                    for(const c of ov){
                        v2m.sub(this.position,this.position,v2.scale(c.dir,c.pen))
                    }
                    break
                }
                case GameObjectType.Human:{
                    const ov=this.hitbox.overlapCollision((obj as StaticBody).hitbox)
                    for(const c of ov){
                        v2m.sub(this.physical_data.velocity,this.physical_data.velocity,v2.scale((c.dir.x===1&&c.dir.y===0)?v2.random(-1,1):c.dir,4*dt))
                    }

                    if(ov.length>0&&this.def.side_effect&&this.action_tick>=this.action_time){
                        if(this.def.no_hit_owner&&obj.id===this.owner?.id)return
                        for(const s of this.def.side_effect){
                            (obj as Human).side_effect(s,this.owner)
                        }
                    }
                    break
                }
            }
        }
    }
    create(args:{position:Vec2,def:SyncedParticleDef,owner?:Human}){
        this.owner=args.owner
        this.position=v2.clone(args.position)
        this.spiral_origin=v2.clone(args.position)

        this.def=args.def
        this.base_hitbox=this.def.hitbox??(new CircleHitbox2D(v2(0,0),1.5))
        this.physical_data.rotation=random.rad()
        this.action_time=this.def.action_time??0.1

        if(this.def.movement){
            if(this.def.movement.angular){
                this.angular_speed=random.float(this.def.movement.angular.min,this.def.movement.angular.max)
                if(Math.random()<=0.5)this.angular_speed*=-1
            }
            switch(this.def.movement.type){
                case "walk":
                    if(this.def.movement.velocity){
                        this.push(random.float(this.def.movement.velocity.min,this.def.movement.velocity.max),random.rad())
                    }
                    break
            }
        }
        this.net_sync.enabled.deletion=false
    }

    override update(dt:number){
        this.action_tick+=dt
        super.update(dt)
        if(this.action_tick>=this.action_time){
            this.action_tick=0
        }
        this.time+=dt
        if(this.time>=this.def.lifetime){
            this.time=this.def.lifetime
            this.destroy()
            return
        }

        
        if(this.def.movement){
            switch(this.def.movement.type){
                case "walk":
                case "direction":
                    if(this.def.movement.velocity.decay)v2m.scale(this.physical_data.velocity,this.physical_data.velocity,1/(1+dt*this.def.movement.velocity.decay))
                    break
            }
        }

        this.physical_data.rotation=Numeric.loop_rad(this.physical_data.rotation+this.angular_speed*dt)
        this.net_sync.part=true
    }

    override interact(_user:Human){}

    override net_update(){}

    override encode(stream:NetStream,full:boolean){
        this.physical_encode(stream)
        if(full){
            stream.writeFloat(this.time,0,120,2)
            stream.writeUint8(this.def.idNumber!)
        }
    }
}