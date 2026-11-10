import { type GameConfig } from "../../config/config.ts";
import { type SimulatedScene } from "../base.ts";
import { BattleRoyale } from "./battle_royale.ts";
import { ModeManager, ModeSettings } from "./mode_manager.ts";

export type ModeFactory=new(settings:any)=>ModeManager<any,any>

export const GameModes:Record<string,ModeFactory>={
    normal:BattleRoyale,
    battle_royale:BattleRoyale,
}
export function get_game_mode(name?:string):ModeFactory{
    return GameModes[name??"normal"]??GameModes.normal
}

export function setup_game_scene(scene:SimulatedScene,config:GameConfig):ModeManager<any,any>{
    const Mode=get_game_mode(config.mode)
    const settings:ModeSettings&{group_size?:number}={...(config.settings??{})}
    if(config.group_size!==undefined)settings.group_size??=config.group_size
    const mode=new Mode(settings)
    mode.init(scene)
    return mode
}