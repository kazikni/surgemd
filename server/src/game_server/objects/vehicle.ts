import {VehicleDef} from "common/scripts/definitions/objects/vehicles.ts"
import { CircleHitbox2D, Hitbox2D, NetStream, Numeric, PolarMovement, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
export class VehicleSeat{
    human?:Human
    position:Vec2
    base_position:Vec2
    rotation?:number
    pillot:boolean
    vehicle:Vehicle
    leave:Vec2

    doors:Vec2[]=[]
    base_doors:Vec2[]=[]
    constructor(vehicle:Vehicle,position:Vec2,pillot:boolean,leave:Vec2,base_doors:Vec2[]){
        this.vehicle=vehicle
        this.position=position
        this.base_position=v2.clone(position)
        this.pillot=pillot
        this.leave=leave
        this.base_doors=base_doors
        for(const d of base_doors){
            this.doors.push(v2.clone(d))
        }
    }
    clear_human(){
        if(!this.human||!this.vehicle.can_leave)return
        this.human.net_sync.part=true
        this.human.seat=undefined
        this.human=undefined
    }
    set_human(p:Human){
        if(this.human)return
        if(p.seat)p.seat.clear_human()
        this.human=p
        p.seat=this
        if(this.vehicle.def.battle_plane)this.human.parachute={value:1}
    }
}
export class Vehicle extends MovingBody {
    string_type = "vehicle"
    number_type = GameObjectType.Vehicle

    def!: VehicleDef

    speed = 0
    direction = 0
    back_walk = false
    is_moving = false
    dead = false

    seats: VehicleSeat[] = []
    can_leave = true

    interaction_hitbox!:Hitbox2D
    physical_data:{
        dirty:boolean
    }&MovingBodyPhysicalData = {
        dirty:true,
        velocity: v2.zero(),
        rotation: 0,
    }

    move(input: PolarMovement, backWalk: boolean, dt: number, alt: boolean) {
        if (input.scale === 0) return

        const cfg = this.def.movimentation
        const dirVec = v2.from_PolarMovement(input)

        if (alt) {
            // Tank controls
            if (dirVec.y !== 0) {
                // Acelerate
                this.back_walk = dirVec.y > 0
                const mult = this.back_walk ? -cfg.back_walk_mult : 1
                this.speed = Numeric.lerp(
                    this.speed,
                    cfg.final_speed * mult,
                    Numeric.dt_expo_inter(cfg.acceleration, dt)
                )
            }

            if (dirVec.x !== 0) {
                // Wheels Side
                this.physical_data.rotation = Numeric.normalize_rad(
                    this.physical_data.rotation +
                    (dirVec.x*cfg.angle_acceleration*(this.speed/this.def.movimentation.final_speed)*dt)
                )
            }

            this.is_moving = dirVec.y !== 0
        }
        else {
            // Car controls
            const target = Math.atan2(dirVec.y, dirVec.x)

            this.physical_data.rotation = Numeric.lerp_rad(
                this.physical_data.rotation,
                target,
                Numeric.dt_expo_inter(cfg.angle_acceleration, dt)
            )

            this.back_walk = backWalk
            this.speed = Numeric.lerp(
                this.speed,
                cfg.final_speed * (backWalk ? -cfg.back_walk_mult : 1),
                Numeric.dt_expo_inter(cfg.acceleration, dt)
            )

            this.is_moving = true
        }
    }

    override update(dt: number) {
        if (!this.is_moving || (this.back_walk && this.speed > 0)) {
            this.speed = Numeric.lerp(
                this.speed,
                0,
                Numeric.dt_expo_inter(this.def.movimentation.desacceleration, dt)
            )
        }

        this.physical_data.velocity = v2.scale(
            v2.from_RadAngle(this.physical_data.rotation),
            this.speed
        )

        super.update(dt)

        for (const s of this.seats) {
            const off = v2.rotate_RadAngle(s.base_position, this.physical_data.rotation)
            s.position = v2.add(this.position, off)
            s.rotation = this.physical_data.rotation
            for(const i in s.doors){
                s.doors[i]=v2.rotate_RadAngle(s.base_doors[i],this.physical_data.rotation)
                v2m.add(s.doors[i],this.position,s.doors[i])
            }
            if (s.human)s.human.position = s.position
        }

        if(this.speed>0||this.is_new){
            this.physical_data.dirty = true
            this.net_sync.part = true
            const center=v2.rotate_RadAngle(this.def.center,this.physical_data.rotation)
            v2m.add(center,this.position,center)
            this.interaction_hitbox=new CircleHitbox2D(center,4)
        }
        this.is_moving=false
    }

    create(args: {position: Vec2, def: VehicleDef}) {
        this.position = v2.clone(args.position)
        this.base_hitbox = new CircleHitbox2D(v2.new(0, 0),1)
        this.def = args.def

        if (this.def.pillot_seat)
            this.seats.push(new VehicleSeat(
                this,
                this.def.pillot_seat.position,
                true,
                this.def.pillot_seat.leave,
                this.def.pillot_seat.doors
            ))

        for (const s of this.def.seats ?? []) {
            this.seats.push(new VehicleSeat(this, s.position, false, s.leave,s.doors))
        }

        this.interaction_hitbox=this.hitbox.clone()
    }

    override can_interact(user: Human): boolean {
        return this.interaction_hitbox.collidingWith(user.hitbox)&&!this.dead&&!user.seat
    }
    override interact(user: Human): void {
        let interact_seat:VehicleSeat|undefined
        let dist:number=Infinity
        let door:Vec2|undefined
        for(const s of this.seats){
            for(const cd of s.doors){
                const dis=v2.distance(s.position,user.position)
                if(dis<=dist){
                    dist=dis
                    interact_seat=s
                    door=cd
                }
            }
        }

        if(interact_seat!==undefined&&door!==undefined){
            const old_m=user.human_data.movement_enabled
            const old_c=user.human_data.combat_enabled
            user.human_data.movement_enabled=false
            user.human_data.combat_enabled=false

            const valid=user.pathfind_to(door,()=>{
                this.game.add_timeout(()=>{
                    user.human_data.movement_enabled=old_m
                    user.human_data.combat_enabled=old_c

                    interact_seat.set_human(user)
                },1)
            },0.1)
            if(!valid){
                user.human_data.movement_enabled=old_m
                user.human_data.combat_enabled=old_c
            }
        }
    }
    override net_update() {
        this.physical_data.dirty=false
    }
    override encode(stream: NetStream, full: boolean) {
        stream.writeBooleanGroup(this.physical_data.dirty,this.dead)
        if(this.physical_data.dirty||full)this.physical_encode(stream)

        stream.writeFloat32(this.speed)
        stream.writeRad(this.direction)

        if (full) {
            stream.writeUint8(this.def.idNumber!)
        }
    }
}