import { CircleHitbox2D, NetStream, Numeric, v2, Vec2 } from "common/scripts/engine/mod.ts"
import { type Player } from "./player.ts";
import { ServerGameObject } from "../others/gameObject.ts"; 
import {VehicleDef} from "common/scripts/definitions/objects/vehicles.ts"
export class VehicleSeat{
    player?:Player
    position:Vec2
    base_position:Vec2
    rotation?:number
    pillot:boolean
    vehicle:Vehicle
    leave:Vec2
    constructor(vehicle:Vehicle,position:Vec2,pillot:boolean,leave:Vec2){
        this.vehicle=vehicle
        this.position=position
        this.base_position=v2.duplicate(position)
        this.pillot=pillot
        this.leave=leave
    }
    clear_player(){
        if(!this.player||!this.vehicle.can_leave)return
        this.player.dirty=true
        this.player.seat=undefined
        this.player=undefined
    }
    set_player(p:Player){
        if(this.player)return
        if(p.seat)p.seat.clear_player()
        this.player=p
        p.seat=this
        if(this.vehicle.def.battle_plane)this.player.parachute={value:1}
    }
}
export class Vehicle extends ServerGameObject{
    stringType:string="vehicle"
    numberType: number=9

    angle:number=0
    direction:number=0
    dead:boolean=false
    def!:VehicleDef

    velocity:Vec2=v2.new(0,0)
    speed:number=0
    old_pos:Vec2=v2.new(-1,-1)

    seats:VehicleSeat[]=[]

    can_leave:boolean=true

    constructor(){
        super()
    }
    is_moving:boolean=false

    back_walk:boolean=false
    move(direction:Vec2,back_walk:boolean,dt:number,alt_control:boolean){
        if (direction.x !== 0 || direction.y !== 0) {
            if (alt_control) {
                if (direction.y !== 0) {
                    this.back_walk = direction.y > 0
                    const mult = this.back_walk ? -this.def.movimentation.back_walk_mult : 1
                    this.speed = Numeric.lerp(
                        this.speed,
                        this.def.movimentation.final_speed * mult,
                        1 / (1 + dt * this.def.movimentation.acceleration)
                    );
                }

                this.direction = 0
                if (direction.x !== 0) {
                    const rot_speed = ((dt*1000) / this.def.movimentation.angle_acceleration)*Math.min((this.speed/this.def.movimentation.final_speed)+0.2,1)
                    const dir=(direction.x > 0 ? 1 : -1)
                    this.direction = Numeric.normalize_rad(dir)
                    this.angle += dir*rot_speed;
                    this.angle = Numeric.normalize_rad(this.angle);
                }

                this.is_moving = direction.y !== 0
            } else {
                const dir = Math.atan2(direction.y, direction.x)
                this.angle = Numeric.lerp_rad(
                    this.angle,
                    dir,
                    1 / (1 + dt * this.def.movimentation.angle_acceleration * Math.max((this.def.movimentation.final_speed / this.speed)-0.1,0))
                )
                this.is_moving = true
                this.direction = Numeric.normalize_rad(dir - this.angle)
                this.back_walk = back_walk
                this.speed = Numeric.lerp(
                    this.speed,
                    this.def.movimentation.final_speed * (this.back_walk ? -this.def.movimentation.back_walk_mult : 1),
                    1 / (1 + dt * this.def.movimentation.acceleration)
                )
            }
        }
    }
    interact(_user: Player): void {
      return
    }
    update(dt:number): void {
        if(!v2.is(this.old_pos,this.position)){
            this.manager.cells.updateObject(this)
            this.dirtyPart=true
            this.old_pos=v2.duplicate(this.position)
        }
        for(const s of this.seats){
            s.position=v2.add(this.position,v2.rotate_RadAngle(s.base_position,this.angle))
            if(s.player)s.player.position=s.position
            s.rotation=this.angle
        }
        this.position=v2.add(this.position,v2.scale(this.velocity,dt))

        if(this.def.battle_plane){
            if(v2.greater(this.position,this.game.map.size)){
                for(const s of this.seats){
                    s.clear_player()
                }
            }
        }else{
            if (!this.is_moving || (this.back_walk && this.speed > 0))
                this.speed = Numeric.lerp(this.speed, 0, 1 / (1 + dt * this.def.movimentation.desacceleration))

            const vel_dir = Math.atan2(this.velocity.y,this.velocity.x)
            const target_dir = this.angle

            if (this.speed > 0.01 && this.direction === 0) {
                this.angle = Numeric.lerp_rad(
                    this.angle,
                    vel_dir,
                    dt * 10
                )
            }

            const corrected_dir = Numeric.lerp_rad(
                vel_dir,
                target_dir,
                dt * 10
            )

            this.velocity = v2.scale(
                v2.from_RadAngle(corrected_dir),
                this.speed
            )
        }

        this.is_moving=false
    }

    create(args: {position:Vec2,def:VehicleDef}): void {
        this.base_hitbox=new CircleHitbox2D(v2.new(0,0),2)
        this.base_hitbox.position=args.position
        this.def=args.def
        if(this.def.pillot_seat)this.seats.push(new VehicleSeat(this,this.def.pillot_seat.position,true,this.def.pillot_seat.leave))
        for(const s of this.def.seats??[]){
            this.seats.push(new VehicleSeat(this,s.position,false,s.leave))
        }
        if(this.def.battle_plane){
            for(let i=0;i<this.def.battle_plane.seats_count;i++){
                this.seats.push(new VehicleSeat(this,this.def.battle_plane.main_seat,false,this.def.battle_plane.leave_position))
            }
        }
    }
    override on_destroy(): void {
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writePosition(this.position) 
        .writeRad(this.angle)
        .writeRad(this.direction)
        if(full){
            stream.writeBooleanGroup(this.dead)
            stream.writeUint8(this.def.idNumber!)
        }
    }
}