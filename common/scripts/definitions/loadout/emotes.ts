import { Definition, Definitions } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";
import { GameObjectDefinitionType } from "../utils.ts";

export interface EmoteDef extends Definition{
    def_type?:GameObjectDefinitionType.emote
    rank:ItemRank
    use_sound?:string
}
export function Emotes_Default_Init(emotes:Definitions<EmoteDef,{}>){
    emotes.insert(
        // Face
        {idString:"happy",rank:ItemRank.E},
        {idString:"sad",rank:ItemRank.E},
        {idString:"neutral",rank:ItemRank.E},
        {idString:"angry",rank:ItemRank.E},
        {idString:"angry_swearing",rank:ItemRank.D},
        {idString:"very_love",rank:ItemRank.B},
        {idString:"demon",rank:ItemRank.B},
        {idString:"peading",rank:ItemRank.B},

        // Objects
        {idString:"heart",rank:ItemRank.D},
        {idString:"skull",rank:ItemRank.E},
        {idString:"ghost",rank:ItemRank.E},

        // Logo
        {idString:"logo_md",rank:ItemRank.E},
        {idString:"logo_campfire",rank:ItemRank.E},
        {idString:"logo_knife",rank:ItemRank.E},
        {idString:"logo_vasco_da_gama",rank:ItemRank.S,use_sound:"emote_play_vasco_da_gama"},

        // Text
        {idString:"gg",rank:ItemRank.D},

        /*
        {idString:"flag_albania",rank:ItemRank.E},
        {idString:"flag_algeria",rank:ItemRank.E},
        {idString:"flag_argentina",rank:ItemRank.E},
        {idString:"flag_australia",rank:ItemRank.E},
        {idString:"flag_austria",rank:ItemRank.E},
        {idString:"flag_azerbaijan",rank:ItemRank.E},
        {idString:"flag_belarus",rank:ItemRank.E},
        {idString:"flag_belgium",rank:ItemRank.E},
        {idString:"flag_bolivia",rank:ItemRank.E},
        {idString:"flag_bosnia_and_herzegovina",rank:ItemRank.E},
        {idString:"flag_brazil",rank:ItemRank.E},
        {idString:"flag_canada",rank:ItemRank.E},
        {idString:"flag_chile",rank:ItemRank.E},
        {idString:"flag_china",rank:ItemRank.E},
        {idString:"flag_colombia",rank:ItemRank.E},
        {idString:"flag_croatia",rank:ItemRank.E},
        {idString:"flag_czech_republic",rank:ItemRank.E},
        {idString:"flag_denmark",rank:ItemRank.E},
        {idString:"flag_dominican_republic",rank:ItemRank.E},
        {idString:"flag_ecuador",rank:ItemRank.E},
        {idString:"flag_egypt",rank:ItemRank.E},
        {idString:"flag_estonia",rank:ItemRank.E},
        {idString:"flag_finland",rank:ItemRank.E},
        {idString:"flag_france",rank:ItemRank.E},
        {idString:"flag_georgia",rank:ItemRank.E},
        {idString:"flag_germany",rank:ItemRank.E},
        {idString:"flag_greece",rank:ItemRank.E},
        {idString:"flag_guatemala",rank:ItemRank.E},
        {idString:"flag_honduras",rank:ItemRank.E},
        {idString:"flag_hong_kong",rank:ItemRank.E},
        {idString:"flag_hungary",rank:ItemRank.E},
        {idString:"flag_indonesia",rank:ItemRank.E},
        {idString:"flag_israel",rank:ItemRank.E},
        {idString:"flag_italy",rank:ItemRank.E},
        {idString:"flag_japan",rank:ItemRank.E},
        {idString:"flag_kazakhstan",rank:ItemRank.E},
        {idString:"flag_latvia",rank:ItemRank.E},
        {idString:"flag_lithuania",rank:ItemRank.E},
        {idString:"flag_malaysia",rank:ItemRank.E},
        {idString:"flag_mexico",rank:ItemRank.E},
        {idString:"flag_moldova",rank:ItemRank.E},
        {idString:"flag_morocco",rank:ItemRank.E},
        {idString:"flag_netherlands",rank:ItemRank.E},
        {idString:"flag_new_zealand",rank:ItemRank.E},
        {idString:"flag_norway",rank:ItemRank.E},
        {idString:"flag_palestine",rank:ItemRank.E},
        {idString:"flag_peru",rank:ItemRank.E},
        {idString:"flag_philippines",rank:ItemRank.E},
        {idString:"flag_portugal",rank:ItemRank.E},
        {idString:"flag_republic_of_poland",rank:ItemRank.E},
        {idString:"flag_romania",rank:ItemRank.E},
        {idString:"flag_russia",rank:ItemRank.E},
        {idString:"flag_serbia",rank:ItemRank.E},
        {idString:"flag_singapore",rank:ItemRank.E},
        {idString:"flag_slovakia",rank:ItemRank.E},
        {idString:"flag_south_korea",rank:ItemRank.E},
        {idString:"flag_spain",rank:ItemRank.E},
        {idString:"flag_sweden",rank:ItemRank.E},
        {idString:"flag_switzerland",rank:ItemRank.E},
        {idString:"flag_taiwan",rank:ItemRank.E},
        {idString:"flag_thailand",rank:ItemRank.E},
        {idString:"flag_trinidad_and_tobago",rank:ItemRank.E},
        {idString:"flag_turkey",rank:ItemRank.E},
        {idString:"flag_ukraine",rank:ItemRank.E},
        {idString:"flag_united_arab_emirates",rank:ItemRank.E},
        {idString:"flag_united_kingdom",rank:ItemRank.E},
        {idString:"flag_united_states_of_america",rank:ItemRank.E},
        {idString:"flag_uruguay",rank:ItemRank.E},
        {idString:"flag_venezuela",rank:ItemRank.E},
        {idString:"flag_vietnam",rank:ItemRank.E},*/
    )
}
