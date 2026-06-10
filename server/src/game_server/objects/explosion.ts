import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts"
import { DamageReason } from "common/scripts/definitions/utils.ts"
import { ServerGameObject } from "../others/gameObject.ts"
import { CircleHitbox2D, Stream, random, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { StaticBody } from "./static_body.ts";
import { DamageSourceDef } from "common/scripts/definitions/game_defs.ts";
import { type Grenade } from "./grenade.ts";
import { type Projectile } from "./projectile.ts";

export class Explosion extends ServerGameObject{
    string_type:string="explosion"
    number_type: number=GameObjectType.Explosion
    def!:ExplosionDef

    parent?:Projectile
    owner?:Human
    source?:DamageSourceDef

    exploded_base:boolean=false
    delay:number=0.1
    constructor(){
        super()
        this.net_sync_deletion=false

        this.allow_tick=true
    }
    explode_base(){
        if(this.exploded_base)return
        this.exploded_base=true
        if(this.def.bullet){
            for(let i=0;i<this.def.bullet.count;i++){
                const b=this.game.add_bullet(this.position,this.def.bullet.def,this.owner,undefined,this.def,this.layer)
                b.hit_owner=true
                b.set_direction(random.rad())
            }
        }
        if(this.def.synced_particles){
            const def=this.game.definitions.synced_particle.getFromString(this.def.synced_particles.def)
            for(let i=0;i<this.def.synced_particles.count;i++){
                this.game.add_synced_particle(this.position,def,this.owner,this.layer)
            }
        }
        if(this.def.decal){
            this.game.add_decal(this.position,0,this.game.definitions.decals.getFromString(this.def.decal.def),this.def.decal.tint,this.def.decal.scale,this.layer)
        }
    }
    explode_damage(){
        const objs = this.manager.cells.get_objects(this.hitbox, this.layer).filter((v)=>this.hitbox.colliding_with(v.hitbox))
        objs.sort((a, b) =>v2.distanceSquared(this.position, a.position)-v2.distanceSquared(this.position, b.position))
        const blocks:ServerGameObject[] = []
        for (const obj of objs) {
            const dist=v2.distance(this.position,obj.position)
            let damage = 0
            if(dist<=this.def.size.end){
                damage=this.def.damage
                if (dist>this.def.size.begin){
                    damage*=1-((dist-this.def.size.begin)/(this.def.size.end-this.def.size.begin))
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
                            obj.physical_data.angular_velocity=random.neg_float(2,10)
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
        if(this.def.projectiles){
            for(let i=0;i<this.def.projectiles.count;i++){
                const p=this.game.add_grenade(this.position,this.game.definitions.grenades.getFromString(this.def.projectiles.def),this.owner,this.layer)
                p.physical_data.zpos=0.5
                p.physical_data.zpos_speed=1.5
                p.physical_data.velocity=v2.random(-this.def.projectiles.speed,this.def.projectiles.speed)
                p.physical_data.angular_velocity=random.neg_value(this.def.projectiles.angSpeed+(Math.random()*this.def.projectiles.randomAng))
                if(this.parent)v2m.add(p.physical_data.velocity,p.physical_data.velocity,this.parent.physical_data.velocity)
            }
        }
        this.destroy()
    }
    override on_tick(dt:number): void {
        this.explode_base()
        if(this.delay<=0){
            this.explode_damage()
        }else{
            this.delay-=dt
        }
    }
    override on_create(args: {def:ExplosionDef,source?:DamageSourceDef,position:Vec2,owner?:Human}): void {
        this.def=args.def
        this.owner=args.owner
        this.source=args.source
        this.base_hitbox=new CircleHitbox2D(v2(0,0),this.def.size.end)
        this.position=args.position
    }
    override on_encode_net(stream: Stream, _full: boolean): void {
        stream.write_pos2(this.position)
        .write_float((this.base_hitbox as CircleHitbox2D).radius,0,50,3)
        .write_id(this.def.idNumber!)
    }
}