import { Hitbox2D } from "common/engine/core.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { DamageParams } from "../others/utils.ts";
import { type Human } from "./human.ts";
import { SideEffect } from "common/scripts/definitions/player/effects.ts";
export interface StairData{
    index:number
    hitbox:Hitbox2D
    base_hitbox:Hitbox2D
    dest_layer:number
}
export type StaticBodyPhysicalData={
    spawn_hitbox:Hitbox2D
    hitbox:Hitbox2D
    interaction_hitbox:Hitbox2D

    reflect_bullets:boolean
    no_collision:boolean
    no_pathfinding_collision:boolean
    no_bullets_collision:boolean
    passable_by_bullets:boolean

    stairs:StairData[]
}
export abstract class StaticBody extends ServerGameObject{
    string_type:string="static_body"
    number_type:number=GameObjectType.StaticBody

    spawn_hitbox!:Hitbox2D
    interaction_hitbox!:Hitbox2D

    abstract physical_data:StaticBodyPhysicalData

    constructor(){
        super()
    }

    override update_hitbox(): void {
        super.update_hitbox()
        this.cell_rect=this.hitbox.to_rect()
    }
    damage(_params:DamageParams){}
    side_effect(_sf:SideEffect,_owner?:Human){}
}