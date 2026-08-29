import { GameComponent } from "common/engine/core.ts";
import { type Game } from "./game.ts";
import { type GeneralUpdate } from "common/scripts/packets/general_update.ts";

export abstract class GComponent<G=Game> extends GameComponent<G>{
    on_general_update(general:GeneralUpdate){}
}