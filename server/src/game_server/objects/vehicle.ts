import { VehicleDef } from "common/scripts/definitions/objects/vehicles.ts"
import {
    Hitbox2D,
    Stream,
    Numeric,
    PolarMovement,
    v2,
    v2m,
    Vec2,
} from "common/engine/core.ts"
import { type Human } from "./human.ts"
import { GameObjectType } from "common/scripts/others/constants.ts"
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts"
import { Floors, FloorType } from "common/scripts/others/terrain.ts"
import { StaticBody } from "./static_body.ts"
import { ServerGameObject } from "../others/gameObject.ts"

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

    doors: Vec2[] = []
    base_doors: Vec2[] = []

    constructor(vehicle: Vehicle, position: Vec2, pillot: boolean, leave: Vec2, base_doors: Vec2[]) {
        this.vehicle = vehicle
        this.position = position
        this.base_position = v2.clone(position)
        this.pillot = pillot
        this.leave = leave
        this.base_doors = base_doors

        for (const d of base_doors) {
            this.doors.push(v2.clone(d))
        }
    }

    clear_human() {
        if (!this.human || !this.vehicle.can_leave) return
        this.human.seat = undefined
        this.human = undefined
    }

    set_human(p: Human) {
        if (this.human) return

        if (p.seat) p.seat.clear_human()

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
    override on_create(args: { position: Vec2; def: VehicleDef }) {
        this.position = v2.clone(args.position)

        this.def = args.def

        this.base_hitbox = this.def.hitbox.clone()
        this.physical_data.mass = this.def.physics.mass
        this.physical_data.engine_force=this.def.physics.engine_force

        this.physical_data.brake_force=this.def.physics.brake_force
        this.physical_data.traction=this.def.physics.traction
        this.physical_data.drag=this.def.physics.drag

        this.physical_data.steer_force=this.def.physics.steer_force

        this.physical_data.max_steer_speed =this.def.physics.max_steer_speed

        if (this.def.pillot_seat) {
            this.seats.push(
                new VehicleSeat(
                    this,
                    this.def.pillot_seat.position,
                    true,
                    this.def.pillot_seat.leave,
                    this.def.pillot_seat.doors
                )
            )
        }

        for (const s of this.def.seats ?? []) {
            this.seats.push(
                new VehicleSeat(
                    this,
                    s.position,
                    false,
                    s.leave,
                    s.doors
                )
            )
        }

        this.interaction_hitbox = this.hitbox
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

                v2m.add(
                    s.doors[i],
                    this.position,
                    s.doors[i]
                )
            }

            if (s.human) {
                s.human.position = s.position
            }
        }
    }

    private solve_collision(other: StaticBody) {
        if ((other as StaticBody).physical_data?.no_collision) return
        const cols = this.hitbox.overlap_collisions(other.hitbox)
        if (cols.length <= 0) return
        for (const col of cols) {
            v2m.sub(this.position,this.position,v2.scale(col.dir, col.pen))
            const normal = v2.normalizeSafe(col.dir, v2(1, 0))
            const velDot = v2.dot(this.physical_data.velocity,normal)
            if (velDot < 0) {
                const restitution=other.number_type===GameObjectType.Vehicle?0.25:0.12

                const normalVel=v2.scale(normal, velDot)

                const tangentVel=v2.sub(this.physical_data.velocity,normalVel)

                this.physical_data.velocity = v2.add(tangentVel,v2.scale(normalVel,-restitution))

                this.physical_data.velocity.x *= 0.88
                this.physical_data.velocity.y *= 0.88

                const tangent = v2(-normal.y, normal.x)

                const tangentDot = v2.dot(
                    this.physical_data.velocity,
                    tangent
                )

                this.physical_data.angular_velocity +=
                    tangentDot *
                    0.003 /
                    Math.max(1, this.physical_data.mass)
            }
        }
    }

    override on_tick(dt: number) {
        if (this.dead) return

        this.current_floor = this.game.map.terrain.get_floor_type(
            this.position,
            this.layer,
            this.game.map.def.default_floor ?? FloorType.Void
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
        if (obj.id === this.id) return
        if(obj instanceof StaticBody)this.solve_collision(obj)
    }

    override can_interact(user: Human): boolean {
        return (
            this.interaction_hitbox.colliding_with(user.hitbox) &&
            !this.dead &&
            !user.seat
        )
    }

    override on_interact(user: Human): void {
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

        if (interact_seat && door) {
            const old_m = user.human_data.movement_enabled
            const old_c = user.human_data.combat_enabled

            user.human_data.movement_enabled = false
            user.human_data.combat_enabled = false

            const valid = user.pathfind_to(
                door,
                () => {
                    this.game.add_timeout(() => {
                        user.human_data.movement_enabled = old_m
                        user.human_data.combat_enabled = old_c

                        interact_seat?.set_human(user)
                    }, 1)
                },
                0.1
            )

            if (!valid) {
                user.human_data.movement_enabled = old_m
                user.human_data.combat_enabled = old_c
            }
        }
    }

    override on_net_update() {
        this.physical_data.dirty = false
    }

    override on_encode_net(stream: Stream, full: boolean) {
        stream.write_boolean_group(
            this.physical_data.dirty,
            this.dead
        )

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
}