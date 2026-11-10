import { type BaseSceneObject2D, type AbstractApplication, Scene2D, SceneGELO, LootTablesManager } from "../../engine/core.ts";
import { type GameDefinition } from "../definitions/game_defs.ts";
import { type C_GameMap, type SI_GameMap } from "./gelo/map.ts";
import { C_Mode } from "./gelo/mode.ts";

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
    mode:C_Mode
}&Scene2D<any,any>
export type SimulatedObject=BaseSceneObject2D&{
    scene:SimulatedScene
    app:CommonApplication
}
export type SimulatedGELO=SceneGELO&{
    app:CommonApplication
    scene:SimulatedScene
}
