import { Definition, Definitions } from "../../../engine/core.ts";
import { HumanModifiers } from "../../others/constants.ts";
import { ItemRank } from "../../others/item.ts";
import { BoostType } from "../player/boosts.ts";
import { SideEffectType } from "../player/effects.ts";
import { InventoryItemType } from "../utils.ts";

export interface AccessoryDef extends Definition{
    rank:ItemRank
    property?:string[]
    modifiers?:Partial<HumanModifiers>
    events?:Record<string,(e:any)=>void>
    item_type?:InventoryItemType.accessory
}

export function AccessoryDropLootFromObstacle(table:string){
    return (e:any)=>{
        const loot=e.human.game.loot_tables.get_loot(table,{withammo:true},e.human.game)

        for(const l of loot){
            e.human.game.add_loot(e.obstacle.hitbox.randomPoint(),l.item,l.count,e.obstacle.layer)
        }
    }
}
export function Accessorys_Default_Init(accessorys:Definitions<AccessoryDef,{}>){
    accessorys.insert(
        {
            idString:"bullet_breaker_barrel",
            rank:ItemRank.A,
            events:{
                "gun_shoot":(e)=>{
                    e.bullet.damage*=0.7

                    const spread=0.016

                    let b=e.bullet.clone()
                    b.damage*=0.2
                    b.modifiers={
                        speed:e.user.modifiers.bullet_speed,
                        size:e.user.modifiers.bullet_size*0.4,
                    }
                    b.set_direction(e.angle-spread)

                    b=e.bullet.clone()
                    b.damage*=0.2
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
                    e.bullet.damage*=1.1
                    e.bullet.set_color(true)
                }
            }
        },
        {
            idString:"rare_projectile",
            rank:ItemRank.A,
            events:{
                "gun_shoot":(e)=>{
                    if(e.item.ammo===0||e.item.ammo===e.item.get_capacity()-1){
                        e.bullet.damage*=1.25
                        e.bullet.modifiers.speed*=1.25
                        e.bullet.modifiers.size*=1.75
                        e.bullet.set_color(true)
                    }
                }
            }
        },
        {
            idString:"good_reflective_bullet",
            rank:ItemRank.A,
            events:{
                "bullet_reflect":(e)=>{
                    e.bullet.damage*=2.5
                    e.bullet.tracerAlpha*=2
                    e.bullet.modifiers.speed*=1.25
                    e.bullet.modifiers.size*=1.75
                    e.bullet.set_color(true)
                }
            }
        },
        {
            idString:"liquid_insanity",
            rank:ItemRank.A,
            events:{
                "kill":(e)=>{
                    e.owner.give_boost(25)
                    e.owner.health_data.health+=25
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
            idString:"ghost_ammo",
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