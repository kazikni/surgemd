import { type GameConfig } from "../../config/config.ts";
import { type SimulatedScene } from "../base.ts";
import { BattleRoyale } from "./battle_royale.ts";
import { DebugMode } from "./debug.ts";
import { ModeManager } from "./mode_manager.ts";

export type ModeFactory=new(settings:any)=>ModeManager<any,any>

export const GameModes:Record<string,ModeFactory>={
    normal:BattleRoyale,
    battle_royale:BattleRoyale,
    debug:DebugMode,
}
export function get_game_mode(name?:string):ModeFactory{
    return GameModes[name??"normal"]??GameModes.normal
}

export async function setup_game_scene(scene:SimulatedScene,config:GameConfig):Promise<ModeManager<any,any>>{
    const Mode=get_game_mode(config.mode)
    const mode=new Mode(config.settings??{})
    await mode.init(scene)
    return mode
}