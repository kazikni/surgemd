import { gel_events, GELComponent, LootTableGetItemCallback, LootTablesManager } from "../../../engine/core.ts";
import { type LootAditional, type LootData, type LootSetting, type LootTable } from "../../others/constants.ts";
import { loot_table_get_item } from "../../others/functions.ts";
import { SimulatedGELO } from "../base.ts";

export interface GameRules{
    loot_settings:LootSetting
}
export type C_Mode=SimulatedGELO&{
    rules:GameRules
    loot_tables:LootTablesManager<LootData,LootAditional,LootSetting>
    get_loot(table:LootTable,settings?:LootAditional):LootData[]
}

export const c_mode:GELComponent<C_Mode>={
    id_string:"c_mode",
    events:{
        [gel_events.bind]:function(){
            this.loot_tables=new LootTablesManager(loot_table_get_item as LootTableGetItemCallback<LootData,LootAditional,LootSetting>)
        },
        [gel_events.registry]:function(){
            this.rules={
                loot_settings:{
                    definitions:this.app.definitions,
                    hold_ammo:true
                }
            }
        }
    },
    methods:{
        get_loot(table:LootTable,settings?:LootAditional):LootData[]{
            return this.loot_tables.get_loot(table,{definitions:this.app.definitions,...(settings??this.rules.loot_settings)})
        }
    }
}