import { ABParticle2D, Camera2D, ClientParticle2D, ColorM, Container2D, NetStream, ParticlesEmitter2D, random, Sound, SoundInstance, SoundOptions, Sprite2D, v2 } from "common/engine/client.ts";
import { Materials, ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GraphicsDConfig } from "../others/config.ts";
import { StaticBody, StaticBodyAssetData } from "./static_body.ts";
import { Human } from "./human.ts";
export function GetObstacleBaseFrame(def:ObstacleDef,variation:number,skin:number):string{
    let spr=def.assets?.frame?.base??def.idString

    if(skin>0&&def.assets?.frame?.biome_skins){
        spr+=`_${def.assets.frame.biome_skins[skin-1]}`
    }
    if(def.assets?.frame?.variations){
        spr+=`_${variation}`
    }
    return spr
}
export class Obstacle extends StaticBody{
    override string_type:string="obstacle"
    override number_type: number=GameObjectType.Obstacle
    def!:ObstacleDef

    container:Container2D=new Container2D()
    sprite=new Sprite2D()

    health_data:{
        health:number,
        dead:boolean
    }={health:1,dead:true}
    variation=0
    skin=0

    interacted:boolean=false

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
            particles:[],
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

        this.sprite.hotspot=v2.new(.5,.5)
    }
    override on_layer_set(layer: number): void {
        this.container.layer=layer
    }
    // deno-lint-ignore no-explicit-any
    override create(_args: Record<string,any>): void {
        this.game.cam2d.addObject(this.container)
        this.updatable=false
    }
    override on_destroy(): void {
        this.container.destroy()
        if(this.emitter_1)this.emitter_1.destroyed=true
    }
    update_frame(){
        if(this.def.assets?.frame?.transform)this.sprite.transform_frame(this.def.assets.frame.transform)

        if(this.health_data.dead){
            if(this.assets_data.frame.dead)this.sprite.frame=this.game.resources.get_sprite(this.assets_data.frame.dead)
            this.container.zIndex=zIndexes.DeadObstacles
            if(this.emitter_1)this.emitter_1.destroyed=true

            this.physical_data.no_bullet_collision=true
        }else{
            this.sprite.frame=this.game.resources.get_sprite(this.assets_data.frame.base)
            this.container.zIndex=this.def.zIndex??zIndexes.Obstacles1
            this.physical_data.no_bullet_collision=false
        }
        this.container.visible=true
    }
    die(){
        if(this.health_data.dead)return
        this.health_data.dead=true
        
        if(this.emitter_1)this.emitter_1.enabled=false
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
            },"obstacles")
        }
        this.update_frame()

        this.physical_data.no_collision=true
        this.physical_data.no_bullet_collision=true
    }
    override render(camera: Camera2D, _dt: number): void {
        /*super.render(camera, _dt)
        if(this.def.world_shadow){
            camera.ctx.fill_style=this.game.world_shadow.color
            camera.ctx.fill_model(this.def.world_shadow.model,v2.add(this.position,this.game.world_shadow.offset),v2.scale(this.container.scale,this.game.world_shadow.radius),0)
        }*/
    }
    update(_dt:number): void {
        
    }
    set_definition(def:ObstacleDef){
        if(this.def)return
        if(def.hitbox)this.base_hitbox=def.hitbox.clone()

        this.def=def
        if(this.def.assets?.sounds){
            this.assets_data.sounds={
                break:this.game.resources.get_audio(this.def.assets.sounds.break),
                hit:[]
            }
            if(this.def.assets?.sounds.hit_variations){
                for(let i=1;i<=this.def.assets.sounds.hit_variations;i++){
                    this.assets_data.sounds.hit.push(this.game.resources.get_audio(this.def.assets.sounds.hit+`_${i}`))
                }
            }else{
                this.game.resources.get_audio(this.def.assets.sounds.hit)
            }
        }else if(this.def.material){
            const mat=Materials[this.def.material]
            this.assets_data.sounds={
                break:this.game.resources.get_audio(mat.sounds+"_break"),
                hit:[]
            }
            if(mat.hit_variations){
                for(let i=1;i<=mat.hit_variations;i++){
                    this.assets_data.sounds.hit!.push(this.game.resources.get_audio(mat.sounds+`_hit_${i}`))
                }
            }else{
                this.game.resources.get_audio(mat.sounds+"_hit")
            }
        }
        this.assets_data.frame={
            base:GetObstacleBaseFrame(this.def,this.variation,this.skin),
            particles:[]
        }

        this.assets_data.frame.dead=this.def.assets?.frame?.dead??this.def.idString+"_dead"
        this.assets_data.frame.particles.push((this.def.assets?.frame?.particle)??(this.def.idString+"_particle"))

        if(this.def.particles){
            if(this.def.particles.tint)this.assets_data.particles_tint=ColorM.number(this.def.particles.tint)

            if(this.def.particles.variations){
                const fn=this.assets_data.frame.particles[0]
                this.assets_data.frame.particles.length=0
                for(let i=0;i<this.def.particles.variations;i++){
                    this.assets_data.frame.particles.push(`${fn}_${i+1}`)
                }
            }
        }

        if(this.def.onDestroyExplosion&&this.game.save.get_variable("sv_graphics_particles")>=GraphicsDConfig.Advanced){
            if(!this.emitter_1){
                this.emitter_1=this.game.particles.add_emiter({
                    delay:0.5,
                    particle:()=>new ABParticle2D({
                        frame:{
                            image:"gas_smoke_particle"
                        },
                        position:this.position,
                        speed:random.float(0.5,0.7),
                        angle:0,
                        direction:random.float(-1.45,-1.65),
                        life_time:random.float(4,6),
                        zIndex:zIndexes.Particles,
                        scale:0,
                        tint:ColorM.hex("#fff5"),
                        to:{scale:random.float(0.7,1.2),tint:ColorM.hex("#fff0")}
                    }),
                    enabled:this.health_data.health<=0.4,
                })
            }
        }
        if(this.def.expanded_behavior&&this.def.hitbox){
            switch(this.def.expanded_behavior.type){
                case 0:
                    //this.doors_hitboxes=CalculateDoorHitbox(this.def.hitbox!.to_rect(),this.side,this.def.expanded_behavior as ObstacleBehaviorDoor)
            }
        }
    }
    override interact(h:Human){
        if(this.def.expanded_behavior){
            if(this.def.expanded_behavior.type==1){
                if(this.interacted)return
                this.interacted=true
                this.game.sounds.play(this.game.resources.get_audio(this.def.expanded_behavior.click_sound),{
                    position:this.position,
                })
                this.game.add_timeout(()=>{
                    this.game.sounds.play(this.game.resources.get_audio("menu_music"),{
                        position:this.position,
                    })
                },this.def.expanded_behavior.delay)
            }
        }
    }
    override get_interact_hint(h:Human){
        if (this.def.interactDestroy) {
            return h.game.language.get("interact-obstacle-break", {})
        }
        return h.game.language.get(
            "interact-obstacle-playaudio-" + this.id,
            {}
        )
    }
    override can_interact(h:Human): boolean {
        return !this.health_data.dead&&this.hitbox.collidingWith(h.hitbox)&&(this.def.interactDestroy===true||this.def.expanded_behavior!==undefined)
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
            this.decode_physical_data(stream,physical_data||full)

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
            }
            if(this.emitter_1&&this.health_data.health<=0.4){
                this.emitter_1.enabled=true
            }
        }
    }
}