import { Container2D, Sprite2D } from "../engine/container_2d.ts";
import { VehicleDef, Vehicles } from "common/scripts/definitions/objects/vehicles.ts";
import { v2, v2m, Vec2 } from "common/scripts/engine/geometry.ts";
import { zIndexes } from "common/scripts/others/constants.ts";
import { CircleHitbox2D, NetStream, Numeric } from "common/scripts/engine/mod.ts";
import { GameObject } from "../others/gameObject.ts";
import { CenterHotspot } from "../engine/utils.ts";
export class Vehicle extends GameObject{
    stringType:string="vehicle"
    numberType: number=9

    container:Container2D=new Container2D()
    def?:VehicleDef

    main_sprite:Sprite2D=new Sprite2D()
    movable_wheels:Sprite2D[]=[]

    create(args: {}): void {
        this.game.camera.addObject(this.container)
    }


    override on_destroy(): void {
        this.container.destroy()
    }
    update(dt:number): void {
        if(this.dest_pos){
            //this.position=v2.lerp(this.position,this.dest_pos,this.game.inter_global)
            v2m.lerp(this.container.position,this.dest_pos,this.game.inter_global)
            this.container.rotation=Numeric.lerp_rad(this.container.rotation,this.dest_rot!,this.game.inter_global)
            this.manager.cells.updateObject(this)
        }
        this.dir=Numeric.lerp_rad(this.dir,this.dest_dir,1/(1+dt*1000))
        for(const w of this.movable_wheels){
            w.rotation=this.dir
        }
    }
    set_def(def:VehicleDef){
        if(this.def)return
        this.base_hitbox=new CircleHitbox2D(v2.new(0,0),2)
        this.def=def
        this.main_sprite.frame=def.frame.base?this.game.resources.get_sprite(def.frame.base):this.game.resources.get_sprite(def.idString)
        if(def.frame.base_scale){
            this.main_sprite.scale=v2.new(def.frame.base_scale,def.frame.base_scale)
        }
        if(def.frame.zindex)this.container.zIndex=def.frame.zindex
        const hotspot=CenterHotspot
        for(const w of def.wheels.defs){
            const spr=new Sprite2D()
            spr.frame=this.game.resources.get_sprite("wheel")
            spr.position=v2.duplicate(w.position)
            spr.hotspot=hotspot
            spr.zIndex=1
            spr.scale=v2.new(w.scale,w.scale)
            if(w.movable){
                this.movable_wheels.push(spr)
            }
            this.container.add_child(spr)
        }
        this.container.updateZIndex()
    }
    constructor(){
        super()
        this.container.add_child(this.main_sprite)
        this.container.zIndex=zIndexes.Vehicles
        this.main_sprite.hotspot=CenterHotspot
        this.main_sprite.zIndex=2
    }
    dir:number=0
    dest_dir:number=0

    dest_rot?:number
    dest_pos?:Vec2
    override decode(stream: NetStream, full: boolean): void {
        if(this.game.save.get_variable("cv_game_interpolation")&&!full){
            this.dest_pos=stream.readPosition()
            this.dest_rot=stream.readRad()
        }else{
            this.position=stream.readPosition()
            this.container.rotation=stream.readRad()
            this.container.position=this.position
            this.manager.cells.updateObject(this)
        }
        if(full){
            this.set_def(Vehicles.getFromNumber(stream.readUint8()))
        }
    }
}