import { type DamageReason } from "common/scripts/definitions/utils.ts";
import { Vec2 } from "common/engine/core.ts";
import { type Human } from "../objects/human.ts";
import { DamageSourceDef } from "common/scripts/definitions/game_defs.ts";

export interface DamageParams{
    amount:number
    resistence?:number
    critical:boolean

    owner?:Human
    source?:DamageSourceDef

    reason:DamageReason

    direction:number
    position:Vec2
}