import { type MapDef } from "./base.ts";
import { NormalMap } from "./normal.ts";
import { TundraMap } from "./tundra.ts";
import { DebugMap } from "./debug.ts";

export const Maps:Record<string,MapDef>={
    normal:NormalMap,
    tundra:TundraMap,
    debug:DebugMap,
}
export function get_map_def(def?:MapDef|string):MapDef{
    if(def===undefined)return NormalMap
    if(typeof def==="string")return Maps[def]??NormalMap
    return def
}
