import { ModContext, ModManifest, ModsManager } from "common/engine/core.ts";
import { Game } from "./game.ts";
import { MDModModule, ModResult } from "common/scripts/others/mods.ts";
import { md_make_globals } from "common/scripts/others/mod_globals.ts";

export class SMDModManager extends ModsManager<ModManifest,Game,ModContext<Game,ModManifest>,ModResult,MDModModule<Game,ModContext<Game,ModManifest>,ModResult>>{
    override make_globals(): Record<string, any> {
        return {
            ...md_make_globals(),
            ...super.make_globals(),
        }
    }
}