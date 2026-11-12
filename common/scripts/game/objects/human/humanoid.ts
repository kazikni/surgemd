import { gel_events, GELComponent, Stream } from "../../../../engine/core.ts";
import { LoadoutAccessoryDef, LoadoutBodyDef, LoadoutEyesDef, LoadoutFootDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "../../../definitions/loadout/skins.ts";
import { LoadoutPreset } from "../../../definitions/utils.ts";
import { type CommonObject, type SimulatedObject } from "../../base.ts";
import { moving_body_events } from "../moving_body/moving_body.ts";

export const humanoid_events={
    visual_changed:moving_body_events.last+1,
    last:moving_body_events.last+2,
}

export interface C_Humanoid_Visual extends CommonObject{
    visual:{
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

    encode_visual(stream:Stream):void
    decode_visual(stream:Stream):void
}

export const c_humanoid_visual:GELComponent<C_Humanoid_Visual>={
    id_string:"c_humanoid_visual",
    events:{
        [gel_events.create]:function(){
            this.visual={
                accessorys:[],
                body:{def:this.app.definitions.loadout.getFromString("body_1") as LoadoutBodyDef,tint:0x000000},
                legs:this.app.definitions.loadout.getFromString("blue_jeans_pants") as LoadoutLegDef,
                shirt:this.app.definitions.loadout.getFromString("black_shirt") as LoadoutShirtDef,
            }
        },
    },
    methods:{
        encode_visual(stream:Stream){
            stream.write_uint16(this.visual.body.def.id_number!)
            .write_uint16(this.visual.hair?.def.id_number??0)
            .write_uint16(this.visual.eyes?.id_number??0)
            .write_uint16(this.visual.shirt.id_number!)
            .write_uint16(this.visual.legs.id_number!)
            .write_uint16(this.visual.foot?.id_number??0)
            if(this.visual.hair){
                stream.write_uint32(this.visual.hair.tint)
                .write_uint8(this.visual.hair.paint?.id??0)
                if(this.visual.hair.paint?.id){
                    stream.write_uint32(this.visual.hair.paint.tint)
                }
            }
            stream.write_uint32(this.visual.body.tint)
            .write_array(this.visual.accessorys,(v)=>{
                stream.write_uint16(v.id_number!)
            },1)
            return stream
        },
        decode_visual(stream:Stream){
            this.visual.body.def=this.app.definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutBodyDef
            const hair_def=this.app.definitions.loadout.getFromNumberSafe(stream.read_uint16()) as LoadoutHairDef|undefined
            this.visual.eyes=this.app.definitions.loadout.getFromNumberSafe(stream.read_uint16()) as LoadoutEyesDef|undefined
            this.visual.shirt=this.app.definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutShirtDef
            this.visual.legs=this.app.definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutLegDef
            this.visual.foot=this.app.definitions.loadout.getFromNumberSafe(stream.read_uint16()) as LoadoutFootDef|undefined
            if(hair_def){
                this.visual.hair={
                    def:hair_def,
                    tint:stream.read_uint32()
                }
                const hair_paint_id=stream.read_uint8()
                if(hair_paint_id)this.visual.hair.paint={id:hair_paint_id,tint:stream.read_uint32()}
            }
            this.visual.body.tint=stream.read_uint32()
            this.visual.accessorys=stream.read_array(()=>this.app.definitions.loadout.getFromNumber(stream.read_uint16()) as LoadoutAccessoryDef,1)
        }
    }
}

export type SI_Humanoid_Visual=C_Humanoid_Visual&SimulatedObject&{
    visual:{
        dirty:boolean
    }
    set_loadout_preset(preset?:LoadoutPreset):void
}

export const si_humanoid_visual:GELComponent<SI_Humanoid_Visual>={
    id_string:"si_humanoid_visual",
    extensions:[c_humanoid_visual],
    events:{
        [gel_events.create]:function(){
            this.visual.dirty=true
        },
    },
    methods:{
        set_loadout_preset(preset?:LoadoutPreset){
            if(!preset)return
            this.visual.dirty=true
            if(preset.shirt)this.visual.shirt=this.app.definitions.loadout.getFromString(preset.shirt) as LoadoutShirtDef
            if(preset.legs)this.visual.legs=this.app.definitions.loadout.getFromString(preset.legs) as LoadoutLegDef
            if(preset.foot!==undefined)this.visual.foot=this.app.definitions.loadout.getFromStringSafe(preset.foot??"") as LoadoutFootDef
            if(preset.eyes)this.visual.eyes=this.app.definitions.loadout.getFromString(preset.eyes) as LoadoutEyesDef
            if(preset.hair!==undefined){
                if(preset.hair===""){
                    this.visual.hair=undefined
                }else{
                    this.visual.hair={
                        def:this.app.definitions.loadout.getFromString(preset.hair) as LoadoutHairDef,
                        tint:0,
                    }
                }
            }
            if(this.visual.hair){
                if(preset.hair_tint!==undefined)this.visual.hair.tint=preset.hair_tint
                if(preset.hair_paint!==undefined)this.visual.hair.paint=preset.hair_paint
            }
            if(preset.body)this.visual.body={
                def:this.app.definitions.loadout.getFromString(preset.body) as LoadoutBodyDef,
                tint:0
            }
            if(preset.body_tint!==undefined)this.visual.body.tint=preset.body_tint
            if(preset.accessorys!==undefined){
                this.visual.accessorys.length=0
                for(const a of preset.accessorys){
                    this.visual.accessorys.push(this.app.definitions.loadout.getFromString(a) as LoadoutAccessoryDef)
                }
            }
            if(this.manager)this.set_dirty_full()
            this.emit_event(humanoid_events.visual_changed)
        }
    }
}
