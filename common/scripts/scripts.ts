import * as core from "common/engine/core.ts";

import * as c_background_effect from "./config/background_effect.ts"
import * as c_book from "./config/book.ts"
import * as c_config from "./config/config.ts"
import * as c_level_definition from "./config/level_definition.ts"

import * as d_m_base from "./definitions/maps/base.ts"
import * as d_m_normal from "./definitions/maps/normal.ts"
import * as d_tables from "./definitions/loot_tables.ts"

import * as o_accessorys from "./others/accessorys.ts"
import * as o_constants from "./others/constants.ts"
import * as o_functions from "./others/functions.ts"
import * as o_inventory from "./others/inventory.ts"
import * as o_item from "./others/item.ts"
import * as o_terrain from "./others/terrain.ts"

import * as p_gameover from "./packets/gameOver.ts"
import * as p_join from "./packets/join_packet.ts"
import * as p_messages from "./packets/messages.ts"
import * as p_packet_manager from "./packets/packet_manager.ts"

export const globals:Record<string,any>={
    ...core,

    ...c_background_effect,
    ...c_book,
    ...c_config,
    ...c_level_definition,

    ...d_m_base,
    ...d_tables,
    ...d_m_normal,

    ...o_accessorys,
    ...o_constants,
    ...o_functions,
    ...o_inventory,
    ...o_item,
    ...o_terrain,

    ...p_gameover,
    ...p_join,
    ...p_messages,
    ...p_packet_manager
}