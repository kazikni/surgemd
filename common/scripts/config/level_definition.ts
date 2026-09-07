import { MapDef } from "../definitions/maps/base.ts";
import { CharacterDefinition, HumanDefinition } from "../definitions/utils.ts";
import { type GameConfig } from "./config.ts";
export type LevelMapDefinition=string|(MapDef&{base:string})

export type LevelEnemys={
    def:HumanDefinition
    team?:number
    name?:string
    count?:number
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
export type LevelCharacter=CharacterDefinition&{
    path?:string|string[]
    script_path?:string
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
    next_level?:{
        complete?:string
    }
    game_over?:GameOverScreen
    mode:GameConfig
    script?:string
    assets?:{
        assets?:Record<string,string>
        textures?:string[]
    }
}