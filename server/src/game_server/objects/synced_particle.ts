import { CircleHitbox2D, NetStream, Numeric, random, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { MovingBody } from "./moving_body.ts";
import { SyncedParticleDef } from "common/scripts/definitions/objects/synced_particle.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
export class SyncedParticle extends MovingBody {
    string_type="synced"
    number_type=GameObjectType.SyncedParticle

    def!:SyncedParticleDef

    physical_data={
        rotation:0,
        velocity:v2.zero()
    }

    angular_speed=0
    time=0
    spiral_origin=v2.zero()

    override on_collided(_obj:ServerGameObject){}
    create(args:{position:Vec2,def:SyncedParticleDef}){
        this.position=v2.clone(args.position)
        this.spiral_origin=v2.clone(args.position)
        this.base_hitbox=new CircleHitbox2D(v2(0,0),3)

        this.def=args.def
        this.physical_data.rotation=random.rad()

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
        super.update(dt)
        this.time+=dt
        if(this.time>=this.def.lifetime){
            this.time=this.def.lifetime
            this.destroy()
            return
        }

        
        if(this.def.movement){
            switch(this.def.movement.type){
                case "walk":
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