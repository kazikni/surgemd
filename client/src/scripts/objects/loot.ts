
import { type Camera2D, Container2D, Sound, Sprite2D } from "common/engine/web.ts";
import { GameConstants, GameObjectType, LootData, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { GameItemType, ItemQualitySettings } from "common/scripts/definitions/utils.ts"
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { ConsumibleDef } from "common/scripts/definitions/items/consumibles.ts";
import { Human } from "./human.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts";
import { Debug } from "../others/config.ts";
import { decode_loot_data } from "common/scripts/others/functions.ts";
import { Angle, CircleHitbox2D, ColorM, DefaultObjec2DEvents, ease,ObjectComponent2D,Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { LootBase } from "common/scripts/objects/moving_body.ts";
export interface LootBaseNC extends LootBase{
    dest_pos?:Vec2
}export interface LootVisual extends LootBase{
    container:Container2D
    sprite_main:Sprite2D
    sprite_outline:Sprite2D
}

export const loot_nc={
    number_name:1,
    string_name:"loot_nc", // Loot Network Client
    events:{
        [DefaultObjec2DEvents.bind]:[
            (obj)=>{
                obj.allow_tick=true
            }
        ],
        [DefaultObjec2DEvents.create]:[
            (obj,args)=>{
                obj.dest_pos=undefined
            }
        ],
        [DefaultObjec2DEvents.tick]:[
            (obj,_dt:number)=>{
                if(obj.dest_pos)v2m.lerp(obj.position,obj.dest_pos,obj.game.global_interpolation)
            }
        ],
    }
} as ObjectComponent2D<LootBaseNC&GameObject>
export const loot_visual:ObjectComponent2D<LootVisual&GameObject>={
    number_name:1,
    string_name:"loot_visual",
    events:{
        [DefaultObjec2DEvents.bind]:[
            (obj)=>{
                obj.allow_tick=true

                obj.container=new Container2D()
                obj.sprite_main=new Sprite2D()
                obj.sprite_outline=new Sprite2D()

                obj.container.visible=false
                obj.container.zIndex=zIndexes.Loots
            
                obj.sprite_main.hotspot=v2.half_one
                obj.sprite_main.visible=false
                obj.sprite_main.zIndex=3

                obj.sprite_outline.hotspot=v2.half_one
                obj.sprite_outline.visible=false
                obj.sprite_outline.zIndex=0

                obj.container.add_child(obj.sprite_main)
            }
        ],
        [DefaultObjec2DEvents.create]:[
            (obj,args)=>{
                obj.game.scene_2d.camera.add_object(obj.container)
            }
        ],
        [DefaultObjec2DEvents.destroy]:[
            (obj,args)=>{
                obj.container.destroy()
            }
        ],
        [DefaultObjec2DEvents.layer_set]:[
            (obj,_dt:number)=>{
                obj.container.layer=obj.layer
            }
        ],
        [DefaultObjec2DEvents.tick]:[
            (obj,_dt:number)=>{
                obj.container.position=obj.position
            }
        ],
        [DefaultObjec2DEvents.net_encode]:[
            (obj,stream:Stream,full:boolean)=>{
            }
        ]
    }
}

export class Loot extends GameObject implements LootBase,LootBaseNC{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="loot"
    number_type: number=GameObjectType.Loot

    loot_nc:boolean=false
    ////////////////////////////
    // Visual                 //
    ////////////////////////////

    loot_data!:LootData
    dest_pos!:Vec2

    container!:Container2D
    sprite_main!:Sprite2D
    sprite_outline!:Sprite2D

    pickup_sound:Sound|undefined
    constructor(){
        super()

        this.add_component(loot_visual)
    }
    override can_interact(h:Human): boolean {
        return this.loot_data.item&&h.hitbox.colliding_with(this.hitbox)
    }

    override on_interact(h:Human): void {
        switch(this.loot_data.item.item_type!){
            case GameItemType.gun:
                if(!(this.game.inventory.gun_free()||(h.current_weapon&&h.current_weapon.item_type===GameItemType.gun)))return
                break
            case GameItemType.ammo:
                if(this.game.inventory.aitems[this.loot_data.item.idString]>=this.game.inventory.item_limit(this.loot_data.item))return
                break
            case GameItemType.consumible:
            case GameItemType.grenade:
                if(!this.game.inventory.free_slot(this.loot_data.item.idString,this.game.inventory.item_limit(this.loot_data.item)))return
                break
            case GameItemType.helmet:
                if(h.helmet&&h.helmet.level>=(this.loot_data.item as HelmetDef).level&&!(h.helmet===this.loot_data.item&&h.helmet_skin!==this.loot_data.skin))return
                break
            case GameItemType.vest:
                if(h.vest&&h.vest.level>=(this.loot_data.item as VestDef).level)return
                break
            case GameItemType.backpack:
                if(h.backpack&&h.backpack.level>=(this.loot_data.item as BackpackDef).level)return
                break

            case GameItemType.melee:
                if(!((this.game.inventory.melee_free())||(h.current_weapon&&h.current_weapon.item_type===GameItemType.melee)))return
                break
            case GameItemType.scope:
                if(h.game.inventory.iitems.includes(this.loot_data.item))return
                break
            case GameItemType.accessory:
                break
        }
        if(this.pickup_sound)this.game.sounds.play(this.pickup_sound,{
            bus:"loots"
        })
    }
    override auto_interact(h: Human): boolean {
        switch(this.loot_data.item.item_type!){
            case GameItemType.melee:
                return this.game.inventory.melee_free()
            case GameItemType.gun:
                return this.game.inventory.gun_free()
            case GameItemType.ammo:
                return (this.game.inventory.aitems[this.loot_data.item.idString]??0)<(h.backpack?.max[this.loot_data.item.idString]??9999)
            case GameItemType.consumible:{
                return false//return this.game.ui.free_slot(this.loot_data.item.idString,this.game.inventory.item_limit(this.loot_data.item))
            }
            case GameItemType.helmet:
                return !h.helmet||h.helmet.level<(this.loot_data.item as HelmetDef).level
            case GameItemType.vest:
                return !h.vest||h.vest.level<(this.loot_data.item as VestDef).level
            case GameItemType.backpack:
                return !h.backpack||h.backpack.level<(this.loot_data.item as BackpackDef).level
            case GameItemType.scope:
                if(!h.game.inventory.iitems.includes(this.loot_data.item))return true
        }
        return false
    }
    override get_interact_hint(player: Human) {
        return player.game.language.get("interact.loot", {
            source: player.game.language.get(this.loot_data.item.tname??("items."+this.loot_data.item.idString),undefined,this.loot_data.item.name),
            count: this.loot_data.count > 1 ? `(${this.loot_data.count})` : ""
        })
    }

    set_loot_data(data:LootData){
        this.loot_data=data
        let radius=0.3
        switch(data.item.item_type!){
            case GameItemType.gun:
                this.sprite_main.frame=this.game.resources.get_frame((data.item as GunDef).assets?.item??data.item.idString)
                this.sprite_main.rotation=Angle.deg2rad(-30)
                this.sprite_main.visible=true
                this.sprite_main.scale=v2(2,2)
                if(this.game.save.get_variable("sv_game_ammo_outline")){
                    this.sprite_outline.frame=this.game.resources.get_frame(`${(data.item as unknown as GunDef).ammo_type}_outline`)
                }else{
                    this.sprite_outline.frame=this.game.resources.get_frame("rarity_outline")
                    this.sprite_outline.transform_frame({
                        tint:ItemQualitySettings[data.item.rank].tint
                    })
                }
                this.sprite_outline.visible=true;
                this.sprite_outline.scale=v2(2,2);
                this.pickup_sound=this.game.resources.get_sound("gun_pickup")
                radius=GameConstants.loot.radius.weapon

                this.container.add_child(this.sprite_outline)
                break
            case GameItemType.ammo:
                this.sprite_main.frame=this.game.resources.get_frame(data.item.idString)
                this.sprite_main.visible=true;
                this.sprite_main.scale=v2(1.2,1.2)
                this.sprite_outline.visible=false;
                this.pickup_sound=this.game.resources.get_sound("ammo_pickup")
                radius=GameConstants.loot.radius.ammo
                break
            case GameItemType.consumible:
                this.sprite_main.frame=this.game.resources.get_frame(data.item.idString)
                this.sprite_main.visible=true
                this.sprite_outline.frame=this.game.resources.get_frame(`null_outline`)
                this.sprite_outline.visible=true;
                this.sprite_main.scale=v2(1.5,1.5)
                this.sprite_outline.scale=v2(1.4,1.4);
                this.pickup_sound=this.game.resources.get_sound((data.item as ConsumibleDef).assets?.pickup_sound??`${data.item.idString}_pickup`)
                radius=GameConstants.loot.radius.consumible
                this.container.add_child(this.sprite_outline)
                break
            case GameItemType.helmet:
                this.sprite_main.frame=this.game.resources.get_frame(data.skin!==undefined&&(data.item as HelmetDef).skins?.[data.skin]?(data.item as HelmetDef).skins![data.skin]:data.item.idString)
                this.sprite_main.visible=true
                this.sprite_outline.frame=this.game.resources.get_frame(`null_outline`)
                this.sprite_outline.visible=true
                this.sprite_main.scale=v2(0.8,0.8)
                this.sprite_outline.scale=v2(1.4,1.4)
                radius=GameConstants.loot.radius.equipament
                this.pickup_sound=this.game.resources.get_sound(`helmet_pickup`)
                this.container.add_child(this.sprite_outline)
                break
            case GameItemType.vest:
                this.sprite_main.frame=this.game.resources.get_frame(data.item.idString)
                this.sprite_main.visible=true
                this.sprite_outline.frame=this.game.resources.get_frame(`null_outline`)
                this.sprite_outline.visible=true;
                this.sprite_main.scale=v2(1,1);
                this.sprite_outline.scale=v2(1.4,1.4);
                this.pickup_sound=this.game.resources.get_sound(`vest_pickup`)
                radius=GameConstants.loot.radius.equipament
                this.container.add_child(this.sprite_outline)
                break
            case GameItemType.backpack:
                this.sprite_main.frame=this.game.resources.get_frame(data.item.idString)
                this.sprite_main.visible=true
                this.sprite_outline.frame=this.game.resources.get_frame(`null_outline`)
                this.sprite_outline.visible=true;
                this.sprite_main.scale=v2(1,1);
                this.sprite_outline.scale=v2(1.4,1.4);
                this.pickup_sound=this.game.resources.get_sound(`backpack_pickup`)
                radius=GameConstants.loot.radius.equipament
                this.container.add_child(this.sprite_outline)
                break
            case GameItemType.scope:
                this.sprite_main.frame=this.game.resources.get_frame(data.item.idString)
                this.sprite_main.visible=true
                this.sprite_outline.frame=this.game.resources.get_frame(`null_outline`)
                this.sprite_outline.visible=true;
                this.sprite_main.scale=v2(2,2);
                this.sprite_outline.scale=v2(1.4,1.4);
                radius=GameConstants.loot.radius.scopes
                this.pickup_sound=this.game.resources.get_sound(`scope_pickup`)
                this.container.add_child(this.sprite_outline)
                break
            case GameItemType.grenade:
                this.sprite_main.frame=this.game.resources.get_frame(data.item.idString)
                this.sprite_main.visible=true
                this.sprite_main.scale=v2(2,2)
                this.sprite_outline.frame=this.game.resources.get_frame(`null_outline`)
                this.sprite_outline.visible=true
                this.sprite_outline.scale=v2(1.4,1.4);
                this.sprite_main.rotation=Angle.deg2rad(-30)
                radius=GameConstants.loot.radius.grenade
                this.container.add_child(this.sprite_outline)
                break
            case GameItemType.melee:
                this.sprite_main.frame=this.game.resources.get_frame(((data.item as MeleeDef).assets?.item??this.loot_data.item.idString))
                this.sprite_main.rotation=Angle.deg2rad(-30)
                this.sprite_main.visible=true
                this.sprite_main.scale=v2(2,2)
                this.sprite_outline.frame=this.game.resources.get_frame(`null_outline`)
                this.sprite_outline.visible=true;
                this.sprite_outline.scale=v2(1.9,1.9);
                radius=GameConstants.loot.radius.weapon
                this.container.add_child(this.sprite_outline)
                break
            case GameItemType.accessory:
                this.sprite_main.frame=this.game.resources.get_frame(this.loot_data.item.idString)
                this.sprite_main.visible=true
                this.sprite_main.scale=v2(2,2)
                this.sprite_outline.frame=this.game.resources.get_frame(`accessory_outline`)
                this.sprite_outline.visible=true
                this.sprite_outline.scale=v2(2,2)
                this.pickup_sound=this.game.resources.get_sound("accessory_pickup")
                radius=GameConstants.loot.radius.accessory
                this.container.add_child(this.sprite_outline)
                break
        }
        this.base_hitbox=new CircleHitbox2D(v2(0,0),radius)
        this.container.visible=true
    }
    override on_decode_net(stream: Stream, full: boolean): void {
        if(!this.loot_nc){
            this.loot_nc=true
            this.add_component(loot_nc)
        }
        const position=stream.read_pos2()
        if(full){
            this.set_loot_data(decode_loot_data(this.game.definitions,stream))
            if(this.is_new){
                v2m.single(this.container.scale,0.02)
                this.game.add_tween({
                    duration:3,
                    target:this.container.scale,
                    ease:ease.elasticOut,
                    to:{
                        x:1,
                        y:1
                    },
                })
            }
            this.position=position
            if(Debug.hitbox){
                this.game.hitboxes_gfx.ctx.begin_path()
                this.game.hitboxes_gfx.ctx.fill_color=ColorM.hex("#f007")
                this.game.hitboxes_gfx.ctx.hitbox(this.hitbox)
                this.game.hitboxes_gfx.ctx.fill()
            }
        }else{
            if(this.game.save.get_variable("sv_game_interpolation")){
                this.dest_pos=position
            }else{
                this.position=position
            }
        }
    }
}