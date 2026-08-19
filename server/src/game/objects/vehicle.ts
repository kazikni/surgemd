import { VehicleDef, VehicleSeatDef } from "common/scripts/definitions/objects/vehicles.ts"
import {
    Hitbox2D,
    Stream,
    Numeric,
    PolarMovement,
    v2,
    v2m,
    Vec2,
} from "common/engine/core.ts"
import { Human } from "./human.ts"
import { GameObjectType } from "common/scripts/others/constants.ts"
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts"
import { Floors, FloorType } from "common/scripts/others/terrain.ts"
import { StaticBody } from "./static_body.ts"
import { ServerGameObject } from "../others/gameObject.ts"
import { DamageReason, ScopeChange } from "common/scripts/definitions/utils.ts";
import { Obstacle } from "./obstacle.ts";

export interface VehiclePhysicalData extends MovingBodyPhysicalData {
    acceleration: Vec2
    angular_velocity: number
    mass: number
    engine_force: number
    brake_force: number
    traction: number
    drag: number
    rolling_resistance: number
    steer_force: number
    max_steer_speed: number
    throttle: number
    steer_input: number
}

export class VehicleSeat {
    human?: Human
    position: Vec2
    base_position: Vec2
    rotation?: number
    pillot: boolean
    vehicle: Vehicle
    leave: Vec2
    scope_change?: ScopeChange

    doors: Vec2[] = []
    base_doors: Vec2[] = []

    constructor(vehicle: Vehicle, def:VehicleSeatDef,pillot:boolean=false) {
        this.vehicle=vehicle
        this.position=def.position
        this.base_position=v2.clone(def.position)
        this.pillot=pillot
        this.leave=def.leave
        this.base_doors=def.doors
        this.scope_change=def.scope_change

        for (const d of def.doors) {
            this.doors.push(v2.clone(d))
        }
    }

    clear_human(moving_physics:boolean=false) {
        if(!this.human||!this.vehicle.can_leave) return
        const door_position=v2.rotate_RadAngle(this.leave??v2(0,-1),this.vehicle.physical_data.rotation)
        v2m.add(this.human.position,this.human.position,door_position)
        if(moving_physics){
            v2m.add(this.human.physical_data.secondary_velocity,this.human.physical_data.secondary_velocity,this.vehicle.physical_data.velocity)
            this.human.physical_data.secondary_velocity_take_control=true
            const vel=v2.len(this.vehicle.physical_data.velocity)
            if(vel>6){
                this.human.physical_data.secondary_velocity_swimming=true
                this.human.swimming=true
                const dir=v2.normalizeSafe(door_position)
                v2m.scale(dir,dir,2)
                v2m.add(this.human.physical_data.secondary_velocity,this.human.physical_data.secondary_velocity,dir)
                this.human.physical_data.secondary_acceleration=0.1
                this.human.physical_data.rotation=Math.atan2(dir.y,dir.x)
                this.human.damage({amount:vel*0.75,critical:false,direction:v2.lookTo(this.position,this.human.position),penetration:1,position:this.human.position,reason:DamageReason.VehicleJump})
            }
        }
        this.human.seat = undefined
        this.human = undefined
    }

    set_human(p: Human) {
        if(this.human)return
        if(p.seat)p.seat.clear_human()
        p.physical_data.secondary_velocity=v2.zero()
        this.human = p
        p.seat = this
    }
}

export class Vehicle extends MovingBody {
    string_type = "vehicle"
    number_type = GameObjectType.Vehicle

    def!: VehicleDef

    speed = 0
    direction = 0
    tire_stress=0

    dead = false
    back_walk = false
    is_moving = false

    pillot_seat?:VehicleSeat
    seats: VehicleSeat[] = []

    can_leave = true

    current_floor: FloorType = FloorType.Void

    interaction_hitbox!: Hitbox2D

    physical_data: { dirty: boolean } & VehiclePhysicalData = {
        dirty: true,

        rotation: 0,

        velocity: v2.zero(),
        acceleration: v2.zero(),

        angular_velocity: 0,

        mass: 1,

        engine_force: 0,
        brake_force: 0,

        traction: 1,

        drag: 1,
        rolling_resistance: 0,

        steer_force: 4,
        max_steer_speed: 8,

        throttle: 0,
        steer_input: 0,
    }
    constructor(){
        super()
        this.allow_net_update=true
    }
    set_configuration(position:Vec2,def:VehicleDef){
        this.position = v2.clone(position)

        this.def = def

        this.base_hitbox = this.def.hitbox.clone()
        this.physical_data.mass = this.def.physics.mass
        this.physical_data.engine_force=this.def.physics.engine_force

        this.physical_data.brake_force=this.def.physics.brake_force
        this.physical_data.traction=this.def.physics.traction
        this.physical_data.drag=this.def.physics.drag

        this.physical_data.steer_force=this.def.physics.steer_force

        this.physical_data.max_steer_speed =this.def.physics.max_steer_speed

        if(this.def.pillot_seat){
            this.pillot_seat=new VehicleSeat(this,this.def.pillot_seat,true)
            this.seats.push(this.pillot_seat)
        }

        for(const s of this.def.seats??[]){
            this.seats.push(new VehicleSeat(this,s))
        }

        this.interaction_hitbox = this.hitbox
    }
    override on_create(args?: { position: Vec2; def: VehicleDef }) {
        if(args)this.set_configuration(args.position,args.def)
    }
    move(input: PolarMovement, backWalk: boolean, _alt = false) {
        const dir = v2.from_PolarMovement(input)

        this.physical_data.throttle = Numeric.clamp(-dir.y, -1, 1)
        this.physical_data.steer_input = Numeric.clamp(dir.x, -1, 1)

        this.back_walk = backWalk

        this.is_moving=Math.abs(this.physical_data.throttle) > 0.001 ||Math.abs(this.physical_data.steer_input) > 0.001
    }

    private update_surface() {
        const floor=Floors[this.current_floor]??Floors[FloorType.Void]
        const kindData=this.def.physics.floor_kind?.[floor.floor_kind]

        this.physical_data.traction=this.def.physics.traction*(kindData?.traction??1)*floor.traction
        this.physical_data.drag=this.def.physics.drag
        this.physical_data.rolling_resistance=(kindData?.rolling_resistance??0)+floor.rolling_resistance
    }

    private update_physics(dt: number) {
        const pd = this.physical_data

        const forward = v2.from_RadAngle(pd.rotation)
        const right = v2(-forward.y, forward.x)

        const forwardSpeed = v2.dot(pd.velocity, forward)
        const lateralSpeed = v2.dot(pd.velocity, right)

        const throttle = pd.throttle

        if (Math.abs(throttle) > 0.001) {
            const accel=(pd.engine_force * throttle)/Math.max(pd.mass, 1)

            pd.velocity.x += forward.x * accel * dt
            pd.velocity.y += forward.y * accel * dt
        }

        if (throttle<0) {
            const brakeDrag = 1 / (1 + dt * pd.brake_force * 0.002)

            pd.velocity.x *= brakeDrag
            pd.velocity.y *= brakeDrag
        }

        const gripForce=lateralSpeed*pd.traction*Numeric.lerp(1,0.45,Math.min(Math.abs(forwardSpeed)/18,1))
        pd.velocity.x -= right.x * gripForce * dt
        pd.velocity.y -= right.y * gripForce * dt

        const damping=1/(1+dt*(pd.drag+pd.rolling_resistance))

        pd.velocity.x *= damping
        pd.velocity.y *= damping

        const absForward=Math.abs(forwardSpeed)
        const steerFactor=Numeric.clamp(absForward / pd.max_steer_speed,0,1)
        const reverseMul=forwardSpeed < -0.5 ? -1 : 1

        pd.angular_velocity+=pd.steer_input*pd.steer_force*steerFactor*reverseMul*pd.traction*dt
        pd.angular_velocity *= 1 / (1 + dt * 4)
        const maxAngular=Numeric.lerp(6,2,Math.min(Math.abs(forwardSpeed)/20,1))
        pd.angular_velocity = Numeric.clamp(pd.angular_velocity,-maxAngular,maxAngular)
    
        pd.rotation = Numeric.normalize_rad(pd.rotation + pd.angular_velocity * dt)
        this.speed = forwardSpeed

        const speedAbs=Math.abs(forwardSpeed)

        // Tire Stress
        const lateralStress=Math.abs(lateralSpeed)*1
        const steeringStress=Math.abs(pd.angular_velocity)*Numeric.lerp(0.4, 1.4,Numeric.clamp(speedAbs / 12, 0, 1))
        const accelStress=Math.max(0,throttle)*Numeric.clamp(speedAbs*0.2,0,2)
        const brakeStress=Math.max(0-throttle)*Numeric.clamp(speedAbs*5,0,10)
        this.tire_stress=lateralStress+steeringStress+accelStress+brakeStress

        const slipAngle = Math.atan2(lateralSpeed,Math.abs(forwardSpeed) + 0.001)
        this.direction = slipAngle * 0.7 + pd.steer_input * 0.5
    }

    private update_seats() {
        for (const s of this.seats) {
            const off = v2.rotate_RadAngle(
                s.base_position,
                this.physical_data.rotation
            )
            s.position = v2.add(this.position, off)
            s.rotation = this.physical_data.rotation
            for (const i in s.doors) {
                s.doors[i] = v2.rotate_RadAngle(
                    s.base_doors[i],
                    this.physical_data.rotation
                )
                v2m.add(s.doors[i],this.position,s.doors[i])
            }
            if(s.human){
                s.human.position = s.position
            }
        }
    }
    override on_tick(dt: number) {
        if (this.dead) return

        this.current_floor = this.game.map.terrain.get_floor_type(
            this.position,
            this.layer,
            this.game.map.default_floor
        )

        this.update_surface()
        this.update_physics(dt)
        super.on_tick(dt)
        this.update_seats()
        this.interaction_hitbox = this.hitbox

        if(Math.abs(this.speed) > 0.001 ||Math.abs(this.physical_data.angular_velocity) > 0.001 ||this.is_new){
            this.physical_data.dirty = true
            this.set_dirty_part()
        }

        this.physical_data.throttle = 0
        this.physical_data.steer_input = 0

        this.is_moving = false
    }

    override on_collided(obj: ServerGameObject, _dt: number): void {
        if(obj.id===this.id)return
        const vel:number=v2.len(this.physical_data.velocity)
        if(obj instanceof StaticBody){
            if((obj as StaticBody).physical_data?.no_collision) return
            const cols = this.hitbox.overlap_collisions(obj.hitbox)
            if (cols.length <= 0) return
            for (const col of cols) {
                v2m.sub(this.position,this.position,v2.scale(col.dir, col.pen))
                v2m.sub(this.physical_data.velocity,this.physical_data.velocity,v2.scale(col.dir,vel*0.5))
            }
            if((obj instanceof Obstacle)){
                obj.damage({
                    position:obj.position,
                    amount:vel*(this.physical_data.mass*0.01),
                    reason:DamageReason.VehicleCollision,
                    owner:this.pillot_seat?.human,
                    penetration:1,
                    critical:false,
                    direction:v2.lookTo(this.position,obj.position)
                })
            }
        }else if(obj instanceof Human){
            if(obj.health.invensibility>0||obj.dead||obj.swimming||vel<=6||obj.seat)return
            const cols = this.hitbox.overlap_collisions(obj.hitbox)
            if (cols.length <= 0) return
            for (const col of cols) {
                v2m.sub(this.position,this.position,v2.scale(col.dir, col.pen))
                v2m.sub(this.physical_data.velocity,this.physical_data.velocity,v2.scale(col.dir,vel*0.3))
            }
            const damage=vel*(this.physical_data.mass*0.002)
            const dir=v2.lookTo(this.position,obj.position)
            obj.damage({
                position:obj.position,
                amount:damage,
                critical:false,
                penetration:1,
                reason:DamageReason.VehicleCollision,
                owner:this.pillot_seat?.human,
                direction:dir
            })

            obj.swimming=true
            obj.physical_data.secondary_velocity_swimming=true
            obj.physical_data.secondary_velocity_take_control=true
            obj.physical_data.secondary_acceleration=0.2
            obj.push(vel*(this.physical_data.mass)*0.001,dir)
        }
    }

    override can_interact(user: Human): boolean {
        return (this.interaction_hitbox.colliding_with(user.hitbox)&&!this.dead)
    }

    override on_interact(user: Human): void {
        if(!user.seat){
            let interact_seat: VehicleSeat | undefined
            let dist = Infinity
            let door: Vec2 | undefined
            for (const s of this.seats) {
                for (const cd of s.doors) {
                    const dis = v2.distance(
                        s.position,
                        user.position
                    )

                    if (dis <= dist) {
                        dist = dis
                        interact_seat = s
                        door = cd
                    }
                }
            }
            if (interact_seat && door) {interact_seat?.set_human(user)}
        }else if(user.seat.vehicle===this){
            user.seat.clear_human(true)
        }
    }

    override on_net_update() {
        this.physical_data.dirty = false
    }

    override on_encode_net(stream: Stream, full: boolean) {
        stream.write_boolean_group(this.physical_data.dirty,this.dead)
        if (this.physical_data.dirty || full) {
            this.physical_encode(stream)
        }

        stream.write_float32(this.speed)
        stream.write_rad(this.direction)
        stream.write_float32(this.tire_stress)
        if (full) {
            stream.write_uint8(this.def.idNumber!)
        }
    }

    override on_encode_checkpoint(stream: Stream): void {
        stream.write_uint16(this.def.idNumber!)
        .write_pos2(this.position)
        .write_rad(this.physical_data.rotation)
        stream.write_float32(this.speed)
        .write_rad(this.direction)
        .write_float32(this.tire_stress)
        .write_boolean_group(this.dead,this.back_walk,this.can_leave)
        .write_uint8(this.seats.length)
        for (const seat of this.seats) {
            stream.write_id(seat.human?.id ?? 0)
        }
        stream.write_int8(this.seats.indexOf(this.pillot_seat!))
    }
    override on_decode_checkpoint(stream: Stream): void {
        const def = this.game.definitions.vehicles.valueNumber[
            stream.read_uint16()
        ]
        const position = stream.read_pos2()
        const rotation=stream.read_rad()
        this.physical_data.rotation=rotation
        this.set_configuration(position, def)

        this.speed = stream.read_float32()
        this.direction = stream.read_rad()
        this.tire_stress = stream.read_float32()

        const [dead, back_walk, can_leave] =
            stream.read_boolean_group()

        this.dead = dead
        this.back_walk = back_walk
        this.can_leave = can_leave

        const seatCount = stream.read_uint8()

        for (let i = 0; i < seatCount; i++) {
            const id = stream.read_id()

            if (id !== 0) {
                const h = this.game.humans.humans[id]
                if (h) {
                    this.seats[i]?.set_human(h)
                }
            }
        }
        this.pillot_seat=this.seats[stream.read_int8()]
    }
}