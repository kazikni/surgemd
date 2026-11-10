import { GELComponent } from "../../../engine/core.ts";
import { type GameConfig } from "../../config/config.ts";
import { get_map_def } from "../../definitions/maps/maps.ts";
import { gelo_instance_type } from "../../others/constants.ts";
import { type SimulatedScene } from "../base.ts";
import { type SI_Deadzone } from "../gelo/deadzone.ts";
import { type SI_GameMap } from "../gelo/map.ts";
import { si_mode, type SI_Mode } from "../gelo/mode.ts";
import { type BattleRoyaleSettings, si_battle_royale, type SI_BattleRoyale } from "./battle_royale.ts";

/**
 * Modos de jogo por nome (config.jsonc: play_options[].content[].mode).
 * Para criar um modo novo: faca um componente que estende si_mode e registre aqui.
 */
export const GameModes:Record<string,GELComponent<any>>={
    basic:si_mode,
    normal:si_battle_royale,
    battle_royale:si_battle_royale,
}
export function get_game_mode(name?:string):GELComponent<any>{
    return GameModes[name??"normal"]??GameModes.normal
}

/**
 * Configuracao de um jogo (config.jsonc: play_options[].content[].settings).
 */
export type GameSettings=BattleRoyaleSettings&{
    map?:{
        /** Nome do mapa (ver definitions/maps/maps.ts) */
        def?:string
        seed?:number
    }
}

/**
 * Monta uma cena de simulacao: modo + mapa + deadzone.
 * E usado igual pelo servidor, pelo worker e pelo modo local (self). A cena so precisa saber
 * criar os gelos (make_gelo) com os componentes certos para ela (si_ no servidor, ccs_ no cliente).
 *
 * A ordem importa: o mapa usa as loot tables do modo, e a deadzone usa o tamanho do mapa.
 */
export function setup_game_scene(scene:SimulatedScene,config:GameConfig):SI_Mode{
    const settings=(config.settings??{}) as GameSettings

    const mode=scene.make_gelo(gelo_instance_type.mode,config.mode) as SI_Mode
    scene.mode=mode
    scene.gelo.registry(mode,"mode")

    const br=mode as SI_BattleRoyale
    if(br.configure_battle_royale){
        br.configure_battle_royale({
            ...settings,
            group_size:settings.group_size??config.group_size,
        })
    }

    const map=scene.make_gelo(gelo_instance_type.map) as SI_GameMap
    scene.map=map
    scene.gelo.registry(map,"map")
    map.generate(get_map_def(settings.map?.def),settings.map?.seed)

    const deadzone=scene.make_gelo(gelo_instance_type.deadzone) as SI_Deadzone
    scene.deadzone=deadzone
    scene.gelo.registry(deadzone,"deadzone")

    return mode
}
