import { c_loot, si_loot, C_Loot, SI_Loot } from "common/scripts/game/objects/loot.ts";
import { Container2D, Sound, Sprite2D } from "common/engine/web.ts";
import { GameConstants, LootData, zIndexes } from "common/scripts/others/constants.ts";
import { Angle, CircleCollider2D, ease, gel_events, GELComponent, Stream, v2, v2m } from "common/engine/core.ts";
import { GameItemType, ItemQualitySettings } from "common/scripts/definitions/utils.ts";
import { GunDef } from "common/scripts/definitions/items/guns.ts";
import { ConsumibleDef } from "common/scripts/definitions/items/consumibles.ts";
import { HelmetDef } from "common/scripts/definitions/items/equipaments.ts";
import { MeleeDef } from "common/scripts/definitions/items/melees.ts";
import { decode_loot_data } from "common/scripts/others/functions.ts";
import { GameObject } from "../main/gel.ts";

export type CC_Loot=GameObject&C_Loot&{
    container:Container2D
    sprite_main:Sprite2D
    sprite_outline:Sprite2D
    pickup_sound:Sound|undefined
}
export const cc_loot:GELComponent<CC_Loot>={
    id_string:"cc_loot",
    extensions:[c_loot],
    events:{
        [gel_events.bind]:function(){
            this.container=new Container2D()
            this.sprite_main=new Sprite2D()
            this.sprite_outline=new Sprite2D()

            this.container.visible=false
            this.container.zIndex=zIndexes.Loots
        
            this.sprite_main.hotspot=v2.half_one
            this.sprite_main.visible=false
            this.sprite_main.zIndex=3

            this.sprite_outline.hotspot=v2.half_one
            this.sprite_outline.visible=false
            this.sprite_outline.zIndex=0

            this.container.add_child(this.sprite_main)
        },
        [gel_events.create]:function(){
            this.scene.camera.add_object(this.container)
        },
        [gel_events.destroy]:function(){
            this.container.destroy()
        },
        [gel_events.layer_set]:function(){
            this.container.layer=this.layer
        }
    },
    methods:{
        set_loot_data(data:LootData){
            this.loot_data=data
            this.base_collider=new CircleCollider2D(v2(0,0),GameConstants.loot.radius[data.item.item_type!]??0.5)
            switch(data.item.item_type!){
                case GameItemType.gun:
                    this.sprite_main.frame=this.app.resources.get_frame((data.item as GunDef).assets?.item??data.item.id_string)
                    this.sprite_main.rotation=Angle.deg2rad(-30)
                    this.sprite_main.visible=true
                    this.sprite_main.scale=v2(2,2)
                    if(this.app.save.settings.get_var("game_ammo_outline")){
                        this.sprite_outline.frame=this.app.resources.get_frame(`${(data.item as unknown as GunDef).ammo_type}_outline`)
                    }else{
                        this.sprite_outline.frame=this.app.resources.get_frame("rarity_outline")
                        this.sprite_outline.transform_frame({
                            tint:ItemQualitySettings[data.item.rank].tint
                        })
                    }
                    this.sprite_outline.visible=true;
                    this.sprite_outline.scale=v2(2,2);
                    this.pickup_sound=this.app.resources.get_sound("gun_pickup")

                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.ammo:
                    this.sprite_main.frame=this.app.resources.get_frame(data.item.id_string)
                    this.sprite_main.visible=true;
                    this.sprite_main.scale=v2(1.2,1.2)
                    this.sprite_outline.visible=false;
                    this.pickup_sound=this.app.resources.get_sound("ammo_pickup")
                    break
                case GameItemType.consumible:
                    this.sprite_main.frame=this.app.resources.get_frame(data.item.id_string)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.app.resources.get_frame(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2(1.5,1.5)
                    this.sprite_outline.scale=v2(1.4,1.4);
                    this.pickup_sound=this.app.resources.get_sound((data.item as ConsumibleDef).assets?.pickup_sound??`${data.item.id_string}_pickup`)
                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.helmet:
                    this.sprite_main.frame=this.app.resources.get_frame(data.skin!==undefined&&(data.item as HelmetDef).skins?.[data.skin]?(data.item as HelmetDef).skins![data.skin]:data.item.id_string)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.app.resources.get_frame(`null_outline`)
                    this.sprite_outline.visible=true
                    this.sprite_main.scale=v2(0.8,0.8)
                    this.sprite_outline.scale=v2(1.4,1.4)
                    this.pickup_sound=this.app.resources.get_sound(`helmet_pickup`)
                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.vest:
                    this.sprite_main.frame=this.app.resources.get_frame(data.item.id_string)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.app.resources.get_frame(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2(1,1);
                    this.sprite_outline.scale=v2(1.4,1.4);
                    this.pickup_sound=this.app.resources.get_sound(`vest_pickup`)
                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.backpack:
                    this.sprite_main.frame=this.app.resources.get_frame(data.item.id_string)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.app.resources.get_frame(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2(1,1);
                    this.sprite_outline.scale=v2(1.4,1.4);
                    this.pickup_sound=this.app.resources.get_sound(`backpack_pickup`)
                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.scope:
                    this.sprite_main.frame=this.app.resources.get_frame(data.item.id_string)
                    this.sprite_main.visible=true
                    this.sprite_outline.frame=this.app.resources.get_frame(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_main.scale=v2(2,2);
                    this.sprite_outline.scale=v2(1.4,1.4);
                    this.pickup_sound=this.app.resources.get_sound(`scope_pickup`)
                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.grenade:
                    this.sprite_main.frame=this.app.resources.get_frame(data.item.id_string)
                    this.sprite_main.visible=true
                    this.sprite_main.scale=v2(2,2)
                    this.sprite_outline.frame=this.app.resources.get_frame(`null_outline`)
                    this.sprite_outline.visible=true
                    this.sprite_outline.scale=v2(1.4,1.4);
                    this.sprite_main.rotation=Angle.deg2rad(-30)
                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.melee:
                    this.sprite_main.frame=this.app.resources.get_frame(((data.item as MeleeDef).assets?.item??this.loot_data.item.id_string))
                    this.sprite_main.rotation=Angle.deg2rad(-30)
                    this.sprite_main.visible=true
                    this.sprite_main.scale=v2(2,2)
                    this.sprite_outline.frame=this.app.resources.get_frame(`null_outline`)
                    this.sprite_outline.visible=true;
                    this.sprite_outline.scale=v2(1.9,1.9);
                    this.container.add_child(this.sprite_outline)
                    break
                case GameItemType.accessory:
                    this.sprite_main.frame=this.app.resources.get_frame(this.loot_data.item.id_string)
                    this.sprite_main.visible=true
                    this.sprite_main.scale=v2(2,2)
                    this.sprite_outline.frame=this.app.resources.get_frame(`accessory_outline`)
                    this.sprite_outline.visible=true
                    this.sprite_outline.scale=v2(2,2)
                    this.pickup_sound=this.app.resources.get_sound("accessory_pickup")
                    this.container.add_child(this.sprite_outline)
                    break
            }
            this.container.visible=true
            if(this.is_new){
                v2m.single(this.container.scale,0)
                this.app.clock.add_tween({
                    duration:3,
                    target:this.container.scale,
                    ease:ease.elasticOut,
                    to:{
                        x:1,
                        y:1
                    },
                })
            }
        }
    }
}

export const ccn_loot:GELComponent<CC_Loot>={
    id_string:"ccn_loot", // Loot Network
    extensions:[cc_loot],
    events:{
        [gel_events.bind]:function(){
            this.allow_tick=true
        },
        [gel_events.tick]:function(_dt:number){
            v2m.lerp(this.container.position,this.position,this.app.global_interpolation)
        },
        [gel_events.net_decode]:function(stream:Stream,full:boolean){
            this.position=stream.read_pos2()
            if(full){
                this.set_loot_data(decode_loot_data(this.app.definitions,stream))
                this.container.position=this.position
            }else if(!this.app.save.settings.get_var("game_interpolation")){
                this.container.position=this.position
            }
        },
    },
}
export const ccs_loot:GELComponent<SI_Loot&CC_Loot>={
    id_string:"ccs_loot", // Loot Self
    extensions:[si_loot,cc_loot],
    events:{
        [gel_events.bind]:function(){
            this.allow_tick=true
        },
        [gel_events.tick]:function(_dt){
            this.container.position=this.position
        },
    },
}