import { GameObjectType, Layers } from "common/scripts/others/constants.ts";
import { CircleHitbox2D, Numeric, random, Stream, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { AirBody } from "./airbody.ts";
import { MapZone } from "common/scripts/packets/general_update.ts";
import { MapHumanData } from "common/scripts/packets/update_packet.ts";
import { type ServerGameObject } from "../others/gameObject.ts";
export class Drone extends AirBody {
    override string_type = "drone"
    override number_type = GameObjectType.Drone

    owner?:Human

    z:number=1
    z_dest:number=0
    z_timer:number=0

    angular_timer:number=0
    angular_velocity:number=0
    angular_velocity_dest:number=0

    mode:number=1 // 0 = Static, 1 = Moving to Target, Leaving = 2
    lifetime?:number

    dest:Vec2=v2.zero()
    direction:number=0

    constructor(){
        super()
    }

    override set_configuration(speed:number,position?:Vec2,owner?:Human){
        super.set_configuration(speed,position)
        this.owner = owner
    }

    override on_create(args: {position?:Vec2,speed?:number,owner?:Human}): void {
        super.on_create(args)
        if(args)this.set_configuration(args.speed??1,args.position,args.owner)
    }
    override on_tick(dt: number): void {
        super.on_tick(dt)
        const expo=Numeric.dt_expo_inter(1,dt)

        if(this.mode===0){
        }else if(this.mode===1){
            this.direction=v2.lookTo(this.position,this.dest)
            this.physical_data.velocity=v2.from_RadAngle(this.direction,this.speed)
            if(v2.distance(this.position,this.dest)<=0.1*this.speed){
                this.dest=this.choose_next_dest()
                this.speed=random.float(1,5)
            }
        }else if(this.mode===2){
            this.physical_data.velocity=v2.from_RadAngle(this.direction,this.speed)
            this.mode===2
            this.check_destroy()
        }

        this.angular_timer-=dt
        this.angular_velocity=Numeric.lerp_rad(this.angular_velocity,this.angular_velocity_dest,expo*2)
        if(this.angular_timer<=0){
            this.angular_timer+=random.float(2,6)
            this.angular_velocity_dest=Math.random()
            if(Math.random()<0.5)this.angular_velocity_dest*=-1
        }
        this.physical_data.rotation+=this.angular_velocity*dt

        if(this.lifetime===undefined||this.lifetime>0){
            this.z_timer-=dt
            if(this.z_timer<=0){
                this.z_timer=random.float(2,3)
                this.z_dest=random.float(0.1,1)
            }
            let speed=0.2
            if(this.z>1)speed=2
            this.z=Numeric.lerp(this.z,this.z_dest,expo*speed)
        }

        if(this.lifetime!==undefined){
            this.lifetime-=dt
            if(this.lifetime<=0){
                if(this.mode!==2){
                    this.mode=2
                    this.direction=random.rad()
                    this.speed=50
                }
            }
        }
        this.set_dirty_part()
    }
    choose_next_dest():Vec2{
        return this.game.deadzone.next_position()
    }
    override on_encode_net(stream: Stream,full: boolean): void {
        stream.write_float32(this.z)
        super.on_encode_net(stream,full)
    }
    override on_encode_checkpoint(stream: Stream): void {
        stream.write_pos2(this.position)
        .write_rad(this.physical_data.rotation)
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
        this.speed = stream.read_float32()
        this.z=stream.read_float32()

        const [hasOwner]=stream.read_boolean_group()

        if (hasOwner) {
            this.owner = this.game.humans.humans[stream.read_id()]
        }
    }
}
export class LocationDrone extends Drone{
    zone?:MapZone
    view_hitbox:CircleHitbox2D=new CircleHitbox2D(v2.zero(),1)

    scanner_timer:number=0
    scanner_delay:number=1.5

    view_timer:number=0
    view_delay:number=1

    visible_humans:Human[]=[]
    map_humans:MapHumanData[]=[]

    override on_create(args: any): void {
        super.on_create(args)
        this.zone={
            color:0xe6ba0d,
            icon:5,
            position:this.position,
            id:this.id,
            radius:5
        }
        this.game.scene_2d.map_zones.push(this.zone)
        this.lifetime=120
        
        this.dest=this.choose_next_dest()
        this.speed=100
    }
    override on_destroy(): void {
        super.on_destroy()
        if(this.zone){
            const idx=this.game.scene_2d.map_zones.indexOf(this.zone)
            if(idx!==-1)this.game.scene_2d.map_zones.splice(idx,1)
        }
    }
    override on_net_update(): void {
        super.on_net_update()
    }
    override on_tick(dt: number): void {
        super.on_tick(dt)

        this.view_hitbox.position=this.position
        this.view_hitbox.radius=30+(30*this.z)
        if(this.zone){
            this.zone.position=this.position
            this.zone.radius=this.view_hitbox.radius
        }

        this.scanner_timer-=dt
        this.view_timer+=dt
        if(this.scanner_timer<=0){
            this.scanner_timer+=this.scanner_delay
            this.view_timer=0
            const objects:ServerGameObject[]=this.manager.cells.get_objects_layers(this.view_hitbox,[Layers.Normal,Layers.Normal+1])
            this.visible_humans.length=0
            this.map_humans.length=0
            for(const o of objects){
                if(o.number_type===GameObjectType.Human&&this.view_hitbox.point_inside(o.position)){
                    this.visible_humans.push(o as Human)
                    this.map_humans.push({
                        dead:(o as Human).dead,
                        default_map_color:(o as Human).default_map_color,
                        downed:(o as Human).downed,
                        id:(o as Human).id,
                        position:v2.clone(o.position)
                    })
                }
            }
        }

        if(this.view_timer<=this.view_delay){
            for(const h of this.visible_humans){
                h.visible_humans=[...this.map_humans]
            }
        }
    }
}