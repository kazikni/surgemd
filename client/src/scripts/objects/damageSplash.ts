import { ease, random, Sound, Sprite2D, v2 } from "common/engine/client.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { DamageSplash } from "common/scripts/packets/update_packet.ts";
import { GameObject } from "../others/gameObject.ts";
import { type Human } from "./human.ts";
export class DamageSplashOBJ extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="damage_splash"
    number_type: number=89

    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    sprite:Sprite2D

    ////////////////////////////
    // Assets                 //
    ////////////////////////////
    sounds?:{
        break?:Sound
        hit?:Sound[]
    }

    ////////////////////////////
    // State                 //
    ////////////////////////////
    dying:boolean=false
    can_die:boolean=true
    lifetime:number=3

    constructor(){
        super()
        this.sprite=new Sprite2D()

        this.sprite.hotspot=v2.half_one
        this.sprite.scale.x=0
        this.sprite.scale.y=0

        this.sprite.zIndex=zIndexes.DamageSplashs
    }
    override async on_create(args: DamageSplash): Promise<void> {
        const color = args.shield
            ? (args.critical ? "#114e" : "#0f9e")
            : (args.critical ? this.game.save.get_variable("sv_ui_special_color") : this.game.save.get_variable("sv_ui_tertiary_color"))

        
        const human = this.manager.get_object(args.taker) as Human|undefined
        if(human&&args.shield_break){
            human.broke_shield()
        }

        this.sprite.frame = await this.game.resources.render_text(`${args.count}`, 50, color)
        this.position = args.position
        this.lifetime += Math.random()

        this.sprite.position = this.position
        this.sprite.scale.x = 0
        this.sprite.scale.y = 0
        this.sprite.rotation=-0.1
        this.sprite.layer=this.layer

        const s=(random.float(1,1.3)+(args.critical?0.7:0))/this.game.cam2d.zoom
        this.game.add_tween({
            duration: 1,
            target: this.sprite.scale,
            to: v2.random(s,s),
            ease:ease.cubicOut
        })

        
        this.game.add_tween({
            duration: 0.4,
            target: this.sprite.position,
            to: v2.add(this.sprite.position, v2.dscale(v2.random2(v2(-0.2,-0.5),v2(0.3,-0.7)),this.game.cam2d.zoom*(args.critical?0.6:0.8))),
        })
        this.game.add_tween({
            duration: args.critical?0.1:0.3,
            target: this.sprite,
            to: {rotation:0.1},
            yoyo:true,
            ease:ease.quadraticInOut,
            infinite:true
        })
        
        this.game.cam2d.addObject(this.sprite)
    }
    override on_layer_set(): void {
        this.sprite.layer=this.layer
    }
    override on_destroy(): void {
        this.sprite.frame?.free()
        this.sprite.destroy()
    }
    override on_tick(dt:number): void {
        this.lifetime-=dt
        if(this.lifetime<=0){
            this.dying=true
        }
        if(this.dying&&this.can_die){
            this.can_die=false
            // deno-lint-ignore no-this-alias
            const This=this
            this.game.add_tween({
                duration:1,
                target:this.sprite.scale,
                to:{x:0,y:0},
                onComplete(){
                    This.destroy()
                }
            })
        }
    }
}