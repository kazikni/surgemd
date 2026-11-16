import { CheckpointContext, CircleCollider2D, Stream, v2, v2m, Vec2 } from "../../../../engine/core.ts";
import { type LoadoutAccessoryDef, type LoadoutBodyDef, type LoadoutEyesDef, type LoadoutFootDef, type LoadoutHairDef, type LoadoutLegDef, type LoadoutShirtDef } from "../../../definitions/loadout/skins.ts";
import { HumanoidAnimations, type HumanoidMomentaryDef, type MomentaryPlayOptions } from "../../../definitions/objects/humanoid_animations.ts";
import { type LoadoutPreset } from "../../../definitions/utils.ts";
import { GameConstants } from "../../../others/constants.ts";
import { Floors, FloorType } from "../../../others/terrain.ts";
import { MovingBody } from "../moving_body.ts";
import { decode_visual, encode_visual, type HumanVisual } from "./codec.ts";

export class Humanoid extends MovingBody{
    name:string=""
    dead:boolean=false
    downed:boolean=false
    swimming:boolean=false
    scale:number=1
    down_timer:number=0

    secondary_velocity:Vec2=v2.zero()
    secondary_acceleration:number=1
    current_floor:FloorType=FloorType.Void

    visual!:HumanVisual&{dirty:boolean}

    momentary?:{
        def:HumanoidMomentaryDef
        time:number
        duration?:number
        on_end?:(completed:boolean)=>void
    }
    momentary_dirty:boolean=false

    constructor(){
        super()
        this.allow_tick=true
        this.allow_net_update=true
        this.base_collider=new CircleCollider2D(v2(0,0),GameConstants.humanoid.radius)
    }

    on_create(args:{position?:Vec2,name?:string,loadout?:LoadoutPreset}={}){
        if(args.position)this.position=args.position
        this.name=args.name??""
        this.visual={
            accessorys:[],
            body:{def:this.app.definitions.loadout.getFromString("body_1") as LoadoutBodyDef,tint:0x000000},
            legs:this.app.definitions.loadout.getFromString("blue_jeans_pants") as LoadoutLegDef,
            shirt:this.app.definitions.loadout.getFromString("red_shirt") as LoadoutShirtDef,
            dirty:true
        }
        this.set_loadout_preset(args.loadout)
    }

    on_tick(dt:number){
        if(this.momentary){
            this.momentary.time+=dt
            if(this.momentary.duration!==undefined&&this.momentary.time>=this.momentary.duration)this.stop_momentary(true)
        }
        this.current_floor=this.scene.map.terrain.get_floor_type(this.position,this.layer,this.scene.map.default_floor) as FloorType
        this.swimming=Floors[this.current_floor]?.deep===true
        if(this.down_timer>0)this.down_timer=Math.max(this.down_timer-dt,0)
        this.downed=this.down_timer>0
    }

    override push(speed:number,direction:number){
        v2m.add(this.secondary_velocity,this.secondary_velocity,v2.from_RadAngle(direction,speed))
    }

    play_momentary(def:string|HumanoidMomentaryDef,options:MomentaryPlayOptions={}):boolean{
        const d=typeof def==="string"?HumanoidAnimations.getFromString(def):def
        if(this.momentary&&!options.force&&(this.momentary.def.priority??0)>(d.priority??0))return false
        this.stop_momentary(false)
        let duration=d.duration
        if(duration===undefined&&!d.loop)duration=(d.keyframes??[]).reduce((t,k)=>t+k.time,0)
        this.momentary={def:d,time:0,duration:options.duration??duration,on_end:options.on_end}
        this.momentary_dirty=true
        return true
    }
    stop_momentary(completed:boolean=false){
        if(!this.momentary)return
        this.momentary.on_end?.(completed)
        this.momentary=undefined
        this.momentary_dirty=true
    }

    set_loadout_preset(preset?:LoadoutPreset){
        if(!preset)return
        const loadout=this.app.definitions.loadout
        const v=this.visual
        v.dirty=true
        if(preset.shirt)v.shirt=loadout.getFromString(preset.shirt) as LoadoutShirtDef
        if(preset.legs)v.legs=loadout.getFromString(preset.legs) as LoadoutLegDef
        if(preset.foot!==undefined)v.foot=loadout.getFromStringSafe(preset.foot??"") as LoadoutFootDef|undefined
        if(preset.eyes)v.eyes=loadout.getFromString(preset.eyes) as LoadoutEyesDef
        if(preset.hair!==undefined){
            v.hair=preset.hair===""?undefined:{def:loadout.getFromString(preset.hair) as LoadoutHairDef,tint:0}
        }
        if(v.hair){
            if(preset.hair_tint!==undefined)v.hair.tint=preset.hair_tint
            if(preset.hair_paint!==undefined)v.hair.paint=preset.hair_paint
        }
        if(preset.body)v.body={def:loadout.getFromString(preset.body) as LoadoutBodyDef,tint:0}
        if(preset.body_tint!==undefined)v.body.tint=preset.body_tint
        if(preset.accessorys!==undefined)v.accessorys=preset.accessorys.map((a)=>loadout.getFromString(a) as LoadoutAccessoryDef)
    }

    on_encode_net(stream:Stream,full:boolean){
        const visual=full||this.visual.dirty
        const momentary=full||this.momentary_dirty
        stream.write_boolean_group(visual,momentary,this.dead,this.downed,this.swimming,full&&this.name.length>0)
        stream.write_pos2(this.position).write_rad(this.rotation)
        if(full)stream.write_float32(this.scale)
        if(visual)encode_visual(stream,this.visual)
        if(momentary){
            stream.write_boolean_group(this.momentary!==undefined)
            if(this.momentary)stream.write_uint16(this.momentary.def.id_number!).write_float32(this.momentary.time)
        }
        if(full&&this.name.length>0)stream.write_string(this.name,1)
    }
    on_net_update(){
        this.visual.dirty=false
        this.momentary_dirty=false
    }

    on_encode_checkpoint(stream:Stream,_ctx:CheckpointContext){
        stream.write_pos2(this.position)
        .write_pos2(this.velocity)
        .write_rad(this.rotation)
        .write_boolean_group(this.dead)
        .write_string(this.name,1)
        .write_float32(this.down_timer)
        .write_float32(this.scale)
        encode_visual(stream,this.visual)
    }
    on_decode_checkpoint(stream:Stream,_ctx:CheckpointContext){
        this.position=stream.read_pos2()
        this.velocity=stream.read_pos2()
        this.rotation=stream.read_rad()
        this.dead=stream.read_boolean_group()[0]
        this.name=stream.read_string(1)
        this.down_timer=stream.read_float32()
        this.scale=stream.read_float32()
        decode_visual(stream,this.app.definitions,this.visual)
        this.visual.dirty=true
        this.set_dirty_full()
    }
}
