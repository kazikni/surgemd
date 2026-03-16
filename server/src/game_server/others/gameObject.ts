import { BaseGameObject2D } from "common/engine/core.ts";
import { type Game } from "./game.ts";
import { type Human } from "../objects/human.ts";

export abstract class ServerGameObject extends BaseGameObject2D{
    abstract interact(user:Human):void
    can_interact(user:Human):boolean{
        return false
    }
    declare game:Game
}