
import { Angle, type Camera2D, CenterHotspot, CircleHitbox2D, Container2D, ease, NetStream, Sound, Sprite2D, v2, v2m, Vec2, τ } from "common/engine/client.ts";
import { GameConstants, GameObjectType, zIndexes } from "common/scripts/others/constants.ts";
import { GameObject } from "../others/gameObject.ts";
import { InventoryItemType } from "common/scripts/definitions/utils.ts"
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { SkinDef } from "common/scripts/definitions/loadout/skins.ts";
import { ConsumibleDef } from "common/scripts/definitions/items/consumibles.ts";
import { Human } from "./human.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
export class Loot extends GameObject{
    ////////////////////////////
    // Definition             //
    ////////////////////////////
    string_type:string="loot"
    number_type: number=GameObjectType.Loot
    name:string=""
    item!:GameItem
    count:number=1
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
    
        this.sprite_main.hotspot=CenterHotspot
        this.sprite_main.visible=false
        this.sprite_main.zIndex=3

        this.sprite_outline.hotspot=CenterHotspot
        this.sprite_outline.visible=false
        this.sprite_outline.zIndex=0

        this.container.zIndex=zIndexes.Loots

        this.container.update_zindex()
    }
    override on_layer_set(layer: number): void {
        this.container.layer=layer
    }
    create(_args: Record<string, void>): void {
        this.game.cam2d.addObject(this.container)
    }
    update(_dt:number): void {
        if(this.dest_pos){
            v2m.lerp(this.position,this.dest_pos,this.game.global_interpolation)
        }
        this.container.position=this.position
        this.manager.cells.updateObject(this)
    }
    override on_destroy(): void {
        this.container.destroy()
    }
    override render(_camera: Camera2D, _dt: number): void {
        
    }
    override can_interact(h:Human): boolean {
        return this.item&&this.count>0&&h.hitbox.collidingWith(this.hitbox)
    }

    override interact(h:Human): void {
        /*switch(this.item.item_type!){
            case InventoryItemType.gun:
                if(!(
                    this.game.inventoryManager.gun_free()
                    ||(player.current_weapon&&player.current_weapon.item_type===InventoryItemType.gun)
                ))return
                break
            case InventoryItemType.ammo:
            case InventoryItemType.consumible:
                break
            case InventoryItemType.helmet:
                if(player.helmet&&player.helmet.level>=(this.item as HelmetDef).level)return
                break
            case InventoryItemType.vest:
                if(player.vest&&player.vest.level>=(this.item as VestDef).level)return
                break
            case InventoryItemType.backpack:
                if(player.backpack&&player.backpack.level>=(this.item as BackpackDef).level)return
                break
            case InventoryItemType.projectile:
            case InventoryItemType.melee:
                if(!(
                    (this.game.inventoryManager.melee_free())
                    ||(player.current_weapon&&player.current_weapon.item_type===InventoryItemType.melee)
                ))return
                break
            case InventoryItemType.scope:
                if(player.game.inventoryManager.inventory.scopes.includes(this.item.idNumber!))return
                break
            case InventoryItemType.accessory:
            case InventoryItemType.skin:
        }
        if(this.pickup_sound)this.game.sounds.play(this.pickup_sound,undefined,"players")*/
    }
    override auto_interact(h: Human): boolean {
        /*switch(this.item.item_type!){
            case InventoryItemType.melee:
                return this.game.inventoryManager.melee_free()
            case InventoryItemType.gun:
                return this.game.inventoryManager.gun_free()
            case InventoryItemType.ammo:
                return (this.game.inventoryManager.inventory.oitems[this.item.idString]??0)<(player.backpack?.max[this.item.idString]??9999)
            case InventoryItemType.consumible:{
                const limit_per_slot=player.backpack?.max[this.item.idString]??Backpacks.getFromNumber(0).max[this.item.idString]??15
                return (this.game.inventoryManager.items_map![this.item.idString]??0)<limit_per_slot
            }
            case InventoryItemType.helmet:
                return !player.helmet||player.helmet.level<(this.item as HelmetDef).level
            case InventoryItemType.vest:
                return !player.vest||player.vest.level<(this.item as VestDef).level
            case InventoryItemType.backpack:
                return !player.backpack||player.backpack.level<(this.item as BackpackDef).level
            case InventoryItemType.scope:
                if(!player.game.inventoryManager.inventory.scopes.includes(this.item.idNumber!))return true
        }*/
        return false
    }
    override get_interact_hint(player: Human) {
        return player.game.language.get("interact-loot", {
            source: player.game.language.get(this.item.idString),
            count: this.count > 1 ? `(${this.count})` : ""
        })
    }
    override decode(stream: NetStream, full: boolean): void {
        const position=stream.readPos2()
        if(full){
            this.item=this.game.definitions.game_items.valueNumber[stream.readUint16()]
            this.count=stream.readUint8()
            let radius=0.3
            switch(this.item.item_type!){
                case InventoryItemType.gun:
                    this.sprite_main.frame=this.game.resources.get_sprite((this.item as GunDef).assets?.item??this.item.idString)
                    this.sprite_main.rotation=Angle.deg2rad(-30)
                    this.sprite_main.visible=true
                    this.sprite_main.scale=v2.new(2,2)
                    this.sprite_outline.frame=this.game.resources.get_sprite(`${(this.item as unknown as GunDef).ammoType}_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_outline.scale=v2.new(2,2);
                    this.pickup_sound=this.game.resources.get_audio("gun_pickup")
                    radius=GameConstants.loot.radius.weapon

                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.ammo:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true;
                    this.sprite_main.scale=v2.new(2,2)
                    this.sprite_outline.scale=v2.new(2,2);
                    this.pickup_sound=this.game.resources.get_audio("ammo_pickup")
                    radius=GameConstants.loot.radius.ammo

                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.consumible:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(1.5,1.5)
                    this.sprite_outline.scale=v2.new(1.4,1.4);
                    this.pickup_sound=this.game.resources.get_audio((this.item as ConsumibleDef).assets?.pickup_sound??`${this.item.idString}_pickup`)
                    radius=GameConstants.loot.radius.consumible

                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.helmet:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(0.8,0.8);
                    this.sprite_outline.scale=v2.new(1.4,1.4);
                    (this.base_hitbox as CircleHitbox2D).radius=GameConstants.loot.radius.equipament
                    this.pickup_sound=this.game.resources.get_audio(`helmet_pickup`)

                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.vest:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(0.8,0.8);
                    this.sprite_outline.scale=v2.new(1.4,1.4);
                    this.pickup_sound=this.game.resources.get_audio(`vest_pickup`)
                    radius=GameConstants.loot.radius.equipament

                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.backpack:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(0.8,0.8);
                    this.sprite_outline.scale=v2.new(1.4,1.4);
                    this.pickup_sound=this.game.resources.get_audio(`backpack_pickup`)
                    radius=GameConstants.loot.radius.equipament

                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.scope:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2.new(0.8,0.8);
                    this.sprite_outline.scale=v2.new(1.4,1.4);
                    (this.base_hitbox as CircleHitbox2D).radius=GameConstants.loot.radius.equipament
                    this.pickup_sound=this.game.resources.get_audio(`scope_pickup`)

                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.grenade:
                    this.sprite_main.frame=this.game.resources.get_sprite(this.item.idString)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true
                    this.sprite_main.scale=v2.new(0.8,0.8);
                    this.sprite_outline.scale=v2.new(1.4,1.4);
                    this.sprite_main.rotation=Angle.deg2rad(-30)
                    radius=GameConstants.loot.radius.grenade

                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.melee:
                    this.sprite_main.frame=this.game.resources.get_sprite((this.item as MeleeDef).assets?.item??this.item.idString)
                    this.sprite_main.rotation=Angle.deg2rad(-30)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_outline.scale=v2.new(2,2);
                    this.pickup_sound=this.game.resources.get_audio("gun_pickup")
                    radius=GameConstants.loot.radius.weapon
                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.accessory:
                    //this.sprite_main.frame=this.game.resources.get_sprite((this.item as MeleeDef).assets?.item??this.item.idString)
                    this.sprite_main.visible=false
                    this.sprite_outline.frame=this.game.resources.get_sprite(`accessory_outline`)
                    this.sprite_outline.visible=true
                    this.sprite_outline.scale=v2.new(2,2)
                    this.pickup_sound=this.game.resources.get_audio("gun_pickup")
                    radius=GameConstants.loot.radius.accessory
                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                case InventoryItemType.skin:{
                    const ff=(this.item as unknown as SkinDef).frame?.base??(this.item.idString+"_body")
                    this.sprite_main.frame=this.game.resources.get_sprite(ff)
                    this.sprite_main.visible=true
                    this.sprite_main.scale=v2.new(0.5,0.5)
                    this.sprite_main.rotation=τ
                    this.sprite_outline.frame=this.game.resources.get_sprite(`null_outline`)
                    this.sprite_outline.visible=true
                    this.sprite_outline.scale=v2.new(1.4,1.4)
                    radius=GameConstants.loot.radius.skin

                    this.container.add_child(this.sprite_outline)
                    this.container.add_child(this.sprite_main)
                    break
                }
            }
            if(this.is_new){
                v2m.single(this.container.scale,0.05)
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
            this.base_hitbox=new CircleHitbox2D(v2.new(0,0),radius)
            this.container.visible=true
        }
        if(this.game.save.get_variable("sv_game_interpolation")&&!full){
            this.dest_pos=position
        }else{
            this.position=position
        }
    }
}