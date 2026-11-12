import { gel_events, GELComponent, Stream } from "../../../../engine/core.ts";
import { get_momentary_variation, HumanoidAnimations, type HumanoidMomentaryDef } from "../../../definitions/objects/humanoid_animations.ts";
import { type GameItemType } from "../../../definitions/utils.ts";
import { LoadoutAccessoryDef, LoadoutBodyDef, LoadoutEyesDef, LoadoutFootDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "../../../definitions/loadout/skins.ts";
import { LoadoutPreset } from "../../../definitions/utils.ts";
import { type CommonObject, type SimulatedObject } from "../../base.ts";
import { moving_body_events } from "../moving_body/moving_body.ts";

export const humanoid_events={
    visual_changed:moving_body_events.last+1,
    momentary_changed:moving_body_events.last+2,
    pose_reset:moving_body_events.last+3,
    last:moving_body_events.last+4,
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


export interface HumanoidMomentaryState{
    def:HumanoidMomentaryDef
    variation:number
    time:number
    duration?:number
}

export interface MomentaryPlayOptions{
    item?:{id_string:string,item_type?:GameItemType}
    duration?:number
    force?:boolean
    on_end?:(completed:boolean)=>void
}

export interface C_Humanoid_Animation extends CommonObject{
    momentary?:HumanoidMomentaryState
    get_momentary_keyframes():HumanoidMomentaryDef["keyframes"]
    encode_momentary(stream:Stream):void
    decode_momentary(stream:Stream):boolean
}

export const c_humanoid_animation:GELComponent<C_Humanoid_Animation>={
    id_string:"c_humanoid_animation",
    methods:{
        get_momentary_keyframes(){
            const m=this.momentary
            if(!m)return undefined
            if(m.variation>=0&&m.def.variations?.[m.variation])return m.def.variations[m.variation].keyframes
            return m.def.keyframes
        },
        encode_momentary(stream:Stream){
            const m=this.momentary
            stream.write_boolean_group(m!==undefined)
            if(!m)return
            stream.write_uint16(m.def.id_number!)
            .write_int8(m.variation)
            .write_float32(m.time)
        },
        decode_momentary(stream:Stream):boolean{
            const [has]=stream.read_boolean_group()
            if(!has){
                const changed=this.momentary!==undefined
                this.momentary=undefined
                return changed
            }
            const def=HumanoidAnimations.getFromNumber(stream.read_uint16())
            const variation=stream.read_int8()
            const time=stream.read_float32()
            const changed=this.momentary?.def!==def||this.momentary.variation!==variation||time<this.momentary.time
            this.momentary={def,variation,time}
            return changed
        },
    },
}

export type SI_Humanoid_Animation=C_Humanoid_Animation&SimulatedObject&{
    momentary_dirty:boolean
    momentary_end?:(completed:boolean)=>void
    play_momentary(def:string|HumanoidMomentaryDef,options?:MomentaryPlayOptions):boolean
    stop_momentary(completed?:boolean):void
    is_momentary(id?:string):boolean
}

function momentary_duration(def:HumanoidMomentaryDef,variation:number):number|undefined{
    const v=variation>=0?def.variations?.[variation]:undefined
    if(v?.duration!==undefined)return v.duration
    if(def.duration!==undefined)return def.duration
    if(def.loop)return undefined
    let total=0
    for(const k of v?.keyframes??def.keyframes??[])total+=k.time
    return total
}

export const si_humanoid_animation:GELComponent<SI_Humanoid_Animation>={
    id_string:"si_humanoid_animation",
    extensions:[c_humanoid_animation],
    events:{
        [gel_events.bind](){
            this.momentary_dirty=false
        },
        [gel_events.tick](dt:number){
            const m=this.momentary
            if(!m)return
            m.time+=dt
            if(m.duration!==undefined&&m.time>=m.duration)this.stop_momentary(true)
        },
        [gel_events.net_update](){
            this.momentary_dirty=false
        },
    },
    methods:{
        play_momentary(def:string|HumanoidMomentaryDef,options:MomentaryPlayOptions={}):boolean{
            const d=typeof def==="string"?HumanoidAnimations.getFromString(def):def
            if(this.momentary&&!options.force&&(this.momentary.def.priority??0)>(d.priority??0))return false
            if(this.momentary)this.stop_momentary(false)
            const variation=get_momentary_variation(d,options.item)
            this.momentary={
                def:d,
                variation,
                time:0,
                duration:options.duration??momentary_duration(d,variation),
            }
            this.momentary_end=options.on_end
            this.momentary_dirty=true
            if(this.manager)this.set_dirty_part()
            this.emit_event(humanoid_events.momentary_changed,this.momentary)
            return true
        },
        stop_momentary(completed:boolean=false){
            if(!this.momentary)return
            const end=this.momentary_end
            this.momentary=undefined
            this.momentary_end=undefined
            this.momentary_dirty=true
            if(this.manager)this.set_dirty_part()
            this.emit_event(humanoid_events.momentary_changed,undefined)
            end?.(completed)
        },
        is_momentary(id?:string):boolean{
            if(!this.momentary)return false
            return id===undefined||this.momentary.def.id_string===id
        },
    },
}
