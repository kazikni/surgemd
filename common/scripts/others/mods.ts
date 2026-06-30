import { type GameMap } from "../../../server/src/game/others/map.ts";
import { type AbstractGame, type ModContext, ModModule } from "../../engine/core.ts";
import { GameConfig } from "../config/config.ts";
import { GameADefinitions } from "../definitions/game_defs.ts";
export interface MDModModule<Game extends AbstractGame<any>, Ctx extends ModContext<Game, any>, Result = {}> extends ModModule<Game,Ctx,Result>{
    create_mode?(ctx:Ctx,game:GameConfig):boolean
    on_mode_init(ctx:Ctx,game:GameConfig):void
    on_map_generate(ctx:Ctx,map:GameMap):void
}
export interface ModResult{
    definitions?:GameADefinitions
}
