import { type LootData } from "../others/constants.ts";
import { Hitbox2D, Vec2 } from "../../engine/core.ts";
import { type ObstacleDef } from "../definitions/objects/obstacles.ts";

export interface MovingBodyBase{
    rotation:number
}
export interface LootBase{
    loot_data:LootData
}

export type StaticBodyPhysicalData={
    hitbox:Hitbox2D

    no_collision:boolean
    no_bullets_collision:boolean
    passable_by_bullets:boolean
}

export interface BaseStaticBodyPH<PhysicalData=StaticBodyPhysicalData>{
    physical_data:PhysicalData
}

export interface ObstacleBase{
    def:ObstacleDef
}