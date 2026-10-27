import { Graphics2D } from "common/engine/web.ts";
import { GameObject } from "../others/gameObject.ts";
import { DefaultGELvents, ObjectComponent } from "common/engine/core.ts";

export interface GraphicInsVisual_CData{
    sprite:Graphics2D
}

export const c_graphicins_visual:ObjectComponent<GraphicInsVisual_CData&GameObject>={
    number_name:2,
    string_name:"graphicins_visual",
    events:{
        [DefaultGELvents.bind]:[
            (obj)=>{
                //obj.allow_tick=true
                obj.sprite=new Graphics2D()
            }
        ],
        [DefaultGELvents.update_hitbox]:[
            (obj)=>{
                obj.sprite.position=obj.position
            }
        ],
        [DefaultGELvents.create]:[
            (obj,args)=>{
                obj.sprite.position=obj.position
                obj.sprite.initialize(obj.game.scene_2d.camera.ctx)
                obj.game.scene_2d.camera.add_object(obj.sprite)
            }
        ],
        [DefaultGELvents.destroy]:[
            (obj,args)=>{
                obj.sprite.destroy()
            }
        ],
        [DefaultGELvents.layer_set]:[
            (obj,_dt:number)=>{
                obj.sprite.layer=obj.layer
            }
        ],
    }, 
    methods:{
    }
}