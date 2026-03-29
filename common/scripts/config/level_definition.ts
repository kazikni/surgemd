import { Vec2 } from "../../engine/core.ts";
import { MapDef } from "../definitions/maps/base.ts";
import { InventoryPreset } from "../definitions/utils.ts";
import { HumanModifiers } from "../others/constants.ts";
import { HistoryCommand } from "./history.ts";

export type LevelHumanDefinition={
    name?:string
    start_position?:Vec2
    inventory?:InventoryPreset
    modifiers?:Partial<HumanModifiers>
}
export type LevelMapDefinition=string|(MapDef&{base:string})
export type EnemyDef={
    ia:{
        kind?:string
        action?:string
        params?:Record<string,any>
    }
}&LevelHumanDefinition
export type LevelMode={
    map: {
        def:LevelMapDefinition
        seed?:number
    };   
}&({
    type:"kill_all_enemies",
    enemies:{
        def:EnemyDef|string
        name?:string

        position?:Vec2
        count?:number
    }[]
}|{
    type:"battle_royale"
    team_size:number
    groups?:number
    players:{
        count:number
    }
})
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
    player: LevelHumanDefinition
    assets?:{
        background_music?:string
        load?:{
            sounds?:Record<string,string>
        }
    }
    definitions?:{
        enemies?:Record<string,{
            easy:EnemyDef,
            normal:EnemyDef,
            hard:EnemyDef
        }>
    }
    history?:HistoryCommand[]
}