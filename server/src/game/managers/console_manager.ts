import { CommandDef, ConsoleContext, ConsoleLogger, GameConsole } from "common/engine/core.ts";
import { type Game } from "../others/game.ts";
import { type Human } from "../objects/human.ts";

export interface CommandCTX extends ConsoleContext{
    game:Game
    logger:ConsoleLogger
    owner?:Human
}
const SpawnCMD:CommandDef<CommandCTX>={
    name:"spawn",
    childrens:[
        {
            name:"item",
            flags:{
                item:{
                    type:"string"
                },
                count:{
                    type:"int",
                    default:1
                }
            },
            flags_orden:["item"],
            execute(ctx){
                const def=ctx.game.definitions.game_items.valueString[ctx.args.item]
                if(ctx.owner&&def){
                    ctx.game.scene_2d.add_loot(ctx.owner.position,{item:def,count:ctx.args.count},ctx.owner.layer)
                }
            }
        }
    ]
}
export class DebugConsole<CTX extends CommandCTX=CommandCTX> extends GameConsole<CTX>{
    constructor(game:Game,ctx?:Partial<CTX>){
        super({
            game,
            ...ctx??{}
        } as CTX)
        this.register(SpawnCMD)
    }
}