import { ClientGameObject2D } from "common/engine/client.ts";
import { type Game } from "./game.ts";
import { type Human } from "../objects/human.ts";

export abstract class GameObject extends ClientGameObject2D{
    declare game:Game
    can_interact(human:Human):boolean{return false}
    interact(human:Human):void{}
    get_interact_hint(human:Human): string{return ""}
    auto_interact(human:Human):boolean{return false}
}