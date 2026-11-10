import { Definition } from "../../../engine/core.ts";
import { ItemRank } from "../../others/item.ts";
import { GameObjectDefinitionType } from "../utils.ts";

export interface EmoteDef extends Definition{
    def_type?:GameObjectDefinitionType.emote
    rank:ItemRank
    use_sound?:string
    block_old_sound?:boolean
}
export function Emotes_Default_Init():EmoteDef[]{
    return [
        // Face
        {id_string:"happy",rank:ItemRank.E},
        {id_string:"sad",rank:ItemRank.E},
        {id_string:"neutral",rank:ItemRank.E},
        {id_string:"angry",rank:ItemRank.E},
        {id_string:"angry_swearing",rank:ItemRank.D},
        {id_string:"very_love",rank:ItemRank.B},
        {id_string:"demon",rank:ItemRank.B},
        {id_string:"pleading",rank:ItemRank.B},

        // Objects
        {id_string:"heart",rank:ItemRank.D},
        {id_string:"skull",rank:ItemRank.E},
        {id_string:"ghost",rank:ItemRank.E},

        // Logo
        {id_string:"logo_md",rank:ItemRank.E},
        {id_string:"logo_campfire",rank:ItemRank.E},
        {id_string:"logo_knife",rank:ItemRank.E},
        {id_string:"logo_vasco_da_gama",rank:ItemRank.S,use_sound:"emote_play_vasco_da_gama",block_old_sound:true},

        // Text
        {id_string:"gg",rank:ItemRank.D},

        /*
        {id_string:"flag_albania",rank:ItemRank.E},
        {id_string:"flag_algeria",rank:ItemRank.E},
        {id_string:"flag_argentina",rank:ItemRank.E},
        {id_string:"flag_australia",rank:ItemRank.E},
        {id_string:"flag_austria",rank:ItemRank.E},
        {id_string:"flag_azerbaijan",rank:ItemRank.E},
        {id_string:"flag_belarus",rank:ItemRank.E},
        {id_string:"flag_belgium",rank:ItemRank.E},
        {id_string:"flag_bolivia",rank:ItemRank.E},
        {id_string:"flag_bosnia_and_herzegovina",rank:ItemRank.E},
        {id_string:"flag_brazil",rank:ItemRank.E},
        {id_string:"flag_canada",rank:ItemRank.E},
        {id_string:"flag_chile",rank:ItemRank.E},
        {id_string:"flag_china",rank:ItemRank.E},
        {id_string:"flag_colombia",rank:ItemRank.E},
        {id_string:"flag_croatia",rank:ItemRank.E},
        {id_string:"flag_czech_republic",rank:ItemRank.E},
        {id_string:"flag_denmark",rank:ItemRank.E},
        {id_string:"flag_dominican_republic",rank:ItemRank.E},
        {id_string:"flag_ecuador",rank:ItemRank.E},
        {id_string:"flag_egypt",rank:ItemRank.E},
        {id_string:"flag_estonia",rank:ItemRank.E},
        {id_string:"flag_finland",rank:ItemRank.E},
        {id_string:"flag_france",rank:ItemRank.E},
        {id_string:"flag_georgia",rank:ItemRank.E},
        {id_string:"flag_germany",rank:ItemRank.E},
        {id_string:"flag_greece",rank:ItemRank.E},
        {id_string:"flag_guatemala",rank:ItemRank.E},
        {id_string:"flag_honduras",rank:ItemRank.E},
        {id_string:"flag_hong_kong",rank:ItemRank.E},
        {id_string:"flag_hungary",rank:ItemRank.E},
        {id_string:"flag_indonesia",rank:ItemRank.E},
        {id_string:"flag_israel",rank:ItemRank.E},
        {id_string:"flag_italy",rank:ItemRank.E},
        {id_string:"flag_japan",rank:ItemRank.E},
        {id_string:"flag_kazakhstan",rank:ItemRank.E},
        {id_string:"flag_latvia",rank:ItemRank.E},
        {id_string:"flag_lithuania",rank:ItemRank.E},
        {id_string:"flag_malaysia",rank:ItemRank.E},
        {id_string:"flag_mexico",rank:ItemRank.E},
        {id_string:"flag_moldova",rank:ItemRank.E},
        {id_string:"flag_morocco",rank:ItemRank.E},
        {id_string:"flag_netherlands",rank:ItemRank.E},
        {id_string:"flag_new_zealand",rank:ItemRank.E},
        {id_string:"flag_norway",rank:ItemRank.E},
        {id_string:"flag_palestine",rank:ItemRank.E},
        {id_string:"flag_peru",rank:ItemRank.E},
        {id_string:"flag_philippines",rank:ItemRank.E},
        {id_string:"flag_portugal",rank:ItemRank.E},
        {id_string:"flag_republic_of_poland",rank:ItemRank.E},
        {id_string:"flag_romania",rank:ItemRank.E},
        {id_string:"flag_russia",rank:ItemRank.E},
        {id_string:"flag_serbia",rank:ItemRank.E},
        {id_string:"flag_singapore",rank:ItemRank.E},
        {id_string:"flag_slovakia",rank:ItemRank.E},
        {id_string:"flag_south_korea",rank:ItemRank.E},
        {id_string:"flag_spain",rank:ItemRank.E},
        {id_string:"flag_sweden",rank:ItemRank.E},
        {id_string:"flag_switzerland",rank:ItemRank.E},
        {id_string:"flag_taiwan",rank:ItemRank.E},
        {id_string:"flag_thailand",rank:ItemRank.E},
        {id_string:"flag_trinidad_and_tobago",rank:ItemRank.E},
        {id_string:"flag_turkey",rank:ItemRank.E},
        {id_string:"flag_ukraine",rank:ItemRank.E},
        {id_string:"flag_united_arab_emirates",rank:ItemRank.E},
        {id_string:"flag_united_kingdom",rank:ItemRank.E},
        {id_string:"flag_united_states_of_america",rank:ItemRank.E},
        {id_string:"flag_uruguay",rank:ItemRank.E},
        {id_string:"flag_venezuela",rank:ItemRank.E},
        {id_string:"flag_vietnam",rank:ItemRank.E},*/
    ]
}
