import { type GameMap } from "../../../server/src/game_server/others/map.ts";
import { type AbstractGame, type ModContext, ModModule } from "../../engine/core.ts";
import { GameConfig } from "../config/config.ts";
import { AmmoDef } from "../definitions/items/ammo.ts";
import { BackpackDef } from "../definitions/items/backpacks.ts";
import { ConsumibleDef } from "../definitions/items/consumibles.ts";
import { HelmetDef, VestDef } from "../definitions/items/equipaments.ts";
import { GrenadeDef } from "../definitions/items/grenades.ts";
import { GunDef } from "../definitions/items/guns.ts";
import { MeleeDef } from "../definitions/items/melees.ts";
import { ScopeDef } from "../definitions/items/scopes.ts";
export interface MDModModule<Game extends AbstractGame<any>, Ctx extends ModContext<Game, any>, Result = {}> extends ModModule<Game,Ctx,Result>{
    create_mode?(ctx:Ctx,game:GameConfig):boolean
    on_mode_init(ctx:Ctx,game:GameConfig):void
    on_map_generate(ctx:Ctx,map:GameMap):void
}
export interface GameADefinitions{
    items?:{
        ammos?:AmmoDef[]
        backpacks?:BackpackDef[]
        consumibles?:ConsumibleDef[]
        helmet?:HelmetDef[]
        vest?:VestDef[]
        grenades?:GrenadeDef[]
        guns?:GunDef[]
        melees?:MeleeDef[]
        scopes?:ScopeDef[]
    }
}
export interface ModResult{
    definitions?:GameADefinitions
}
