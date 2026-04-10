import { CircleHitbox2D, NetStream, Numeric, random, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { SyncedParticleDef } from "common/scripts/definitions/objects/synced_particle.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
export class SyncedParticle extends MovingBody {
    string_type = "synced"
    number_type = GameObjectType.SyncedParticle

    def!: SyncedParticleDef

    physical_data:MovingBodyPhysicalData = {
        rotation: 0,
        velocity: v2.zero()
    }
    angular_speed=1
    time:number=0
    override on_collided(obj:ServerGameObject){
    }
    override update(dt: number) {
        super.update(dt)
        this.time+=dt
        if(this.time>=this.def.lifetime){
            this.time=this.def.lifetime
            this.destroy()
        }
        this.physical_data.rotation=Numeric.loop_rad(this.physical_data.rotation+this.angular_speed*dt)
        this.net_sync.part=true
    }

    create(args: {position: Vec2, def: SyncedParticleDef}) {
        this.position = args.position
        this.physical_data.rotation=random.rad()
        this.base_hitbox = new CircleHitbox2D(v2(0, 0),3)
        this.def = args.def
        const vel=random.float(0.2,0.5)
        this.angular_speed=vel
        if(Math.random()<=0.5)this.angular_speed*=-1
        this.push(random.float(0.03,0.05),random.rad())
        this.net_sync.enabled.deletion=false
    }
    override interact(user: Human): void {}
    override net_update() {}
    override encode(stream: NetStream, full: boolean) {
        this.physical_encode(stream)
        if (full) {
            stream.writeFloat(this.time,0,120,2)
            stream.writeUint8(this.def.idNumber!)
        }
    }
}