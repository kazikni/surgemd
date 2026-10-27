import { Hitbox2D, Stream, SeededRandom, v2, v2m, Vec2, DynamicStream, Rect, GameComponent, Scene2DInstance, AbstractGame, BaseGameObject2D } from "common/engine/core.ts";
import { MapBiomeDef } from "common/scripts/definitions/maps/base.ts"
import { MapRegion } from "common/scripts/packets/map_message.ts"
import { FloorType, River, TerrainManager } from "common/scripts/others/terrain.ts"
import { GameObjectType, Layers, SpawnMode, SpawnModeType } from "common/scripts/others/constants.ts"
import { GameDefinition } from "../definitions/game_defs.ts";
import { type StaticBody } from "../../../server/src/game/objects/static_body.ts";

export type map_gen_position=(hitbox:Hitbox2D,map:BaseGameMap,random:SeededRandom)=>Vec2
export type map_gen_valid=(hitbox:Hitbox2D,id:number,layer:number,mode:SpawnMode,map:BaseGameMap)=>boolean

export type BaseGame={
    definitions:GameDefinition
}&AbstractGame<any>
export interface BaseScene extends Scene2DInstance<any>{
    map:BaseGameMap
    deadzone:BaseDeadzone
}
export type SimulatedGameObject2D=BaseGameObject2D&{
    game:BaseGame
    scene:BaseScene
}

export abstract class BaseDeadzone extends GameComponent{
    abstract random_point_inside_cb(hitbox:Hitbox2D,map:BaseGameMap,random:SeededRandom):Vec2
}