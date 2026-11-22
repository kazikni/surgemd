import { type DamageParams } from "../objects/projectile/projectile.ts";
import { random, v2, Vec2 } from "common/engine/core.ts";
import { type MapDef } from "../maps/base.ts";
import { get_map_def } from "../maps/maps.ts";
import { gelo_instance_type, HumanAnimationType, LootData, object_instance_type } from "common/scripts/others/constants.ts";
import { type SI_GameMap } from "../gelo/map.ts";
import { type Human } from "../objects/human/human.ts";
import { DefaultHumanLoadout, DefaultPlayerStatus, ModeManager, type PlayerStatus } from "./mode_manager.ts";
import { human_events } from "../objects/human/events.ts";
import { HumanAnimations } from "common/scripts/definitions/player/human_animations.ts";
import { BoostDef } from "common/scripts/definitions/player/boosts.ts";

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
    override on_initialized(){
        const respawn_time=5
        for(let i=0;i<5;i++){
            const position=v2(this.scene.map.size.x/2+6-i*3,this.scene.map.size.y/2-5)
            const h=this.scene.add_object(this.scene.make_object(object_instance_type.human),this.spawn_layer,undefined,{
                name:"Test Man-"+i,
                loadout:DefaultHumanLoadout,
                position
            }) as Human
            let gift:LootData[]=[]
            h.drop_on_death_enabled=false
            let boost_v:number=0
            let boost_def:BoostDef=this.app.definitions.boosts.getFromString("adrenaline")
            h.on(human_events.die,(params:DamageParams,health_damage:number)=>{
                const loots=h.inventory.drop_all()
                for(let j=0;j<gift.length;j++){
                    h.inventory.give_loot(gift[j],false)
                }
                h.animations.push({type:HumanAnimationType.Emote,id:this.app.definitions.game_objects.keysString["skull"]})
                h.position=position
                this.app.clock.add_timeout(()=>{
                    h.revive()
                    for(const l of loots){
                        l.destroy()
                    }
                },respawn_time)
                h.boost.def=boost_def
                h.boost.value=boost_v
            })
            switch(i){
                case 1:{
                    h.self_revive=true
                    h.on(human_events.knocked,()=>{
                        h.animations.push({type:HumanAnimationType.Emote,id:this.app.definitions.game_objects.keysString["heart"]})
                    })
                    break
                }
                case 2:{
                    gift.push(
                        {count:1,item:this.app.definitions.game_items.valueString["civil_vest"]},
                        {count:1,item:this.app.definitions.game_items.valueString["bike_helmet"]},
                        {count:1,item:this.app.definitions.game_items.valueString["basic_pack"]},
                    )
                    boost_v=100
                    boost_def=this.app.definitions.boosts.getFromString("adrenaline")
                    break
                }
                case 3:{
                    gift.push(
                        {count:1,item:this.app.definitions.game_items.valueString["military_vest"]},
                        {count:1,item:this.app.definitions.game_items.valueString["military_helmet"]},
                        {count:1,item:this.app.definitions.game_items.valueString["military_pack"]},
                    )
                    boost_v=100
                    boost_def=this.app.definitions.boosts.getFromString("shield")
                    break
                }
                case 4:{
                    gift.push(
                        {count:1,item:this.app.definitions.game_items.valueString["tactical_vest"]},
                        {count:1,item:this.app.definitions.game_items.valueString["tactical_helmet"]},
                        {count:1,item:this.app.definitions.game_items.valueString["tactical_pack"]},
                    )
                    boost_v=100
                    boost_def=this.app.definitions.boosts.getFromString("green_bless")
                    break
                }
            }
            if(i!==0){
                gift.push(
                    {count:80,item:this.app.definitions.game_items.valueString["p76"]},
                    {count:480,item:this.app.definitions.game_items.valueString["l19"]},
                    {count:600,item:this.app.definitions.game_items.valueString["l15"]},
                    {count:320,item:this.app.definitions.game_items.valueString["c51"]},
                    {count:320,item:this.app.definitions.game_items.valueString["c45"]},
                    {count:320,item:this.app.definitions.game_items.valueString["c22"]},

                    {count:1,item:this.app.definitions.game_items.valueString["medikit"]},
                    {count:1,item:this.app.definitions.game_items.valueString["bandage"]},
                    {count:1,item:this.app.definitions.game_items.valueString["yellow_soda"]},
                    {count:1,item:this.app.definitions.game_items.valueString["yellow_pills"]},
                    {count:1,item:this.app.definitions.game_items.valueString["blue_soda"]},
                    {count:1,item:this.app.definitions.game_items.valueString["blue_pills"]},
                    {count:1,item:this.app.definitions.game_items.valueString["red_beer"]},
                    {count:1,item:this.app.definitions.game_items.valueString["red_pills"]},

                    {count:1,item:this.app.definitions.game_items.valueString["m870"]},
                    {count:1,item:this.app.definitions.game_items.valueString["ak47"]},

                    {count:1,item:this.app.definitions.game_items.valueString["scope_2"]},
                    {count:1,item:this.app.definitions.game_items.valueString["scope_3"]},
                    {count:1,item:this.app.definitions.game_items.valueString["scope_4"]},
                )
                h.boost.def=boost_def
                h.boost.value=boost_v
            }
            for(let j=0;j<gift.length;j++){
                h.inventory.give_loot(gift[j],false)
            }
        }
    }
    override on_start(){
    }
    override can_start():boolean{
        return this.players.count>0
    }
    override on_player_spawn(_p:unknown,h:Human){
        //h.play_momentary(HumanAnimations.getFromString("sit"),{force:true,duration:2})
        //h.app.clock.add_timeout(()=>h.play_momentary(HumanAnimations.getFromString("suicide"),{force:true}),5)
    }
    override on_human_die(h:Human,params:DamageParams){
        super.on_human_die(h,params)
        const p=this.players.of(h)
        if(p)this.respawn_player(p,this.settings.respawn_time??2)
    }
    override get_spawn_position(_h:Human):Vec2|undefined{
        return v2.add(v2.dscale(this.scene.map.size,2),v2(random.float(-2,2),random.float(-2,2)))
    }
    override async generate_map():Promise<void>{
        const map=this.scene.make_gelo(gelo_instance_type.map) as SI_GameMap
        this.scene.map=map
        this.scene.gelo.registry(map,"map")
        map.generate(get_map_def(this.settings.map?.def??"debug"),this.settings.map?.seed)

    }
}
