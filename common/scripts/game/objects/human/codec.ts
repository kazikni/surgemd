import { Stream } from "../../../../engine/core.ts";
import { GameDefinition } from "../../../definitions/game_defs.ts";
import { LoadoutAccessoryDef, LoadoutBodyDef, LoadoutEyesDef, LoadoutFootDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "../../../definitions/loadout/skins.ts";
export interface HumanVisual{
    body:{
        def:LoadoutBodyDef
        tint:number
    }
    hair?:{
        def:LoadoutHairDef
        tint:number
        paint?:{
            tint:number
            id:number
        }
    }
    eyes?:LoadoutEyesDef
    foot?:LoadoutFootDef
    shirt:LoadoutShirtDef
    legs:LoadoutLegDef
    accessorys:LoadoutAccessoryDef[]
}

export function encode_visual(stream:Stream,visual:HumanVisual){
    stream.write_uint16(visual.body.def.id_number!)
    .write_uint16(visual.hair?.def.id_number??0)
    .write_uint16(visual.eyes?.id_number??0)
    .write_uint16(visual.shirt.id_number!)
    .write_uint16(visual.legs.id_number!)
    .write_uint16(visual.foot?.id_number??0)
    if(visual.hair){
        stream.write_uint32(visual.hair.tint)
        .write_uint8(visual.hair.paint?.id??0)
        if(visual.hair.paint?.id)stream.write_uint32(visual.hair.paint.tint)
    }
    stream.write_uint32(visual.body.tint)
    .write_array(visual.accessorys,(v)=>stream.write_uint16(v.id_number!),1)
}

export function decode_visual(stream:Stream,definitions:GameDefinition,visual:HumanVisual){
    visual.body.def=definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutBodyDef
    const hair=definitions.loadout.getFromNumberSafe(stream.read_uint16()) as LoadoutHairDef|undefined
    visual.eyes=definitions.loadout.getFromNumberSafe(stream.read_uint16()) as LoadoutEyesDef|undefined
    visual.shirt=definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutShirtDef
    visual.legs=definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutLegDef
    visual.foot=definitions.loadout.getFromNumberSafe(stream.read_uint16()) as LoadoutFootDef|undefined
    visual.hair=undefined
    if(hair){
        visual.hair={def:hair,tint:stream.read_uint32()}
        const paint=stream.read_uint8()
        if(paint)visual.hair.paint={id:paint,tint:stream.read_uint32()}
    }
    visual.body.tint=stream.read_uint32()
    visual.accessorys=stream.read_array(()=>definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutAccessoryDef,1)
}