import { ConsoleContext, ConsoleLogger, GameConsole } from "common/engine/core.ts";
import { type Game } from "../others/game.ts";

export interface CommandCTX extends ConsoleContext{
    game:Game
    logger:ConsoleLogger
}

export class DebugConsole<CTX extends CommandCTX=CommandCTX> extends GameConsole<CTX>{
    constructor(game:Game,ctx?:Partial<CTX>){
        super({
            game,
            ...ctx??{}
        } as CTX)
    }
}