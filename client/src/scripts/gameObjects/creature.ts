
import { CenterHotspot, Container2D, NetStream, Numeric, Sprite2D, v2m, Vec2 } from "common/engine/client.ts";
import { zIndexes } from "common/scripts/others/constants.ts"
import { CreatureDef, Creatures } from "common/scripts/definitions/objects/creatures.ts"
import { GameObject } from "../others/gameObject.ts"
export class Creature extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="creature"
    number_type: number=10
    def!:CreatureDef

    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    container:Container2D=new Container2D()
    main_sprite:Sprite2D=new Sprite2D()
    dest_pos?:Vec2
    dest_rot?:number

    ////////////////////////////
    // State                  //
    ////////////////////////////
    state:number=0
    dead:boolean=false

    constructor(){
        super()
        this.main_sprite.hotspot=CenterHotspot
        this.main_sprite.zIndex=2

        this.container.zIndex=zIndexes.Creatures
        this.container.add_child(this.main_sprite)
    }

    set_definition(def:CreatureDef){
        if(this.def)return
        this.def=def
        this.main_sprite.set_frame(def.frame.main,this.game.resources)
    }
    // deno-lint-ignore no-explicit-any
    create(_args: any): void {
        this.game.cam2d.addObject(this.container)
    }
    update(_dt:number): void {
        if(this.dest_pos){
            v2m.lerp(this.position,this.dest_pos,this.game.inter_global)
            this.container.rotation=Numeric.lerp_rad(this.container.rotation,this.dest_rot!,this.game.inter_global)
        }
        this.container.position=this.position
        this.manager.cells.updateObject(this)
    }
    override on_destroy(): void {
        this.container.destroy()
    }
    override decode(stream: NetStream, full: boolean): void {
        const pos=stream.readPos2()
        const rot=stream.readRad()

        if(this.game.save.get_variable("sv_game_interpolation")&&!full){
            this.dest_pos=pos
            this.dest_rot=rot
        }else{
            this.position=pos
            this.container.rotation=rot
        }

        this.state=stream.readUint8()

        if(full){
            const [dead]=stream.readBooleanGroup()
            this.set_definition(Creatures.getFromNumber(stream.readUint16()))
            if(dead){
                this.kill()
            }
        }
    }
    kill(){
        if(this.dead)return
        this.dead=true
        this.container.zIndex=zIndexes.DeadCreatures
    }
}