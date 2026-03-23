import { Hitbox2D, HitboxGroup2D } from "../../core/math/hitbox.ts";
import { type ResourcesManager } from "../resources/resources.ts";
import { type CamA, Container2DObject } from "./base.ts";
import { Sprite2D } from "./sprite.ts";

export class Container2D extends Container2DObject{
    object_type:string="container2d"
    children:Container2DObject[]=[]

    dirty_zindex:boolean=true
    update_children:Container2DObject[]=[]
    visible_children:Container2DObject[]=[]
    override has_update: boolean=true

    _hitbox:HitboxGroup2D=new HitboxGroup2D()

    object_group:boolean=false

    update_visibility(){
        this.visible_children = this.children.filter(c => c._visible)
    }
    update_zindex(){
        this.children.sort((a,b)=>
            a.layer - b.layer ||
            a.zIndex - b.zIndex ||
            a.id_on_parent - b.id_on_parent
        )

        this.update_children = this.children.filter(c => c.has_update)
        this.update_visibility()
    }
    override update(dt:number,resources:ResourcesManager){
        super.update(dt,resources);
        for (const c of this.update_children) c.update(dt,resources);
    }
    override update_real(): void {
        super.update_real()

        this._hitbox.hitboxes.length=0
        for (const c of this.children){
            c.update_real()

            const hb=c.get_hitbox()
            if(hb)this._hitbox.hitboxes.push(hb)
        }
    }
    draw(cam:CamA,objects?:Container2DObject[]):void{
        this.draw_super()
        if(this.dirty_zindex){
            this.update_zindex()
            this.dirty_zindex=false
        }
        if (!objects) objects = this.visible_children

        for (let o = 0; o < objects.length; o++) {
            const c = objects[o]
            if (!c.visible)continue

            const hb = c.get_hitbox()
            if (hb!==undefined&&!hb.collidingWith(cam.hitbox))continue

            c.draw(cam)
        }
    }
    add_child(c:Container2DObject){
        c.id_on_parent=this.children.length+1
        c.parent=this
        this.children.push(c)
        if(c.has_update){
            this.update_children.push(c)
        }
        if(c._visible){
            this.visible_children.push(c)
        }

        c.update_real()
        this.dirty_zindex=true
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
    override get_hitbox(): Hitbox2D | undefined {
        return this._hitbox
    }
    constructor(){
        super()
    }
}