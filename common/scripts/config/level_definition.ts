import { Vec2 } from "../../engine/core.ts";
import { MapDef } from "../definitions/maps/base.ts";
import { InventoryPreset } from "../definitions/utils.ts";
import { HumanModifiers } from "../others/constants.ts";
import { HistoryCommand } from "./history.ts";

export type HumanDefinition={
    name?:string
    start_position?:Vec2
    inventory?:InventoryPreset
    team?:number
    group?:number
    modifiers?:Partial<HumanModifiers>
}
export type LevelMapDefinition=string|(MapDef&{base:string})
export type EnemyDef={
    ia:{
        kind?:string
        action?:string
        params?:Record<string,any>
    }
}&HumanDefinition
export type LevelEnemys={
    def:EnemyDef|string
    team?:number
    name?:string
    position?:Vec2
    count?:number
}[]
export type LevelMode={
    map: {
        def:LevelMapDefinition
        seed?:number
    };   
}&({
    type:"kill_all_enemies",
    enemies:LevelEnemys
}|{
    type:"battle_royale"
    group_size:number
    teams?:number
    enemies:LevelEnemys[]
})|{
    type:"debug"
}
export interface LevelDefinition{
    meta:{
        name: string
        description: string
        size:"small"|"medium"|"large"
        dificulty:"easy"|"normal"|"hard"
        location: string
        date:string
    }
    mode:LevelMode
    deadzone?:{
        stage?:number
    }
    player: HumanDefinition
    assets?:{
        background_music?:string
        load?:{
            sounds?:Record<string,string>
        }
    }
    definitions?:{
        enemies?:Record<string,EnemyDef>
    }
    begin?:{
        history?:HistoryCommand[]
    }
    end?:{
        history?:HistoryCommand[]
        next?:{
            type:"level"
            charpter:number
            level:number
        }
    }
}