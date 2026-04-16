import { Definition, Definitions } from "../../../engine/core.ts";
import { HumanModifiers } from "../../others/constants.ts";
import { ItemRank } from "../../others/item.ts";
import { SideEffectType } from "../player/effects.ts";
import { InventoryItemType } from "../utils.ts";

export interface AccessoryDef extends Definition{
    rank:ItemRank
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

                    let b=e.user.game.add_bullet(e.position,e.angle-0.02,e.item.def.bullet.def,e.user,e.item.def.ammoType,e.item.def,e.user.layer,e.bullet.satured)
                    b.damage*=0.2
                    b.modifiers={
                        speed:e.user.modifiers.bullet_speed,
                        size:e.user.modifiers.bullet_size*0.4,
                    }

                    b=e.user.game.add_bullet(e.position,e.angle+0.02,e.item.def.bullet.def,e.user,e.item.def.ammoType,e.item.def,e.user.layer,e.bullet.satured)
                    b.damage*=0.2
                    b.modifiers={
                        speed:e.user.modifiers.bullet_speed,
                        size:e.user.modifiers.bullet_size*0.4,
                    }
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
                    if(e.item.ammo===0){
                        e.bullet.damage*=1.4
                        e.bullet.modifiers.size*=1.75

                        e.bullet.set_color(true)
                    }
                }
            }
        },
        {
            idString:"liquid_insanity",
            rank:ItemRank.A,
            events:{
                "kill":(e)=>{
                    e.owner.health_data.health+=20
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
                size:0.75
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
                    e.player.health_data.health+=20
                    e.player.side_effect({
                        type:SideEffectType.AddEffect,
                        duration:4,
                        effect:"nature_help"
                    })
                }
            }
        },
    )
}