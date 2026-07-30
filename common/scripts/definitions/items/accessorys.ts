import { Definition, Definitions, tdm } from "../../../engine/core.ts";
import { TD, TDType } from "../../../engine/core/lang/td.ts";
import { HumanModifiers } from "../../others/constants.ts";
import { ItemRank } from "../../others/item.ts";
import { SideEffectType } from "../player/effects.ts";
import { GameItemDefTD, type GameItemType, type GameObjectDefinitionType } from "../utils.ts";

export const AccessoryTD:TD={
    type:TDType.object,
    content:[
        ...GameItemDefTD,
        {name:"property",content:{type:TDType.array,content:tdm.string1,len_bytes:1}},
        {name:"modifiers",content:tdm.any},
    ]
}
export interface AccessoryDef extends Definition{
    def_type?:GameObjectDefinitionType.item
    item_type?:GameItemType.accessory
    name?:string
    tname?:string
    rank:ItemRank

    property?:string[]
    modifiers?:Partial<HumanModifiers>
    events?:Record<string,(e:any)=>void>
}

export function AccessoryDropLootFromObstacle(table:string){
    return (e:any)=>{
        const loot=e.human.game.get_loot_table(table)

        for(const l of loot){
            e.human.game.add_loot(e.obstacle.hitbox.random_point(),{item:l.item,count:l.count},e.obstacle.layer)
        }
    }
}
export function Accessorys_Default_Init(accessorys:Definitions<AccessoryDef,{}>){
    accessorys.insert(
        {
            idString:"rip_ammo",
            rank:ItemRank.A,
            events:{
                "gun_shoot":(e)=>{
                    if(e.bullet.def.on_hit_explosion)return
                    e.bullet.damage*=0.7
                    e.bullet.modifiers.size*=0.75

                    const spread=Math.max(e.spread*0.005,0.005)

                    let b=e.bullet.clone()
                    b.damage*=0.2
                    b.tracerAlpha*=0.7
                    b.modifiers={
                        speed:e.user.modifiers.bullet_speed,
                        size:e.user.modifiers.bullet_size*0.4,
                    }
                    b.set_direction(e.angle-spread)

                    b=e.bullet.clone()
                    b.damage*=0.2
                    b.tracerAlpha*=0.7
                    b.modifiers={
                        speed:e.user.modifiers.bullet_speed,
                        size:e.user.modifiers.bullet_size*0.4,
                    }
                    b.set_direction(e.angle+spread)
                }
            },
        },
        {
            idString:"high_quality_projectiles",
            rank:ItemRank.A,
            events:{
                "gun_shoot":(e)=>{
                    e.bullet.damage*=1.05
                    e.bullet.set_color(0)
                }
            }
        },
        {
            idString:"first_last_great",
            rank:ItemRank.A,
            events:{
                "gun_shoot":(e)=>{
                    if(e.item.ammo===0||e.item.ammo===e.item.get_capacity()-1){
                        e.bullet.damage*=1.2
                        e.bullet.modifiers.speed*=1.2
                        e.bullet.modifiers.size*=1.75
                        e.bullet.set_color(1)
                    }
                }
            }
        },
        {
            idString:"good_reflective_bullet",
            rank:ItemRank.A,
            events:{
                "bullet_reflect":(e)=>{
                    e.bullet.damage*=2*1.2
                    e.bullet.tracerAlpha*=2
                    e.bullet.modifiers.speed*=1.2
                    e.bullet.modifiers.size*=1.75
                    e.bullet.set_color(1)
                }
            }
        },
        {
            idString:"hp_bullets",
            rank:ItemRank.S,
            events:{
                "gun_shoot":(e)=>{
                    e.bullet.penetration*=0.2
                    e.bullet.set_color(1)
                }
            }
        },
        {
            idString:"liquid_insanity",
            rank:ItemRank.A,
            events:{
                "kill":(e)=>{
                    e.owner.give_boost(25)
                    e.owner.health.value+=25
                    e.owner.side_effect({
                        type:SideEffectType.AddEffect,
                        duration:4,
                        effect:"kill_haste"
                    })
                }
            }
        },
        {
            idString:"pygmy_necklace",
            rank:ItemRank.A,
            modifiers:{
                size:0.75,
                speed:1.1
            },
        },
        {
            idString:"lucky_coin",
            rank:ItemRank.A,
            events:{
                "obstacle_destroy":AccessoryDropLootFromObstacle("normal_loot")
            }
        },
        {
            idString:"nature_leaf",
            rank:ItemRank.A,
            events:{
                "damage":(e)=>{
                    e.player.side_effect({
                        type:SideEffectType.AddEffect,
                        duration:2,
                        effect:"nature_help"
                    })
                }
            }
        },

        {
            idString:"ghost_bullets",
            rank:ItemRank.A,
            events:{
                "gun_shoot":(e)=>{
                    e.bullet.pass_through_everthing=true
                    e.bullet.modifiers.speed*=0.7
                    e.bullet.damage*=0.7
                    e.bullet.tracerAlpha*=0.5
                }
            }
        },
        {
            idString:"sprite_ammo",
            rank:ItemRank.A,
            property:["infinity_ammo"],
            events:{
                "pickup":(e)=>{
                    e.user.inventory.infinity_ammo=e.user.inventory.accessorys.has_property("infinity_ammo")
                },
                "drop":(e)=>{
                    e.user.inventory.infinity_ammo=e.user.inventory.accessorys.has_property("infinity_ammo")
                }
            }
        },
        {
            idString:"biggest_magazine",
            rank:ItemRank.A,
            property:["extended_capacity"],
            events:{
                "pickup":(e)=>{
                    e.user.inventory.extended_capacity=e.user.inventory.accessorys.has_property("extended_capacity")
                },
                "drop":(e)=>{
                    e.user.inventory.extended_capacity=e.user.inventory.accessorys.has_property("extended_capacity")
                }
            }
        },
        {
            idString:"self_revive",
            rank:ItemRank.A,
            property:["self_revive"],
            events:{
                "pickup":(e)=>{
                    e.user.human_data.self_revive=e.user.inventory.accessorys.has_property("self_revive")
                },
                "drop":(e)=>{
                    e.user.human_data.self_revive=e.user.inventory.accessorys.has_property("self_revive")
                }
            }
        },
    )
}