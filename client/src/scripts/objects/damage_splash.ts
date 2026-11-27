import { ease, random, Stream, Tween, v2, Vec2 } from "common/engine/core.ts";
import { GameObject } from "../main/gel.ts";
import { Sprite2D } from "common/engine/web.ts";
import { zIndexes } from "common/scripts/others/constants.ts";

export class DamageSplash extends GameObject{
    count?:number

    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    sprite:Sprite2D

    ////////////////////////////
    // State                 //
    ////////////////////////////
    dying:boolean=false
    can_die:boolean=true
    tween?:Tween<Sprite2D>
    lifetime:number=3
    constructor(){
        super()
        this.sprite=new Sprite2D()

        this.sprite.hotspot=v2.half_one
        this.sprite.scale.x=0
        this.sprite.scale.y=0

        this.sprite.zIndex=zIndexes.DamageSplashs

        this.allow_tick=true
    }
    async _start(args: {critical:boolean,shield:boolean,position:Vec2,count:number}): Promise<void> {
        const color = args.shield
            ? (args.critical ? "#114e" : "#0f9e")
            : (args.critical ? this.app.get_theme_color("special") : this.app.get_theme_color("tertiary"))

        this.sprite.frame = await this.app.resources.render_text(`${args.count}`, 50, color,"Russo-One")
        this.position = args.position
        this.lifetime += Math.random()

        this.sprite.position=this.position
        this.sprite.scale.x = 0
        this.sprite.scale.y = 0
        this.sprite.rotation=-0.1
        this.sprite.layer=this.layer

        const s=((random.float(1.5,2)/this.scene.camera.zoom)*(args.critical?1.5:1))
        this.app.clock.add_tween({
            duration: 2,
            target: this.sprite.scale,
            to: v2.random(s,s),
            ease:ease.elasticOut
        })

        this.app.clock.add_tween({
            duration: 0.6,
            target: this.sprite.position,
            to: v2.add(this.sprite.position, v2.scale(v2.random2(v2(-0.2,-0.5),v2(0.2,-0.7)),(args.critical?1.2:1)/this.scene.camera.zoom)),
            onComplete:()=>{
                this.tween=this.app.clock.add_tween({
                    duration: args.critical?0.2:0.4,
                    target: this.sprite,
                    to: {rotation:0.1},
                    yoyo:true,
                    ease:ease.quadraticInOut,
                    infinite:true
                })
            }
        })
        
        this.scene.camera.add_object(this.sprite)
    }
    on_layer_set(): void {
        this.sprite.layer=this.layer
    }
    override destroy(): void {
        this.sprite.frame?.free()
        this.sprite.destroy()
        if(this.tween)this.tween.kill()
    }
    on_tick(dt:number): void {
        this.lifetime-=dt
        if(this.lifetime<=0){
            this.dying=true
        }
        if(this.dying&&this.can_die){
            this.can_die=false
            // deno-lint-ignore no-this-alias
            const This=this
            this.app.clock.add_tween({
                duration:1,
                target:this.sprite.scale,
                to:{x:0,y:0},
                onComplete(){
                    This.destroy()
                }
            })
        }
    }
    on_decode_net(stream:Stream){
        const [critical,shield]=stream.read_boolean_group()
        const position=stream.read_pos2()
        const count=stream.read_uint16()
        this._start({critical,shield,count,position})
    }
}