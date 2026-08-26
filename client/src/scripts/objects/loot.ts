
import { type Camera2D, Container2D, Sound, Sprite2D } from "common/engine/web.ts";
import { GameConstants, GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { GameItemType, ItemQualitySettings } from "common/scripts/definitions/utils.ts"
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { ConsumibleDef } from "common/scripts/definitions/items/consumibles.ts";
import { Human } from "./human.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { HelmetDef, VestDef } from "common/scripts/definitions/items/equipaments.ts";
import { BackpackDef } from "common/scripts/definitions/items/backpacks.ts";
import { Debug } from "../others/config.ts";
import { decode_loot_data } from "common/scripts/others/functions.ts";
import { Angle, CircleHitbox2D, ColorM, ease, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
export class Loot extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="loot"
    number_type: number=GameObjectType.Loot
    name:string=""
    item!:GameItem
    count:number=1
    skin?:number
    ////////////////////////////
    // Visual                 //
    ////////////////////////////
    container:Container2D=new Container2D()
    sprite_main:Sprite2D=new Sprite2D()
    sprite_outline:Sprite2D=new Sprite2D()
    dest_pos?:Vec2

    pickup_sound:Sound|undefined
    constructor(){
        super()
        this.container.visible=false
    
        this.sprite_main.hotspot=v2.half_one
        this.sprite_main.visible=false
        this.sprite_main.zIndex=3

        this.sprite_outline.hotspot=v2.half_one
        this.sprite_outline.visible=false
        this.sprite_outline.zIndex=0

        this.container.zIndex=zIndexes.Loots
        this.container.add_child(this.sprite_main)

        this.allow_tick=true
    }
    override on_create(_args: Record<string, void>): void {
        this.game.cam2d.add_object(this.container)
    }
    override on_layer_set(): void {
        this.container.layer=this.layer
    }
    override on_tick(_dt:number): void {
        if(this.dest_pos)v2m.lerp(this.position,this.dest_pos,this.game.global_interpolation)
        this.container.position=this.position
    }
    override on_destroy(): void {
        this.container.destroy()
    }
    override render(_camera: Camera2D, _dt: number): void {
        
    }
    override can_interact(h:Human): boolean {
        return this.item&&h.hitbox.colliding_with(this.hitbox)
    }

    override on_interact(h:Human): void {
        switch(this.item.item_type!){
            case GameItemType.gun:
                if(!(this.game.ui.gun_free()||(h.current_weapon&&h.current_weapon.item_type===GameItemType.gun)))return
                break
            case GameItemType.ammo:
                if(this.game.inventory.aitems[this.item.idString]>=this.game.inventory.item_limit(this.item))return
                break
            case GameItemType.consumible:
            case GameItemType.grenade:
                if(!this.game.ui.free_slot(this.item.idString,this.game.inventory.item_limit(this.item)))return
                break
            case GameItemType.helmet:
                if(h.helmet&&h.helmet.level>=(this.item as HelmetDef).level&&!(h.helmet===this.item&&h.helmet_skin!==this.skin))return
                break
            case GameItemType.vest:
                if(h.vest&&h.vest.level>=(this.item as VestDef).level)return
                break
            case GameItemType.backpack:
                if(h.backpack&&h.backpack.level>=(this.item as BackpackDef).level)return
                break

            case GameItemType.melee:
                if(!((this.game.ui.melee_free())||(h.current_weapon&&h.current_weapon.item_type===GameItemType.melee)))return
                break
            case GameItemType.scope:
                if(h.game.inventory.iitems.includes(this.item))return
                break
            case GameItemType.accessory:
                break
        }
        if(this.pickup_sound)this.game.sounds.play(this.pickup_sound,{
            bus:"loots"
        })
    }
    override auto_interact(h: Human): boolean {
        switch(this.item.item_type!){
            case GameItemType.melee:
                return this.game.ui.melee_free()
            case GameItemType.gun:
                return this.game.ui.gun_free()
            case GameItemType.ammo:
                return (this.game.inventory.aitems[this.item.idString]??0)<(h.backpack?.max[this.item.idString]??9999)
            case GameItemType.consumible:{
                return false//return this.game.ui.free_slot(this.item.idString,this.game.inventory.item_limit(this.item))
            }
            case GameItemType.helmet:
                return !h.helmet||h.helmet.level<(this.item as HelmetDef).level
            case GameItemType.vest:
                return !h.vest||h.vest.level<(this.item as VestDef).level
            case GameItemType.backpack:
                return !h.backpack||h.backpack.level<(this.item as BackpackDef).level
            case GameItemType.scope:
                if(!h.game.inventory.iitems.includes(this.item))return true
        }
        return false
    }
    override get_interact_hint(player: Human) {
        return player.game.language.get("interact.loot", {
            source: player.game.language.get(this.item.tname??("items."+this.item.idString),undefined,this.item.name),
            count: this.count > 1 ? `(${this.count})` : ""
        })
    }
    override on_decode_net(stream: Stream, full: boolean): void {
        const position=stream.read_pos2()
        if(full){
            const data=decode_loot_data(this.game.definitions,stream)
            this.item=data.item
            this.count=data.count
            this.skin=data.skin
            let radius=0.3
            switch(this.item.item_type!){
                case GameItemType.gun:
                    this.sprite_main.frame=this.game.resources.get_frame((this.item as GunDef).assets?.item??this.item.idString)
                    this.sprite_main.rotation=Angle.deg2rad(-30)
                    this.sprite_main.visible=true
                    this.sprite_main.scale=v2(2,2)
                    if(this.game.save.get_variable("sv_game_ammo_outline")){
                        this.sprite_outline.frame=this.game.resources.get_frame(`${(this.item as unknown as GunDef).ammo_type}_outline`)
                    }else{
                        this.sprite_outline.frame=this.game.resources.get_frame("rarity_outline")
                        this.sprite_outline.transform_frame({
                            tint:ItemQualitySettings[this.item.rank].tint
                        })
                    }
                    this.sprite_outline.visible=true;
                    this.sprite_outline.scale=v2(2,2);
                    this.pickup_sound=this.game.resources.get_sound("gun_pickup")
                    radius=GameConstants.loot.radius.weapon

                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.ammo:
                    this.sprite_main.frame=this.game.resources.get_frame(this.item.idString)
                    this.sprite_main.visible=true;
                    this.sprite_main.scale=v2(1.2,1.2)
                    this.sprite_outline.visible=false;
                    this.pickup_sound=this.game.resources.get_sound("ammo_pickup")
                    radius=GameConstants.loot.radius.ammo
                    break
                case GameItemType.consumible:
                    this.sprite_main.frame=this.game.resources.get_frame(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_frame(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2(1.5,1.5)
                    this.sprite_outline.scale=v2(1.4,1.4);
                    this.pickup_sound=this.game.resources.get_sound((this.item as ConsumibleDef).assets?.pickup_sound??`${this.item.idString}_pickup`)
                    radius=GameConstants.loot.radius.consumible
                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.helmet:
                    this.sprite_main.frame=this.game.resources.get_frame(this.skin!==undefined&&(this.item as HelmetDef).skins?.[this.skin]?(this.item as HelmetDef).skins![this.skin]:this.item.idString)
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
                    this.sprite_main.frame=this.game.resources.get_frame(this.item.idString)
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
                    this.sprite_main.frame=this.game.resources.get_frame(this.item.idString)
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
                    this.sprite_main.frame=this.game.resources.get_frame(this.item.idString)
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
                    this.sprite_main.frame=this.game.resources.get_frame(this.item.idString)
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
                    this.sprite_main.frame=this.game.resources.get_frame(((this.item as MeleeDef).assets?.item??this.item.idString))
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
                    this.sprite_main.frame=this.game.resources.get_frame(this.item.idString)
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
            this.base_hitbox=new CircleHitbox2D(v2(0,0),radius)
            this.container.visible=true
            this.position=position
            if(Debug.hitbox){
                this.game.hitboxes_gfx.ctx.begin_path()
                this.game.hitboxes_gfx.ctx.fill_color=ColorM.hex("#f007")
                this.game.hitboxes_gfx.ctx.hitbox(this.hitbox)
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