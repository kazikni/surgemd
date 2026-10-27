import { BaseGameObject2D } from "common/engine/core.ts";
import { type Game } from "./game.ts";
import { type Human } from "../objects/human.ts";
import { ServerGameScene2D } from "./scene.ts";

export abstract class ServerGameObject extends BaseGameObject2D{
    on_interact(_user:Human):void{}
    can_interact(_user:Human):boolean{
        return false
    }
    declare game:Game
    declare scene:ServerGameScene2D
}