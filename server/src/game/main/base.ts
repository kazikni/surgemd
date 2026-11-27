import { BaseSceneObject2D, type AbstractApplication, Scene2D, SceneGELO } from "common/engine/core.ts";
import { type GameDefinition } from "common/scripts/definitions/game_defs.ts";
import { type SI_GameMap } from "../gelo/map.ts";
import { type SI_Deadzone } from "../gelo/deadzone.ts";
import { ModeManager } from "../modes/mode_manager.ts";
import { type DamageSplash } from "../objects/damage_splash.ts";

export type SimApplication={
    definitions:GameDefinition
}&AbstractApplication

export type SimulatedScene={
    app:SimApplication
    map:SI_GameMap
    mode:ModeManager<any,any>
    deadzone?:SI_Deadzone
    damage_splashes:Record<number,DamageSplash[]>
}&Scene2D<any,any>
export type SimulatedObject=BaseSceneObject2D&{
    scene:SimulatedScene
    app:SimApplication
}
export enum GELONet{
    None,
    General,
    Start,
    Joined,
}
export type SimulatedGELO=SceneGELO&{
    app:SimApplication
    scene:SimulatedScene
    net:GELONet
    net_dirty:boolean
}

export class SimObject extends BaseSceneObject2D{
    declare app:SimApplication
    declare scene:SimulatedScene
}
