import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts"
import { DamageReason } from "common/scripts/definitions/utils.ts"
import { ServerGameObject } from "../others/gameObject.ts"
import { CircleHitbox2D, NetStream, random, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type StaticBody } from "./static_body.ts";
import { type Loot } from "./loot.ts";
import { DamageSourceDef } from "common/scripts/definitions/game_defs.ts";
import { type Grenade } from "./grenade.ts";

export class Explosion extends ServerGameObject{
    string_type:string="explosion"
    number_type: number=GameObjectType.Explosion
    defs!:ExplosionDef

    owner?:Human
    source?:DamageSourceDef

    radius:number=2
    speed_damage:number=0
    constructor(){
        super()
        this.net_sync.enabled.deletion=false
    }
    delay:number=2
    interact(_user: Human): void {
        return
    }
    update(_dt:number): void {
        if(this.delay==0){
            this.manager.cells.updateObject(this)
            if(this.defs.bullet){
                for(let i=0;i<this.defs.bullet.count;i++){
                    const b=this.game.add_bullet(this.position,this.defs.bullet.def,this.owner,undefined,this.defs)
                    b.set_direction(random.rad())
                }
            }
            if(this.defs.projectiles){
                for(let i=0;i<this.defs.projectiles.count;i++){
                    const p=this.game.add_grenade(this.position,this.game.definitions.grenades.getFromString(this.defs.projectiles.def),this.owner,this.layer)
                    p.physical_data.zpos=0.5
                    p.physical_data.zpos_speed=1.5
                    p.physical_data.velocity=v2.random(-this.defs.projectiles.speed,this.defs.projectiles.speed)
                    p.physical_data.angular_velocity=this.defs.projectiles.angSpeed+(Math.random()*this.defs.projectiles.randomAng)
                }
            }

            const objs:ServerGameObject[] = this.manager.cells.get_objects(this.hitbox,this.layer)
            for(const obj of objs){
                switch(obj.number_type){
                    case GameObjectType.StaticBody:
                    case GameObjectType.Obstacle:
                    case GameObjectType.Building:
                    case GameObjectType.Human:{
                        if(obj.hitbox.collidingWith(this.hitbox)){
                            (obj as Human|StaticBody).damage({
                                amount:this.defs.damage,
                                reason:DamageReason.Explosion,
                                source:this.source??this.defs,
                                owner:this.owner,
                                position:v2.clone(obj.position),
                                critical:false,
                                direction:v2.lookTo(obj.position,this.position)
                            })
                        }
                        break
                    }
                    case GameObjectType.Loot:{
                        const dist=v2.distance(obj.position,this.position)
                        const angle=v2.lookTo(obj.position,this.position);
                        (obj as Loot).push(Math.min((this.radius/dist)*-10,9),angle)
                        break
                    }
                    case GameObjectType.Grenade:{
                        if(obj.hitbox.collidingWith(this.hitbox)){
                            (obj as Grenade).push(Math.min(v2.distance(this.position,obj.position),10),v2.lookTo(this.position,obj.position),10*random.choose([-1,1]));
                            (obj as Grenade).physical_data.zpos=1;
                            (obj as Grenade).physical_data.zpos_speed=0
                        }
                        break
                    }
                }
            }

            if(this.defs.synced_particles){
                const def=this.game.definitions.synced_particle.getFromString(this.defs.synced_particles.def)
                for(let i=0;i<this.defs.synced_particles.count;i++){
                    this.game.add_synced_particle(this.position,def,this.owner,this.layer)
                }
            }
            //this.game.play_sound(this.position,this.layer,"explosion")
            this.destroy()
        }else{
            this.delay--
        }
    }
    create(args: {defs:ExplosionDef,source?:DamageSourceDef,position:Vec2,owner?:Human}): void {
        this.defs=args.defs
        this.owner=args.owner
        this.source=args.source
        this.base_hitbox=new CircleHitbox2D(v2(0,0),this.defs.size.end*2)
        this.position=args.position
    }
    override encode(stream: NetStream, _full: boolean): void {
        stream.writePos2(this.position)
        .writeFloat((this.base_hitbox as CircleHitbox2D).radius,0,50,3)
        .writeID(this.defs.idNumber!)
    }
}