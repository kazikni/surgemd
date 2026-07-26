import { v2 } from "../../../engine/core.ts";
import { FloorType } from "../../others/terrain.ts";
import { LootTables } from "../loot_tables.ts";
import { buildings_factory } from "../objects/buildings_base.ts";
import { type MapDef } from "./base.ts";
import { FallBiome } from "./normal.ts";

export const TutorialMap:MapDef={
    loot_tables:LootTables,
    biome:FallBiome,
    size:v2(100,100),
    bounds_size:0,
    definitions:{
        objects:{
            buildings:[
                ...buildings_factory.small_bunker("main_structure")
            ],
        }
    },
    generation:{
        base:FloorType.Grass,
        objects:{
            buildings:[
                {def:"main_structure",position:v2(10,50),side:0}
            ]
        }
    },
}
export const map=TutorialMap