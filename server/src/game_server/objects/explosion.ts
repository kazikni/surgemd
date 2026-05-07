import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts"
import { DamageReason } from "common/scripts/definitions/utils.ts"
import { ServerGameObject } from "../others/gameObject.ts"
import { CircleHitbox2D, NetStream, Numeric, random, v2, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { StaticBody } from "./static_body.ts";
import { DamageSourceDef } from "common/scripts/definitions/game_defs.ts";
import { type Grenade } from "./grenade.ts";

export class Explosion extends ServerGameObject{
    string_type:string="explosion"
    number_type: number=GameObjectType.Explosion
    def!:ExplosionDef

    owner?:Human
    source?:DamageSourceDef
    constructor(){
        super()
        this.net_sync.enabled.deletion=false
    }
    delay:number=1
    interact(_user: Human): void {
        return
    }

    explode(){
        const objs = this.manager.cells.get_objects(this.hitbox, this.layer).filter((v)=>this.hitbox.colliding_with(v.hitbox))
        objs.sort((a, b) =>v2.distanceSquared(this.position, a.position)-v2.distanceSquared(this.position, b.position))
        const blocks:ServerGameObject[] = []
        for (const obj of objs) {
            const dist=v2.distance(this.position,obj.position)
            let damage = 0
            if(dist<=this.def.size.end){
                if (dist <= this.def.size.begin) {
                    damage = this.def.damage
                } else {
                    const t = (dist - this.def.size.begin) / (this.def.size.end - this.def.size.begin)
                    damage = Numeric.lerp(this.def.damage, 0, t)
                }
            }
            let blockFactor = 1
            for (const b in blocks) {
                if(blocks[b].hitbox.overlap_line(this.position,obj.position)){
                    blockFactor=0
                    break
                }
            }
            damage*=blockFactor

            if (damage > 0) {
                switch (obj.number_type) {
                    case GameObjectType.StaticBody:
                    case GameObjectType.Obstacle:
                    case GameObjectType.Building:
                    case GameObjectType.Human: {
                        (obj as Human | StaticBody).damage({
                            amount: damage,
                            reason: DamageReason.Explosion,
                            source: this.source ?? this.def,
                            owner: this.owner,
                            position: v2.clone(obj.position),
                            critical: false,
                            direction: v2.lookTo(obj.position, this.position)
                        })
                        break
                    }
                    case GameObjectType.Loot: {
                        const dir = v2.lookTo(this.position,obj.position)
                        const force = Math.max(0, (this.def.size.end - dist) / this.def.size.end)*(this.def.push_force===undefined?8:this.def.push_force)
                        obj.push(force*blockFactor, dir)
                        break
                    }
                    case GameObjectType.Grenade: {
                        const pf=(obj as Grenade).def.push_force_resistence!==undefined?(obj as Grenade).def.push_force_resistence!:1
                        if(pf){
                            const dir = v2.lookTo(this.position,obj.position)
                            const force = Math.max(0, (this.def.size.end - dist) / this.def.size.end)*(this.def.push_force===undefined?8:this.def.push_force)
                            obj.push(force*blockFactor*pf, dir)
                            obj.physical_data.angular_velocity=random.float(2,10)
                            if(Math.random()<=0.5)obj.physical_data.angular_velocity*=-1
                        }
                        if(!(obj as Grenade).def.zindex_set_resistence){
                            obj.physical_data.zpos = random.float(0.3,1)
                            obj.physical_data.zpos_speed = 0
                        }
                        break
                    }
                }
            }
            if(obj instanceof StaticBody&&!obj.physical_data.no_collision){
                blocks.push(obj)
            }
        }

        if(this.def.bullet){
            for(let i=0;i<this.def.bullet.count;i++){
                const b=this.game.add_bullet(this.position,this.def.bullet.def,this.owner,undefined,this.def,this.layer)
                b.set_direction(random.rad())
            }
        }
        if(this.def.projectiles){
            for(let i=0;i<this.def.projectiles.count;i++){
                const p=this.game.add_grenade(this.position,this.game.definitions.grenades.getFromString(this.def.projectiles.def),this.owner,this.layer)
                p.physical_data.zpos=0.5
                p.physical_data.zpos_speed=1.5
                p.physical_data.velocity=v2.random(-this.def.projectiles.speed,this.def.projectiles.speed)
                p.physical_data.angular_velocity=this.def.projectiles.angSpeed+(Math.random()*this.def.projectiles.randomAng)
                if(Math.random()<=0.5)p.physical_data.angular_velocity*=-1
            }
        }
        if(this.def.synced_particles){
            const def=this.game.definitions.synced_particle.getFromString(this.def.synced_particles.def)
            for(let i=0;i<this.def.synced_particles.count;i++){
                this.game.add_synced_particle(this.position,def,this.owner,this.layer)
            }
        }
    }
    update(_dt:number): void {
        if(this.delay==0){
            this.explode()
            this.destroy()
        }else{
            this.delay--
        }
    }
    create(args: {def:ExplosionDef,source?:DamageSourceDef,position:Vec2,owner?:Human}): void {
        this.def=args.def
        this.owner=args.owner
        this.source=args.source
        this.base_hitbox=new CircleHitbox2D(v2(0,0),this.def.size.end)
        this.position=args.position
    }
    override encode(stream: NetStream, _full: boolean): void {
        stream.writePos2(this.position)
        .writeFloat((this.base_hitbox as CircleHitbox2D).radius,0,50,3)
        .writeID(this.def.idNumber!)
    }
}