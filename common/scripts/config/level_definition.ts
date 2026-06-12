import { Vec2 } from "../../engine/core.ts";
import { MapDef } from "../definitions/maps/base.ts";
import { JSONBuildingDef } from "../definitions/objects/buildings_base.ts";
import { InventoryPreset } from "../definitions/utils.ts";
import { HumanModifiers } from "../others/constants.ts";
export interface LoadoutPreset{
    badge?:string
    hair?:string
    hair_tint?:number
    body?:string
    body_tint?:number
    eyes?:string
    shirt?:string
    legs?:string
    accessorys?:string[]
}
export type HumanDefinition={
    name?:string
    position?:Vec2
    loadout?:LoadoutPreset
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
export enum GameOverScreenType{
    Normal,
    Restart,
    Light
}
export type GameOverScreen={
    type:GameOverScreenType.Normal
}|{
    type:GameOverScreenType.Restart
}|{
    type:GameOverScreenType.Light
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
    game_over?:GameOverScreen
    cutscenes?:{
        begin?:string
    }
    mode:LevelMode
    deadzone?:{
        stage?:number
    }
    player: HumanDefinition&{
        colors_replace?:Record<string,string>
    }
    assets?:{
        background_music?:string
        load?:{
            sounds?:Record<string,string>
        }
    }
    definitions?:{
        enemies?:Record<string,EnemyDef>
        buildings?:Record<string,JSONBuildingDef>
    }
}