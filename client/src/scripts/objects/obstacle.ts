import { ABParticle2D, Camera2D, ClientParticle2D, Color, ColorM, Container2D, Hitbox2D, model2d, NetStream, NullHitbox2D, Numeric, ParticlesEmitter2D, random, Sound, Sprite2D, type Tween, v2 } from "common/engine/client.ts";
import { ObstacleBehaviorDoor, ObstacleBehaviorTransformInto, ObstacleDef, ObstacleDoorData } from "common/scripts/definitions/objects/obstacles.ts";
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { Debug, GraphicsDConfig } from "../others/config.ts";
import { StaticBody, StaticBodyAssetData, StaticBodyPhysicalData } from "./static_body.ts";
import { Human } from "./human.ts";
import { CalculateDoorHitbox } from "common/scripts/others/functions.ts";
import { HitSoundsDef } from "common/scripts/definitions/utils.ts";
export function GetObstacleBaseFrame(def:ObstacleDef,variation:number,skin:number):string{
    let spr=def.assets?.frame?.base??def.idString
    if(skin>0&&def.assets?.frame?.biome_skins){
        spr+=`_${def.assets.frame.biome_skins[skin-1]}`
    }
    if(def.assets?.frame?.variations&&(def.assets.frame.sprite_variations===undefined?true:def.assets.frame.sprite_variations)){
        spr+=`_${variation}`
    }
    return spr
}
export class Obstacle extends StaticBody{
    override string_type:string="obstacle"
    override number_type: number=GameObjectType.Obstacle
    override physical_data: StaticBodyPhysicalData&{
        scale:number
        rotation:number
    }={
        hitbox:new NullHitbox2D(v2.zero),

        no_bullets_collision:true,
        no_collision:true,
        reflect_bullets:false,
        passable_by_bullets:false,

        scale:0,
        rotation:0,
        side:0
    }
    door_data?:ObstacleDoorData&{tween?:Tween<any>}
    def!:ObstacleDef

    container:Container2D=new Container2D()
    sprite=new Sprite2D()
    aditional_sprite:Sprite2D[]=[]

    health_data:{
        health:number,
        dead:boolean
    }={health:1,dead:true}
    variation=0
    skin=0

    interacted:boolean=false

    transform_into_data?:{
        activated:boolean
    }

    ////////////////////////////
    // Assets                 //
    ////////////////////////////
    override assets_data: StaticBodyAssetData&{
        sounds:{    
            break?:Sound
        }
        frame:{
            dead?:string
            base:string
        }
    }={
        frame:{
            base:"",
        },
        sounds:{
            hit:[],
        }
    }

    ////////////////////////////
    // Particles              //
    ////////////////////////////
    emitter_1?:ParticlesEmitter2D<ClientParticle2D>

    constructor(){
        super()
        this.container.visible=false
        this.container.add_child(this.sprite)
        this.sprite.hotspot=v2.half_one
        this.sprite.scale=v2(2,2)
        this.updatable=false
    }
    override on_layer_set(layer: number): void {
        this.container.layer=layer
    }
    // deno-lint-ignore no-explicit-any
    override create(_args: Record<string,any>): void {
        this.game.cam2d.addObject(this.container)
    }
    below:boolean=false
    alpha_tween?:Tween<Color>
    below_hitbox?:Hitbox2D
    can_below(other:Hitbox2D):boolean{
        return this.def.below!==undefined&&!this.health_data.dead&&other.colliding_with(this.below_hitbox??this.hitbox)
    }
    set_below(below:boolean){
        if(this.below===below||!this.def.below)return
        if(this.alpha_tween)this.alpha_tween.kill()
        this.below=below
        this.alpha_tween=this.game.add_tween({
            duration:this.def.below.duration??0.5,
            target:this.container.tint,
            to:{
                a:below?this.def.below.alpha:1
            }
        })
    }
    override on_destroy(): void {
        this.container.destroy()
        if(this.emitter_1)this.emitter_1.destroyed=true
    }
    update_frame(){
        if(this.def.assets?.frame?.transform)this.sprite.transform_frame(this.def.assets.frame.transform)

        if(this.health_data.dead){
            if(this.assets_data.frame.dead)this.sprite.frame=this.game.resources.get_frame(this.assets_data.frame.dead)
            this.container.zIndex=this.def.zIndex?.dead===undefined?zIndexes.DeadObstacles:this.def.zIndex?.dead
            if(this.emitter_1)this.emitter_1.enabled=false
            this.physical_data.no_bullets_collision=true

            for(const spr of this.aditional_sprite){
                spr.visible=false
            }
        }else{
            this.sprite.frame=this.game.resources.get_frame(this.assets_data.frame.base)
            this.container.zIndex=this.def.zIndex?.base===undefined?zIndexes.Obstacles1:this.def.zIndex?.base

            this.physical_data.no_bullets_collision=this.def.no_bullets_collision??false
            this.physical_data.no_collision=this.def.no_collision??false
            for(const spr of this.aditional_sprite){
                spr.visible=true
            }
        }

        this.container.visible=true

        const tid=this.def.assets?.frame?.tint_variations
        if(tid){
            this.sprite.tint=ColorM.number(tid[Numeric.clamp(this.variation-1,0,tid.length)])
        }
    }
    die(){
        if(this.health_data.dead)return
        this.health_data.dead=true
        const ac=random.int(8,13)
        if(this.game.save.get_variable("sv_graphics_particles")>=GraphicsDConfig.Normal){
            for(let i=0;i<ac;i++){
                this._add_own_particle(this.hitbox.randomPoint(),2)
            }
        }
        if(this.assets_data.sounds.break){
            this.game.sounds.play(this.assets_data.sounds.break,{
                position:this.position,
                max_distance:15,
                bus:"obstacles"
            })
        }
        this.update_frame()
    }
    override render(camera: Camera2D, _dt: number): void {}
    update(_dt:number): void {}
    set_definition(def:ObstacleDef){
        if(this.def)return
        this.def=def
        this.assets_data.frame={
            base:GetObstacleBaseFrame(this.def,this.variation,this.skin),
        }
        this.assets_data.frame.dead=this.def.assets?.frame?.dead??this.def.idString+"_dead"
        if(this.def.assets?.sounds)this.set_hit_sounds_def(this.def.assets!.sounds!)
        if(this.def.assets?.particles)this.set_hit_particles_def(this.def.idString,this.variation-1,this.def.assets.particles)
        if(this.def.onDestroyExplosion){
            if(!this.emitter_1){
                this.emitter_1=this.game.particles.add_emiter({
                    delay:0.4,
                    particle:()=>new ABParticle2D({
                        frame:{
                            hotspot:v2.half_one,
                            image:"gas_smoke_particle",
                        },
                        zIndex:zIndexes.Particles,
                        layer:this.layer,
                        position:this.position,
                        angle:0,
                        scale:0,
                        speed:random.float(0.5,0.7),
                        direction:random.float(-1.4,-1.7),
                        life_time:random.float(2,4),
                        tint:ColorM.rgba(255,255,255,150),
                        to:{scale:random.float(0.7,1.2),tint:ColorM.rgba(255,255,255,0)}
                    }),
                    enabled:this.health_data.health<=0.4&&!this.health_data.dead,
                })
            }
        }
        this.physical_data.reflect_bullets=this.def.reflect_bullets??false
        if(this.def.expanded_behavior){
            switch(this.def.expanded_behavior.type){
                case 3:
                    this.transform_into_data={
                        activated:false
                    }
                    break
            }
        }
        for(const d of this.def.assets?.aditional_sprites??[]){
            const s=new Sprite2D()
            s.set_frame(d,this.game.resources)
            this.container.add_child(s)
            this.aditional_sprite.push(s)
        }
        this.physical_data.passable_by_bullets=this.def.passable_by_bullets??false
    }

    override set_hit_sounds_def(sounds: HitSoundsDef): void {
        this.assets_data.sounds={
            break:sounds.break?this.game.resources.get_sound(sounds.break):undefined,
            hit:[]
        }
        super.set_hit_sounds_def(sounds)
    }
    initialize_hitboxes(){
        if(this.def.hitbox)this.physical_data.hitbox=this.def.hitbox.transform(undefined,undefined,undefined,this.physical_data.side)
        this.base_hitbox=this.physical_data.hitbox
        if(this.def.expanded_behavior){
            switch(this.def.expanded_behavior.type){
                case 0:
                    this.door_data={
                        hitboxes:CalculateDoorHitbox(this.physical_data.hitbox,this.def.expanded_behavior),
                        locked:false,
                        open:0,
                        opening:false,
                    }
            }
        }
        if(this.def.below?.hitbox){
            this.below_hitbox=this.def.below.hitbox.transform(this.position,this.physical_data.scale)
        }
    }
    transform_into_update(def:number){
        if(this.transform_into_data?.activated)return
        this.transform_into_data!.activated=true

        if((this.def.expanded_behavior as ObstacleBehaviorTransformInto).sound)this.game.sounds.play(this.game.resources.get_sound((this.def.expanded_behavior as ObstacleBehaviorTransformInto).sound!),{
            max_distance:30,
            bus:"obstacles"
        })
        for(const p of (this.def.expanded_behavior as ObstacleBehaviorTransformInto).particles??[]){
            this.game.add_timeout(()=>{
                for(let c=0;c<p.count;c++){
                    this.game.particles.add_particle(new ABParticle2D({
                        frame:{layer:this.layer,...p.frame},
                        position:this.position,
                        speed:random.float(1,2),
                        angle:this.physical_data.rotation,
                        direction:random.rad(),
                        life_time:2,
                        zIndex:zIndexes.Particles,
                        to:{
                            speed:random.float(0.1,1),
                            angle:this.physical_data.rotation+random.rad(),
                        }
                    }))
                }
            },p.delay)
        }
        if((this.def.expanded_behavior as ObstacleBehaviorTransformInto).sprites&&(this.def.expanded_behavior as ObstacleBehaviorTransformInto).sprites![def]){
            this.sprite.set_frame((this.def.expanded_behavior as ObstacleBehaviorTransformInto).sprites![def],this.game.resources)
        }
    }
    update_door(ne:number,force:boolean=false){
        const old=this.door_data!.open
        if(ne!==old){
            this.door_data!.open=ne as -1|0|1
            if(this.door_data!.tween)this.door_data!.tween.kill()
            let new_rot=this.physical_data.rotation
            if(ne===1)new_rot-=(Math.PI/2)
            if(ne===-1)new_rot+=(Math.PI/2)
            this.physical_data.hitbox=this.door_data!.hitboxes[this.door_data!.open]
            if(force){
                this.container.rotation=new_rot
            }else{
                if(ne===0&&(this.def.expanded_behavior as ObstacleBehaviorDoor).close_sound){
                    this.game.sounds.play(this.game.resources.get_sound((this.def.expanded_behavior as ObstacleBehaviorDoor).close_sound!),{
                        max_distance:30,
                        bus:"obstacles"
                    })
                }else if((this.def.expanded_behavior as ObstacleBehaviorDoor).open_sound){
                    this.game.sounds.play(this.game.resources.get_sound((this.def.expanded_behavior as ObstacleBehaviorDoor).open_sound!),{
                        max_distance:30,
                        bus:"obstacles"
                    })
                }
                this.door_data!.tween=this.game.add_tween({
                    duration:(this.def.expanded_behavior as ObstacleBehaviorDoor).open_duration,
                    target:this.container,
                    to:{rotation:new_rot},
                    onComplete:()=>{
                        this.door_data!.tween=undefined
                    }
                })
            }
        }
    }
    override interact(h:Human){
        if(this.def.expanded_behavior){
            if(this.def.expanded_behavior.type==1){
                if(this.interacted)return
                this.interacted=true
                this.game.sounds.play(this.game.resources.get_sound(this.def.expanded_behavior.click_sound),{
                    position:this.position,
                })
                this.game.add_timeout(()=>{
                    this.game.sounds.play(this.game.resources.get_sound("menu_music"),{
                        position:this.position,
                    })
                },this.def.expanded_behavior.delay)
            }
        }
    }
    override get_interact_hint(h:Human){
        if (this.def.interactDestroy) {
            return h.game.language.get("interact.obstacles.break", {})
        }
        if(this.def.expanded_behavior){
            switch(this.def.expanded_behavior.type){
                case 0:
                    return h.game.language.get("interact.obstacles.door."+(this.door_data?.open?"open":"close"),{
                        obstacle:(h.game.language.get("obstacles."+this.def.idString))
                    })
                case 1:
                    return h.game.language.get("interact.obstacles.playaudio",{
                        obstacle:(h.game.language.get("obstacles."+this.def.idString))
                    })
                case 2:
                    return h.game.language.get("interact.obstacles.scalable",{})
                case 3:
                    return h.game.language.get("interact.obstacles.transform-into."+this.def.idString,{
                        obstacle:(h.game.language.get("obstacles."+this.def.idString))
                    })
            }
        }
        return ""
    }
    override can_interact(h:Human): boolean {
        return !this.health_data.dead&&this.hitbox.colliding_with(h.hitbox)&&(this.def.interactDestroy===true||this.def.expanded_behavior!==undefined)
    }
    override auto_interact(h:Human): boolean {
        return (this.def.interactDestroy===true)
    }

    override decode(stream: NetStream, full: boolean): void {
        const [
            visual,
            physical_data,physical_data_part,
            health_data,
            dead,

            door_dirty,
            transform_into_active
        ]=stream.readBooleanGroup()
        if(visual||full){
            this.variation=stream.readUint8()
            this.skin=stream.readUint8()
        }
        if(full){
            const id=stream.readUint16()
            this.set_definition(this.game.definitions.obstacles.getFromNumber(id))
            this.update_frame()
        }
        if(physical_data_part||physical_data||full){
            this.physical_data.scale=stream.readFloat(0,10,2)

            if(full||physical_data){
                this.position=stream.readPos2()
                this.physical_data.rotation=stream.readRad()
                this.physical_data.side=stream.readUint8()

                this.initialize_hitboxes()
                if(Debug.hitbox){
                    this.game.hitboxes_gfx.fill_color(ColorM.hex("#f007"))
                    this.game.hitboxes_gfx.drawModel(model2d.hitbox(this.hitbox))
                }
            }

            
            this.base_hitbox=this.physical_data.hitbox.transform(undefined,this.physical_data.scale)
            this.container.scale.x=this.physical_data.scale
            this.container.scale.y=this.physical_data.scale

            this.container.rotation=this.physical_data.rotation
            this.container.position=this.position
        }
        if(health_data||full){
            this.health_data.health=stream.readFloat(0,1,1)

            if(dead){
                this.die()
            }else if(!dead&&this.health_data.dead){
                this.health_data.dead=false
                this.update_frame()
            }else if(!this.health_data.dead){
                if(this.emitter_1&&this.health_data.health<=0.5){
                    this.emitter_1.enabled=true
                }
            }
        }

        if(door_dirty){
            this.update_door(stream.readInt8(),full)
        }
        if(this.transform_into_data){
            if(this.transform_into_data.activated&&!transform_into_active){
                this.transform_into_data.activated=false
            }else if(transform_into_active){
                this.transform_into_update(stream.readUint8())
            }
        }
    }
}