import { type BaseSceneObject2D, type AbstractApplication, Scene2D, SceneGELO } from "../../engine/core.ts";
import { type GameDefinition } from "../definitions/game_defs.ts";
import { type C_GameMap, type SI_GameMap } from "./gelo/map.ts";
import { type SI_Deadzone } from "./gelo/deadzone.ts";
import { ModeManager } from "./modes/mode_manager.ts";

export type CommonApplication={
    definitions:GameDefinition
}&AbstractApplication

export type CommonPlayScene={
    app:CommonApplication
    map:C_GameMap
}&Scene2D<any,any>
export type CommonObject=BaseSceneObject2D&{
    app:CommonApplication
    scene:CommonPlayScene
}
export type CommonGELO=SceneGELO&{
    app:CommonApplication
    scene:CommonPlayScene
}

export type SimulatedScene={
    app:CommonApplication
    map:SI_GameMap
    mode:ModeManager<any,any>
    deadzone?:SI_Deadzone
}&Scene2D<any,any>
export type SimulatedObject=BaseSceneObject2D&{
    scene:SimulatedScene
    app:CommonApplication
}
export type SimulatedGELO=SceneGELO&{
    app:CommonApplication
    scene:SimulatedScene
}