import { GameObjectType, Layers } from "common/scripts/others/constants.ts";
import { circle, CircleHitbox2D, Stream, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { AirBody } from "./airbody.ts";
export class Plane extends AirBody {
    override string_type = "plane"
    override number_type = GameObjectType.Plane

    type = 0
    target_pos: Vec2 = v2.zero()
    called = false
    owner?: Human

    count:number=1
    radius:number=0
    grenade_def?: GrenadeDef
    obstacle?: ObstacleDef

    constructor(){
        super()
    }

    override set_configuration(speed:number,position:Vec2|undefined,target_pos:Vec2,type:number,count:number,radius:number,owner?:Human,grenade?:GrenadeDef,obstacle?:ObstacleDef){
        super.set_configuration(speed,position)
        this.target_pos = target_pos
        this.type = type
        this.owner = owner
        this.grenade_def = grenade
        this.obstacle = obstacle
        this.count=count
        this.radius=radius
    }

    override on_create(args: {position?:Vec2,target_pos:Vec2,speed:number,type:number,count:number,radius:number,owner?:Human,grenade?:GrenadeDef,obstacle?:ObstacleDef}): void {
        super.on_create(args)
        if(args)this.set_configuration(args.speed,args.position,args.target_pos,args.type,args.count,args.radius,args.owner,args.grenade,args.obstacle)
        
    }
    override on_destroy(): void {
        super.on_destroy()
    }
    override on_tick(dt: number): void {
        super.on_tick(dt)
        this.set_dirty_part()
        if(!this.called&&v2.distance(this.position, this.target_pos) <= 4) {
            switch (this.type) {
                case 0:
                    this.scene.add_parachute(this.target_pos,this.obstacle!,)
                    break
                case 1: {
                    for(let c=0;c<this.count;c++){
                        const g = this.scene.add_grenade(
                            this.radius===0?this.target_pos:circle.random_point_inside(this.target_pos,this.radius),
                            this.grenade_def!,
                            this.owner,
                            Layers.Normal
                        )
                        g.physical_data.zpos=1
                        g.physical_data.zpos_speed=0
                        g.physical_data.angular_velocity=Math.random()>=0.5?-1.5:1.5
                    }
                    break
                }
            }
            this.called = true
        }else if(!this.called){
            this.physical_data.rotation=v2.lookTo(this.position, this.target_pos)
            this.physical_data.velocity=v2.from_RadAngle(this.physical_data.rotation,this.speed)
        }else{
            this.check_destroy()
        }
    }
    override on_encode_net(stream: Stream,full: boolean): void {
        if(full)stream.write_uint8(this.type)
        super.on_encode_net(stream,full)
    }
    override on_encode_checkpoint(stream: Stream): void {
        stream.write_pos2(this.position)
        .write_rad(this.physical_data.rotation)
        .write_pos2(this.target_pos)
        .write_uint8(this.type)
        .write_float32(this.speed)
        .write_uint16(this.count)
        .write_float32(this.radius)
        .write_boolean_group(this.called,this.owner !== undefined,this.grenade_def !== undefined,this.obstacle !== undefined)
        if(this.owner){
            stream.write_id(this.owner.id)
        }
        if(this.grenade_def){
            stream.write_uint16(this.grenade_def.idNumber!)
        }
        if(this.obstacle){
            stream.write_uint16(this.obstacle.idNumber!)
        }
    }
    override on_decode_checkpoint(stream: Stream): void {
        this.base_hitbox = new CircleHitbox2D(v2.zero(),100)

        this.position=stream.read_pos2()
        this.physical_data.rotation=stream.read_rad()
        this.target_pos = stream.read_pos2()
        this.type = stream.read_uint8()
        this.speed = stream.read_float32()
        this.count = stream.read_uint16()
        this.radius = stream.read_float32()

        const [
            called,
            hasOwner,
            hasGrenade,
            hasObstacle
        ] = stream.read_boolean_group()

        this.called = called

        if (hasOwner) {
            this.owner = this.game.humans.humans[
                stream.read_id()
            ]
        }
        if (hasGrenade) {
            this.grenade_def = this.game.definitions.grenades.valueNumber[stream.read_uint16()]
        }
        if (hasObstacle) {
            this.obstacle = this.game.definitions.obstacles.valueNumber[stream.read_uint16()]
        }
    }
}