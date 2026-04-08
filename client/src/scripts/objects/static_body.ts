import { ABParticle2D, Color, NetStream, random, Sound, Vec2 } from "common/engine/client.ts"
import { GameObject } from "../others/gameObject.ts"
import { GameObjectType, zIndexes } from "common/scripts/others/constants.ts"
import { GraphicsDConfig } from "../others/config.ts";

export interface StaticBodyAssetData{
    particles_tint?:Color
    frame:{
        particles:string[],
    }
    sounds:{
        hit:Sound[]
    }
}
export abstract class StaticBody extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="static_body"
    number_type: number=GameObjectType.StaticBody

    physical_data:{
        no_bullet_collision:boolean
        no_collision:boolean
        scale:number
        side:number
        rotation:number
    }={
        no_collision:false,
        no_bullet_collision:false,
        scale:1,
        side:0,
        rotation:0,
    }

    abstract assets_data:StaticBodyAssetData
    _add_own_particle(position:Vec2,force:number=1,small:boolean=false){
        if(!this.assets_data.frame.particles)return
        const p=new ABParticle2D({
            frame:{
                image:random.choose(this.assets_data.frame.particles)
            },

            position,
            speed:random.float(1,2)*force,
            angle:random.rad(),
            direction:random.rad(),
            life_time:random.float(1,2),
            zIndex:zIndexes.Particles,
            scale:small?random.float(0.2,0.5):random.float(0.5,1),

            tint:this.assets_data.particles_tint,
            to:{
                speed:random.float(0.1,1),
                angle:random.rad(),
            }
        })
        this.game.particles.add_particle(p)
    }
    on_hitted(position:Vec2,critical:boolean){
        if(this.game.save.get_variable("sv_graphics_particles")>=GraphicsDConfig.Normal)this._add_own_particle(position,undefined,true)
        if(this.assets_data.sounds&&this.assets_data.sounds.hit&&this.assets_data.sounds.hit.length>0){
            this.game.sounds.play(random.choose(this.assets_data.sounds.hit),{
                position:this.position,
                max_distance:12,
            },"obstacles")
        }
    }

    // deno-lint-ignore no-explicit-any
    create(_args: Record<string,any>): void {
        this.updatable=false
    }

    override on_destroy(): void {
    }
    constructor(){
        super()
    }
    decode_physical_data(stream:NetStream,full: boolean):void{
        this.physical_data.scale=stream.readFloat(0,10,2)
        if(full){
            this.position=stream.readPos2()
            this.physical_data.rotation=stream.readRad()
            this.physical_data.side=stream.readUint8()
            this.manager.cells.updateObject(this)
        }
    }
}