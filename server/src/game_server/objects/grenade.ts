import { GameObjectType, Layers } from "common/scripts/others/constants.ts";
import { Projectile, ProjectileData, ProjectilePhysicalData } from "./projectile.ts";
import { CircleHitbox2D, NetStream, Numeric, v2, v2m, Vec2 } from "common/engine/core.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { type Human } from "./human.ts";
import { FloorType } from "common/scripts/others/terrain.ts";

export type GrenadePhysicalData=ProjectilePhysicalData&{
    current_floor:FloorType
    zpos:number
    zpos_speed:number
}
export class Grenade extends Projectile{
    string_type:string="grenade"
    number_type: number=GameObjectType.Grenade

    override physical_data: GrenadePhysicalData
    fuse_delay:number=0
    projectile_data:ProjectileData={}
    def!:GrenadeDef

    old_pos?:Vec2
    constructor(){
        super()
        this.physical_data={
            current_floor:0,
            angular_velocity:0,
            rotation:0,
            velocity:v2.zero(),
            zpos:0,
            zpos_speed:0,
        }
    }

    override update(dt:number): void {
        super.update(dt)

        if(this.physical_data.zpos>0){
            this.physical_data.zpos_speed=Numeric.clamp(this.physical_data.zpos_speed-this.def.gravity*dt,-3,3)
            this.physical_data.zpos=Numeric.clamp(this.physical_data.zpos+this.physical_data.zpos_speed*dt,0,1)
        }else{
            const vel = this.physical_data.velocity

            const speedDecay = Math.exp(-this.def.decays.ground_speed * dt)
            const rotDecay   = Math.exp(-this.def.decays.ground_rotation * dt)

            v2m.scale(vel, vel, speedDecay)

            this.physical_data.angular_velocity *= rotDecay
        }
        if(this.def.cook){
            this.fuse_delay-=dt
            if(this.fuse_delay<=0){
                this.kill()
            }
        }

        if(!this.old_pos||!v2.is(this.position,this.old_pos)){
            this.old_pos=this.position
            // Fall
            if(this.physical_data.current_floor===FloorType.Void){
                if(this.layer>Layers.Normal){
                    this.set_layer(this.layer-1)
                }
            }
        }
    }
    create(args: {def:GrenadeDef,position:Vec2,owner?:Human}): void {
        this.def=args.def
        this.base_hitbox=new CircleHitbox2D(v2.new(0,0),this.def.radius)
        this.position=args.position
        if(this.def.cook){
            this.fuse_delay=this.def.cook.fuse_time
        }
        this.owner=args.owner

        if(this.def.explosion)this.projectile_data.explosion=this.game.definitions.explosions.getFromString(this.def.explosion)

        if(this.def.call_airdrop){
            this.game.add_timeout(()=>{
                this.game.add_airdrop(this.position)
            },this.def.call_airdrop.delay)
        }
    }
    override encode(stream: NetStream, full: boolean): void {
        this.physical_encode(stream)
        stream.writeFloat(this.physical_data.zpos,0,1,1)
        if(full){
            stream.writeID(this.def.idNumber!)
        }
    }
}