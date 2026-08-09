import { GameObjectType } from "common/scripts/others/constants.ts";
import { CircleHitbox2D, Numeric, random, Stream, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { AirBody } from "./airbody.ts";
export class Drone extends AirBody {
    override string_type = "drone"
    override number_type = GameObjectType.Drone

    type=0
    owner?:Human

    z:number=1
    z_dest:number=0
    z_timer:number=0

    angular_timer:number=0
    angular_velocity:number=0
    angular_velocity_dest:number=0

    motion_timer:number = 0
    motion_speed:number = 1
    motion_radius:number = 10
    motion_origin:Vec2 = v2.zero()

    mode:number=0 // 0 = Static, 1 = Moving to Target

    constructor(){
        super()
    }

    override set_configuration(position:Vec2,speed:number,type:number,owner?:Human){
        super.set_configuration(position,speed)
        this.type = type
        this.owner = owner

        this.motion_origin = v2.clone(position)
        this.motion_timer = 0
    }

    override on_create(args?: {position:Vec2,target_pos:Vec2,speed:number,type:number,owner?:Human}): void {
        if(args)this.set_configuration(args.position,args.speed,args.type,args.owner)
    }
    override on_tick(dt: number): void {
        super.on_tick(dt)
        const expo=Numeric.dt_expo_inter(1,dt)

        if(this.mode===0){
            /*this.motion_timer += dt * this.motion_speed

            const period = 4
            let t = (this.motion_timer % period) / period
            let x = 0
            let y = 0

            if(t < 0.25) {
                const p = t / 0.25
                x = -this.motion_radius
                y = Numeric.lerp(0,-this.motion_radius,p)
            }else if (t < 0.5) {
                const p = (t - 0.25) / 0.25
                x = Numeric.lerp(-this.motion_radius,this.motion_radius,p)

                y = -this.motion_radius
            }else if (t < 0.75) {
                const p = (t - 0.5) / 0.25
                x = this.motion_radius
                y = Numeric.lerp(-this.motion_radius,this.motion_radius,p)
            }else {
                const p = (t - 0.75) / 0.25
                x=Numeric.lerp(this.motion_radius,-this.motion_radius,p)
                y = this.motion_radius
            }

            this.position.x = this.motion_origin.x + x
            this.position.y = this.motion_origin.y + y*/
        }

        this.angular_timer-=dt
        this.angular_velocity=Numeric.lerp_rad(this.angular_velocity,this.angular_velocity_dest,expo*2)
        if(this.angular_timer<=0){
            this.angular_timer+=random.float(2,6)
            this.angular_velocity_dest=Math.random()
            if(Math.random()<0.5)this.angular_velocity_dest*=-1
        }
        this.physical_data.rotation+=this.angular_velocity*dt

        this.z_timer-=dt
        if(this.z_timer<=0){
            this.z_timer=random.float(2,10)
            this.z_dest=random.float(0.1,1)
        }
        this.z=Numeric.lerp_rad(this.z,this.z_dest,expo*0.2)
        this.set_dirty_part()
    }
    override on_encode_net(stream: Stream,full: boolean): void {
        stream.write_float32(this.z)
        this.physical_encode(stream)
    }
    override on_encode_checkpoint(stream: Stream): void {
        stream.write_pos2(this.position)
        .write_rad(this.physical_data.rotation)
        .write_uint8(this.type)
        .write_float32(this.speed)
        .write_float32(this.z)
        if(this.owner){
            stream.write_id(this.owner.id)
        }
    }
    override on_decode_checkpoint(stream: Stream): void {
        this.base_hitbox = new CircleHitbox2D(v2.zero(),100)

        this.position=stream.read_pos2()
        this.physical_data.rotation=stream.read_rad()
        this.type = stream.read_uint8()
        this.speed = stream.read_float32()
        this.z=stream.read_float32()

        const [hasOwner]=stream.read_boolean_group()

        if (hasOwner) {
            this.owner = this.game.humans.humans[stream.read_id()]
        }
    }
}