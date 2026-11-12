import { ColorM, gel_events, GELComponent, random, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Sprite2D } from "common/engine/web.ts";
import { bullet_events, c_bullet, type C_Bullet, si_bullet, type SI_Bullet } from "common/scripts/game/objects/projectile/bullet.ts";
import { projectile_events } from "common/scripts/game/objects/projectile/projectile.ts";
import { type C_StaticBody } from "common/scripts/game/objects/static_body/static_body.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../../main/gel.ts";

export type BulletHitVisual=GameObject&{
    dead?:boolean
    on_hitted?(position:Vec2,critical?:boolean,sound?:string,reflected?:boolean,weight?:number):void
}

export type CC_Bullet=GameObject&C_Bullet&{
    sprite_trail:Sprite2D
    max_length:number
    trail_time:number
    visual_ready:boolean
    whiz:boolean

    setup_visual():void
    tick_trail(dt:number):void
    tick_whiz():void
    finish():void
}

export const cc_bullet:GELComponent<CC_Bullet>={
    id_string:"cc_bullet",
    extensions:[c_bullet],
    events:{
        [gel_events.bind](){
            this.allow_tick=true
            this.max_length=0.3
            this.trail_time=0
            this.visual_ready=false
            this.whiz=false

            this.sprite_trail=new Sprite2D()
            this.sprite_trail.hotspot=v2(1,0.5)
            this.sprite_trail.visible=false
            this.sprite_trail.zIndex=zIndexes.Bullets
        },
        [gel_events.create](){
            this.sprite_trail.frame=this.app.resources.get_frame("base_trail")
            this.sprite_trail.size=v2(200,17)
            this.scene.camera.add_object(this.sprite_trail)
        },
        [gel_events.layer_set](){
            this.sprite_trail.layer=this.layer
        },
        [gel_events.destroy](){
            this.sprite_trail.destroy()
        },
        [bullet_events.hit_visual](obj:BulletHitVisual,position:Vec2,reflected:boolean){
            obj.on_hitted?.(position,this.critical,undefined,reflected,this.weight)
        },
    },
    methods:{
        setup_visual(){
            this.visual_ready=true
            this.sprite_trail.rotation=this.angle
            this.max_length=this.tracer_width
            this.sprite_trail.scale.y=this.tracer_height
            const col=ColorM.number(this.tracer_color)
            col.a=this.tracer_alpha
            this.sprite_trail.tint=col
            this.sprite_trail.visible=true
            this.sprite_trail.position=this.position
        },
        tick_trail(dt:number){
            if(this.finished){
                this.trail_time-=dt
                if(this.trail_time<=0){
                    this.destroy()
                    return
                }
            }else if(this.sprite_trail.scale.x<this.max_length){
                this.trail_time+=dt
            }
            this.sprite_trail.position=this.position
            const traveled=v2.distance(this.initial_position,this.position)
            this.sprite_trail.scale.x=Math.min(Math.min(this.speed*this.trail_time,traveled),this.max_length)
        },
        tick_whiz(){
            if(this.whiz||this.finished)return
            const active=(this.scene as {active_id?:number}).active_id
            if(this.owner_id===active&&!this.hit_owner)return
            if(v2.distance(this.position,this.scene.camera.position)>=7)return
            this.whiz=true
            this.app.sounds.play(this.app.resources.get_sound("bullet_whiz_"+random.int(1,3)),{
                position:v2.clone(this.position),
                max_distance:20,
                volume:0.6,
                bus:"objects",
            })
        },
        finish(){
            if(this.finished)return
            this.finished=true
            this.velocity.x=0
            this.velocity.y=0
            this.emit_event(projectile_events.finish)
        },
    },
}

export const ccs_bullet:GELComponent<CC_Bullet&SI_Bullet>={
    id_string:"ccs_bullet",
    extensions:[si_bullet,cc_bullet],
    events:{
        [gel_events.tick](dt:number){
            if(!this.visual_ready)this.setup_visual()
            this.tick_whiz()
            this.tick_trail(dt)
        },
    },
}

export const ccn_bullet:GELComponent<CC_Bullet>={
    id_string:"ccn_bullet",
    extensions:[cc_bullet],
    events:{
        [gel_events.net_decode](stream:Stream,full:boolean){
            this.decode_bullet(stream,full)
            if(full){
                this.trail_time=this.tticks
                this.setup_visual()
            }
        },
        [gel_events.tick](dt:number){
            if(!this.visual_ready)return
            if(!this.finished){
                if(v2.distance(this.initial_position,this.position)>this.max_distance){
                    this.finish()
                }else{
                    this.old_position=v2.clone(this.position)
                    v2m.add_component(this._position,this.velocity.x*dt,this.velocity.y*dt)
                    this.tick_whiz()
                    const objs:GameObject[]=this.manager.cells.get_objects(this.collider,this.layer)
                    for(const obj of objs){
                        if(this.finished)break
                        if(obj.id===this.id||this.collided_with.has(obj.id))continue
                        if(obj.__components.has("c_human")){
                            const h=obj as BulletHitVisual
                            if(h.dead||(obj.id===this.owner_id&&!this.hit_owner))continue
                            const col=obj.collider.overlap_line(this.old_position,this.position)
                            if(!col)continue
                            this.collided_with.add(obj.id)
                            this.emit_event(bullet_events.hit_visual,obj,v2.clone(col.point),false)
                            if(!(this.pass_through_humans||this.pass_through_everthing))this.finish()
                        }else if(obj.__components.has("c_static_body")){
                            const sb=obj as GameObject&C_StaticBody
                            if(sb.physical.no_projectiles_collision)continue
                            const col=obj.collider.overlap_line(this.old_position,this.position)
                            if(!col)continue
                            this.collided_with.add(obj.id)
                            this.emit_event(bullet_events.hit_visual,obj,v2.clone(col.point),false)
                            if(!(sb.physical.passable_by_projectiles||this.pass_through_everthing))this.finish()
                        }
                    }
                }
            }
            this.tick_trail(dt)
        },
    },
}
