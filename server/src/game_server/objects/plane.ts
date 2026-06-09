import { GameObjectType, Layers } from "common/scripts/others/constants.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { circle, CircleHitbox2D, NetStream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { type ServerGameObject } from "../others/gameObject.ts";

export interface PlanePhysicalData extends MovingBodyPhysicalData {}

export class Plane extends MovingBody {
    override string_type = "plane"
    override number_type = GameObjectType.Plane

    override physical_data: PlanePhysicalData = {
        velocity: v2.zero(),
        rotation: 0
    }

    type = 0
    speed = 10
    target_pos: Vec2 = v2.zero()
    called = false
    owner?: Human

    count:number=1
    radius:number=0
    grenade_def?: GrenadeDef
    obstacle?: ObstacleDef
    constructor(){
        super()
        this.allow_tick=true
    }

    override on_collided(_obj:ServerGameObject,_dt:number){

    }

    override on_create(args: Record<string, any>): void {
        this.base_hitbox=new CircleHitbox2D(v2.zero,100)
        this.position = args.position
        this.target_pos = args.target_pos
        this.speed = args.speed
        this.type = args.type
        this.owner = args.owner
        this.grenade_def = args.grenade_def
        this.obstacle = args.obstacle
        this.count=args.count
        this.radius=args.radius
    }
    override on_tick(dt: number): void {
        super.on_tick(dt)
        this.set_dirty_part()
        if(!this.called&&v2.distance(this.position, this.target_pos) <= 4) {
            switch (this.type) {
                case 0:
                    this.game.add_parachute(
                        this.target_pos,
                        this.obstacle!,
                    )
                    break
                case 1: {
                    for(let c=0;c<this.count;c++){
                        const g = this.game.add_grenade(
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
            if(this.position.x<=40||this.position.y<=40||this.position.x>=this.game.map.size.x||this.position.y>=this.game.map.size.y)this.destroy()
        }

    }
    override on_encode(stream: NetStream,full: boolean): void {
        this.physical_encode(stream)
        stream.writeUint8(this.type)
    }
}