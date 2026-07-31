import { Vec2 } from "../../engine/core.ts";
import { MapDef } from "../definitions/maps/base.ts";
import { CharacterDefinition, HumanDefinition } from "../definitions/utils.ts";
export type LevelMapDefinition=string|(MapDef&{base:string})

export type LevelEnemys={
    def:HumanDefinition|string
    team?:number
    name?:string
    position?:Vec2
    count?:number
}[]
export type LevelMode={
    map: {
        def:LevelMapDefinition
        seed?:number
    }
    deadzone?:{
        stage?:number
    }
    settings?:any
    enemies:LevelEnemys[]
}&({
    type:"kill_all_enemies",
}|{
    type:"battle_royale"
    group_size:number
    teams?:number
}|{
    type:"debug"
})
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
    cutscenes?:{
        begin?:string
    }
    mode:LevelMode
    player: LevelCharacter
    characters_selection?:{
        spawn_other?:boolean
        characters:LevelCharacter[]
    }
    assets?:{
        background_music?:string
        assets?:Record<string,string>
        textures?:string[]
    }
    definitions?:{
        enemies?:Record<string,LevelCharacter>
    }
    npcs?:LevelCharacter[]
}