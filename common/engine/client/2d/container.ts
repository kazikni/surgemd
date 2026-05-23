import { Rect } from "../../core/math/geometry.ts";
import { v2 } from "../mod.ts";
import { type ResourcesManager } from "../resources/resources.ts";
import { type CamA, Container2DObject } from "./base.ts";
import { Sprite2D } from "./sprite.ts";

export class Container2D extends Container2DObject{
    object_type:string="container2d"
    children:Container2DObject[]=[]

    dirty_zindex:boolean=true
    dirty_children:boolean=true
    update_children:Container2DObject[]=[]
    visible_children:Container2DObject[]=[]
    override _has_update: boolean=true

    _rect:Rect={
        min:v2.new(0,0),
        max:v2.new(0,0),
    }

    object_group:boolean=false

    update_visibility(cama:CamA){
        this.visible_children.length = 0;
        this.update_children.length = 0;
        for (let i = 0; i < this.children.length; i++) {
            if(this.children[i].visible&&(!cama.visible_function||cama.visible_function(this.children[i]))) {
                this.visible_children.push(this.children[i]);
            }
            if(this.children[i].has_update) {
                this.update_children.push(this.children[i]);
            }
        }
    }
    update_zindex(cama:CamA){
        this.children.sort(cama.sort_function)
        this.dirty_children=true
    }
    override update(dt:number,resources:ResourcesManager){
        super.update(dt,resources);
        for (const c of this.update_children)c.update(dt,resources);
    }
    override update_real(): void {
        super.update_real()

        for (let i = 0; i < this.children.length; i++) {
            const c = this.children[i]
            c.update_real()
            c.dirty_reals = false

            const r = c.get_rect()

            if(r.min.x<this._rect.min.x)this._rect.min.x=r.min.x
            if(r.min.y<this._rect.min.y)this._rect.min.y=r.min.y
            if(r.max.x>this._rect.max.x)this._rect.max.x=r.max.x
            if(r.max.y>this._rect.max.y)this._rect.max.y=r.max.y
        }
    }
    draw(cam:CamA):void{
        this.draw_super()
        if(this.dirty_zindex){
            this.update_zindex(cam)
            this.dirty_zindex=false
        }
        if(this.dirty_children){
            this.update_visibility(cam)
            this.dirty_children=false
        }

        for (let o = 0; o < this.visible_children.length; o++) {
            const c=this.visible_children[o]
            const rect=c.get_rect()
            if(rect.max.x>=cam.rect.min.x&&rect.min.x<=cam.rect.max.x&&rect.max.y>=cam.rect.min.y&&rect.min.y<=cam.rect.max.y)c.draw(cam)
        }
    }
    add_child(c:Container2DObject){
        if(c.parent)return

        if(c instanceof Container2D){
            c.dirty_zindex=true
            c.dirty_children=true
            c.dirty_reals=true
        }

        c.id_on_parent=this.children.length+1
        c.parent=this
        this.children.push(c)
        if(c.has_update){
            this.update_children.push(c)
        }
        if(c.visible){
            this.visible_children.push(c)
        }
        this.dirty_zindex=true
        this.dirty_reals=true
    }
    add_container():Container2D{
        const container=new Container2D()
        this.add_child(container)
        return container
    }

    create_sprite():Sprite2D{
        const s=new Sprite2D()
        this.add_child(s)
        return s
    }
    create_container():Container2D{
        const s=new Container2D()
        this.add_child(s)
        return s
    }
    override get_rect(): Rect {
        return this._rect
    }
    constructor(){
        super()
    }
}