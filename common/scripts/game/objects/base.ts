import { type AbstractGame, type BaseGameObject2D, type Scene2DInstance } from "../../../engine/core.ts";
import { type GameDefinition } from "../../definitions/game_defs.ts";
import { SMapGEL, type MapGEL } from "../gel/map.ts";

export type BaseGame={
    definitions:GameDefinition
}&AbstractGame<any>

export type CommonScene={
    game:BaseGame
    map:MapGEL
}&Scene2DInstance
export type CommonObject=BaseGameObject2D&{
    game:BaseGame
    scene:CommonScene
}

export type SimulatedScene={
    game:BaseGame
    map:SMapGEL
}&Scene2DInstance
export type SimulatedObject=BaseGameObject2D&{
    scene:SimulatedScene
    game:BaseGame
}