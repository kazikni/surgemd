import { CommandDef, ConsoleContext, ConsoleLogger, GameConsole } from "common/engine/core.ts";
import { type Game } from "../others/game.ts";

export interface CommandCTX extends ConsoleContext{
    game:Game
    logger:ConsoleLogger
}
export const ClearGameCommand:CommandDef<CommandCTX>={
    name:"clear",
    flags: {},
    flags_orden: [],
    execute(ctx){
        ctx.logger.clear()
    }
}
export const JoinGameCommand:CommandDef<CommandCTX>={
    name:"join",
    flags: {
        address: {
            type: "string"
        }
    },
    flags_orden: [
        "address"
    ],
    execute(ctx){
        ctx.logger.log("Connecting Into: ",ctx.args.address)
        ctx.game.play_game({
            type:"join",
            password:"",
            url:ctx.args.address
        })
    }
}
export class DebugConsole<CTX extends CommandCTX=CommandCTX> extends GameConsole<CTX>{
    constructor(game:Game,ctx?:Partial<CTX>){
        super({
            game,
            ...ctx??{}
        } as CTX)
        this.register(ClearGameCommand)
        this.register(JoinGameCommand)
    }
}