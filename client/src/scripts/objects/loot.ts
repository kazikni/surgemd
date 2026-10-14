
import { Container2D, Sound, Sprite2D } from "common/engine/web.ts";
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
import { Angle, CircleHitbox2D, ColorM, DefaultGELvents, ease,ObjectComponent,Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { Loot_CData } from "common/scripts/game/objects/loot.ts";

export interface LootVisual_CData extends Loot_CData{
    container:Container2D
    sprite_main:Sprite2D
    sprite_outline:Sprite2D
    pickup_sound:Sound|undefined
}
export interface LootNC_CDATA extends LootVisual_CData{
    dest_pos?:Vec2
}

export const c_loot_visual:ObjectComponent<LootVisual_CData&GameObject>={
    number_name:1,
    string_name:"loot_visual",
    events:{
        [DefaultGELvents.bind]:[
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
        [DefaultGELvents.create]:[
            (obj,args)=>{
                obj.game.scene_2d.camera.add_object(obj.container)
            }
        ],
        [DefaultGELvents.destroy]:[
            (obj,args)=>{
                obj.container.destroy()
            }
        ],
        [DefaultGELvents.layer_set]:[
            (obj,_dt:number)=>{
                obj.container.layer=obj.layer
            }
        ],
        [DefaultGELvents.tick]:[
            (obj,_dt:number)=>{
                obj.container.position=obj.position
                if(Debug.hitbox){
                    obj.game.hitboxes_gfx.ctx.begin_path()
                    obj.game.hitboxes_gfx.ctx.hitbox(obj.hitbox)
                    obj.game.hitboxes_gfx.ctx.fill_color=ColorM.hex("#f007")
                    obj.game.hitboxes_gfx.ctx.fill()
                }
            }
        ],
    },
    methods:{
        set_loot_data(ctx,data:LootData){
            ctx.object.loot_data=data
            let radius=0.3
            switch(data.item.item_type!){
                case GameItemType.gun:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame((data.item as GunDef).assets?.item??data.item.idString)
                    ctx.object.sprite_main.rotation=Angle.deg2rad(-30)
                    ctx.object.sprite_main.visible=true
                    ctx.object.sprite_main.scale=v2(2,2)
                    if(ctx.object.game.save.settings.get_var("sv_game_ammo_outline")){
                        ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame(`${(data.item as unknown as GunDef).ammo_type}_outline`)
                    }else{
                        ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame("rarity_outline")
                        ctx.object.sprite_outline.transform_frame({
                            tint:ItemQualitySettings[data.item.rank].tint
                        })
                    }
                    ctx.object.sprite_outline.visible=true;
                    ctx.object.sprite_outline.scale=v2(2,2);
                    ctx.object.pickup_sound=ctx.object.game.resources.get_sound("gun_pickup")
                    radius=GameConstants.loot.radius.weapon

                    ctx.object.container.add_child(ctx.object.sprite_outline)
                    break
                case GameItemType.ammo:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame(data.item.idString)
                    ctx.object.sprite_main.visible=true;
                    ctx.object.sprite_main.scale=v2(1.2,1.2)
                    ctx.object.sprite_outline.visible=false;
                    ctx.object.pickup_sound=ctx.object.game.resources.get_sound("ammo_pickup")
                    radius=GameConstants.loot.radius.ammo
                    break
                case GameItemType.consumible:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame(data.item.idString)
                    ctx.object.sprite_main.visible=true
                    ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame(`null_outline`)
                    ctx.object.sprite_outline.visible=true;
                    ctx.object.sprite_main.scale=v2(1.5,1.5)
                    ctx.object.sprite_outline.scale=v2(1.4,1.4);
                    ctx.object.pickup_sound=ctx.object.game.resources.get_sound((data.item as ConsumibleDef).assets?.pickup_sound??`${data.item.idString}_pickup`)
                    radius=GameConstants.loot.radius.consumible
                    ctx.object.container.add_child(ctx.object.sprite_outline)
                    break
                case GameItemType.helmet:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame(data.skin!==undefined&&(data.item as HelmetDef).skins?.[data.skin]?(data.item as HelmetDef).skins![data.skin]:data.item.idString)
                    ctx.object.sprite_main.visible=true
                    ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame(`null_outline`)
                    ctx.object.sprite_outline.visible=true
                    ctx.object.sprite_main.scale=v2(0.8,0.8)
                    ctx.object.sprite_outline.scale=v2(1.4,1.4)
                    radius=GameConstants.loot.radius.equipament
                    ctx.object.pickup_sound=ctx.object.game.resources.get_sound(`helmet_pickup`)
                    ctx.object.container.add_child(ctx.object.sprite_outline)
                    break
                case GameItemType.vest:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame(data.item.idString)
                    ctx.object.sprite_main.visible=true
                    ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame(`null_outline`)
                    ctx.object.sprite_outline.visible=true;
                    ctx.object.sprite_main.scale=v2(1,1);
                    ctx.object.sprite_outline.scale=v2(1.4,1.4);
                    ctx.object.pickup_sound=ctx.object.game.resources.get_sound(`vest_pickup`)
                    radius=GameConstants.loot.radius.equipament
                    ctx.object.container.add_child(ctx.object.sprite_outline)
                    break
                case GameItemType.backpack:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame(data.item.idString)
                    ctx.object.sprite_main.visible=true
                    ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame(`null_outline`)
                    ctx.object.sprite_outline.visible=true;
                    ctx.object.sprite_main.scale=v2(1,1);
                    ctx.object.sprite_outline.scale=v2(1.4,1.4);
                    ctx.object.pickup_sound=ctx.object.game.resources.get_sound(`backpack_pickup`)
                    radius=GameConstants.loot.radius.equipament
                    ctx.object.container.add_child(ctx.object.sprite_outline)
                    break
                case GameItemType.scope:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame(data.item.idString)
                    ctx.object.sprite_main.visible=true
                    ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame(`null_outline`)
                    ctx.object.sprite_outline.visible=true;
                    ctx.object.sprite_main.scale=v2(2,2);
                    ctx.object.sprite_outline.scale=v2(1.4,1.4);
                    radius=GameConstants.loot.radius.scopes
                    ctx.object.pickup_sound=ctx.object.game.resources.get_sound(`scope_pickup`)
                    ctx.object.container.add_child(ctx.object.sprite_outline)
                    break
                case GameItemType.grenade:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame(data.item.idString)
                    ctx.object.sprite_main.visible=true
                    ctx.object.sprite_main.scale=v2(2,2)
                    ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame(`null_outline`)
                    ctx.object.sprite_outline.visible=true
                    ctx.object.sprite_outline.scale=v2(1.4,1.4);
                    ctx.object.sprite_main.rotation=Angle.deg2rad(-30)
                    radius=GameConstants.loot.radius.grenade
                    ctx.object.container.add_child(ctx.object.sprite_outline)
                    break
                case GameItemType.melee:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame(((data.item as MeleeDef).assets?.item??ctx.object.loot_data.item.idString))
                    ctx.object.sprite_main.rotation=Angle.deg2rad(-30)
                    ctx.object.sprite_main.visible=true
                    ctx.object.sprite_main.scale=v2(2,2)
                    ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame(`null_outline`)
                    ctx.object.sprite_outline.visible=true;
                    ctx.object.sprite_outline.scale=v2(1.9,1.9);
                    radius=GameConstants.loot.radius.weapon
                    ctx.object.container.add_child(ctx.object.sprite_outline)
                    break
                case GameItemType.accessory:
                    ctx.object.sprite_main.frame=ctx.object.game.resources.get_frame(ctx.object.loot_data.item.idString)
                    ctx.object.sprite_main.visible=true
                    ctx.object.sprite_main.scale=v2(2,2)
                    ctx.object.sprite_outline.frame=ctx.object.game.resources.get_frame(`accessory_outline`)
                    ctx.object.sprite_outline.visible=true
                    ctx.object.sprite_outline.scale=v2(2,2)
                    ctx.object.pickup_sound=ctx.object.game.resources.get_sound("accessory_pickup")
                    radius=GameConstants.loot.radius.accessory
                    ctx.object.container.add_child(ctx.object.sprite_outline)
                    break
            }
            ctx.object.base_hitbox=new CircleHitbox2D(v2(0,0),radius)
            ctx.object.container.visible=true
        }
    }
}
export const c_loot_nc={
    number_name:1,
    string_name:"loot_nc", // Loot Network Client
    events:{
        [DefaultGELvents.bind]:[
            (obj)=>{
                obj.allow_tick=true
            }
        ],
        [DefaultGELvents.create]:[
            (obj,args)=>{
                obj.dest_pos=undefined
            }
        ],
        [DefaultGELvents.tick]:[
            (obj,_dt:number)=>{
                if(obj.dest_pos)v2m.lerp(obj.position,obj.dest_pos,obj.game.global_interpolation)
            }
        ],
        [DefaultGELvents.net_decode]:[
            (obj,stream:Stream,full:boolean)=>{
                const position=stream.read_pos2()
                if(full){
                    obj.set_loot_data(decode_loot_data(obj.game.definitions,stream))
                    if(obj.is_new){
                        v2m.single(obj.container.scale,0.02)
                        obj.game.add_tween({
                            duration:3,
                            target:obj.container.scale,
                            ease:ease.elasticOut,
                            to:{
                                x:1,
                                y:1
                            },
                        })
                    }
                    obj.position=position
                }else{
                    if(obj.game.save.settings.get_var("sv_game_interpolation")){
                        obj.dest_pos=position
                    }else{
                        obj.position=position
                    }
                }
            }
        ]
    }
} as ObjectComponent<LootNC_CDATA&GameObject>
export class Loot extends GameObject implements LootNC_CDATA{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="loot"
    number_type: number=GameObjectType.Loot

    ////////////////////////////
    // Visual                 //
    ////////////////////////////

    loot_data!:LootData
    dest_pos!:Vec2

    container!:Container2D
    sprite_main!:Sprite2D
    sprite_outline!:Sprite2D
    pickup_sound!:Sound|undefined

    set_loot_data!:(loot: LootData)=>void
    constructor(){
        super()

        this.add_component(c_loot_visual)
        this.add_component(c_loot_nc)
    }

    override on_tick(_dt: number): void {
    }
    override can_interact(h:Human): boolean {
        return this.loot_data?.item&&h.hitbox.colliding_with(this.hitbox)
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
}