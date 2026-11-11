import { random, v2, Vec2 } from "../../../engine/core.ts";
import { type MapDef } from "../../definitions/maps/base.ts";
import { get_map_def } from "../../definitions/maps/maps.ts";
import { type DamageParams, gelo_instance_type } from "../../others/constants.ts";
import { type SI_GameMap } from "../gelo/map.ts";
import { type SI_Human } from "../objects/moving_body/human.ts";
import { DefaultPlayerStatus, ModeManager, type PlayerStatus } from "./mode_manager.ts";

export interface DebugModeSettings{
    respawn_time?:number
    infinity_ammo?:boolean
    knock_enabled?:boolean
    map?:{
        def?:MapDef|string
        seed?:number
    }
}

export class DebugMode extends ModeManager<PlayerStatus,DebugModeSettings>{
    create_status():PlayerStatus{
        return DefaultPlayerStatus()
    }
    override on_init(){
        this.rules.humans.knock_enabled=this.settings.knock_enabled??false
    }
    override can_start():boolean{
        return this.players.count>0
    }
    override on_player_spawn(_p:unknown,h:SI_Human){
        if(this.settings.infinity_ammo??true)h.inventory.infinity_ammo=true
    }
    override on_human_die(h:SI_Human,params:DamageParams){
        super.on_human_die(h,params)
        const p=this.players.of(h)
        if(p)this.respawn_player(p,this.settings.respawn_time??2)
    }
    override get_spawn_position(_h:SI_Human):Vec2|undefined{
        return v2.add(v2.dscale(this.scene.map.size,2),v2(random.float(-2,2),random.float(-2,2)))
    }
    override async generate_map():Promise<void>{
        const map=this.scene.make_gelo(gelo_instance_type.map) as SI_GameMap
        this.scene.map=map
        this.scene.gelo.registry(map,"map")
        map.generate(get_map_def(this.settings.map?.def??"debug"),this.settings.map?.seed)
    }
}
