import { Scene2DInstance, v2, Vec2,Stream } from "common/engine/core.ts";
import { type Game } from "./game.ts";
import { ServerGameObject } from "./gameObject.ts";
import { PingData } from "common/scripts/packets/update_packet.ts";
import { FeedMessage, MapZone } from "common/scripts/packets/general_update.ts";
import { BuildingPuzzle } from "../objects/building.ts";
import { LeaderboardPlayer } from "common/scripts/packets/gameOver.ts";
import { Human } from "../objects/human.ts";
import { DamageSourceDef } from "common/scripts/definitions/game_defs.ts";
import { AmmoDef } from "common/scripts/definitions/items/ammo.ts";
import { GameObjectType, Layers, LootData } from "common/scripts/others/constants.ts";
import { Bullet } from "../objects/bullet.ts";
import { ExplosionDef } from "common/scripts/definitions/objects/explosions.ts";
import { Explosion } from "../objects/explosion.ts";
import { Decal } from "../objects/decals.ts";
import { DecalDef, DecalTint } from "common/scripts/definitions/objects/decals.ts";
import { BadgeDef } from "common/scripts/definitions/loadout/badges.ts";
import { HumanBody } from "../objects/human_body.ts";
import { GrenadeDef } from "common/scripts/definitions/items/grenades.ts";
import { Grenade } from "../objects/grenade.ts";
import { VehicleDef } from "common/scripts/definitions/objects/vehicles.ts";
import { Loot } from "../objects/loot.ts";
import { Vehicle } from "../objects/vehicle.ts";
import { Creature } from "../objects/creature.ts";
import { CreatureDef } from "common/scripts/definitions/objects/creatures.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { Parachute } from "../objects/parachute.ts";
import { SyncedParticle, SyncedParticlesCreator } from "../objects/synced_particle.ts";
import { SyncedParticleDef } from "common/scripts/definitions/objects/synced_particles.ts";
import { Drone } from "../objects/drone.ts";
import { Plane } from "../objects/plane.ts";
import { Player } from "../objects/player.ts";
import { BaseDeadzone, BaseScene } from "common/scripts/objects/scene.ts";
import { type GameMap } from "./map.ts";

export class ServerGameScene2D extends Scene2DInstance<ServerGameObject> implements BaseScene{
    declare game:Game

    map:GameMap
    deadzone:BaseDeadzone

    always_visible:Record<number,ServerGameObject>={}
    pings:PingData[]=[]
    map_zones:MapZone[]=[]
    feed_messages:FeedMessage[]=[]
    puzzles:Record<string,BuildingPuzzle>={}

    leaderboards:LeaderboardPlayer[]=[]

    constructor(game:Game){
        super(game)

        this.map=game.map
        this.deadzone=game.deadzone

        this.objects.make_object_checkpoint=this.make_object_checkpoint.bind(this)
        this.objects.encode_object_checkpoint=this.encode_object_checkpoint.bind(this)
        this.objects.valid_encode_object_checkpoint=this.valid_encode_object_checkpoint.bind(this)
    }

    override clear(){
        super.clear()
        this.game.humans.clear_npcs()
        this.game.players.clear_bots()
        this.puzzles={}
        this.always_visible={}
        this.map_zones.length=0
        this.game.clock.clear()
        this.net_update()
    }
    override net_update(){
        super.net_update()
        this.pings.length=0
        this.feed_messages.length=0
    }

    on_start(){
        this.leaderboards.length=0
    }

    override make_object_checkpoint(stream: Stream, id: number | undefined, layer: number, t: number):ServerGameObject|undefined{
        if(t===GameObjectType.Human){
            const tp=stream.read_uint8()
            console.log("Human Type",tp)
            switch(tp){
                case 1:
                    return new Player()
            }
            return undefined
        }
        return super.make_object_checkpoint(stream,id,layer,t)
    }
    encode_object_checkpoint(stream: Stream, obj:ServerGameObject):void{
        if(obj.number_type===GameObjectType.Human){
            if(obj instanceof Player)stream.write_uint8(1)
            stream.write_uint8(0)
        }
    }
    valid_encode_object_checkpoint(obj:ServerGameObject):boolean{
        if(obj.number_type===GameObjectType.Human){
            if(!(obj instanceof Player))return false
        }
        return true
    }

    
    add_bullet(position:Vec2,owner?:Human,ammo?:AmmoDef,source?:DamageSourceDef,layer:number=Layers.Normal,critical_chance?:number):Bullet{
        const b=this.objects.add_object(new Bullet(),layer,undefined,{
            position:v2.clone(position),
            owner:owner,
            ammo:ammo,
            source,
            critical_chance,
        })as Bullet
        return b
    }
    add_explosion(position:Vec2,def:ExplosionDef,owner?:Human,source?:DamageSourceDef,layer:number=Layers.Normal):Explosion{
        const e=this.objects.add_object(new Explosion(),layer,undefined,{def:def,owner,position:position,source}) as Explosion
        return e
    }
    add_decal(position:Vec2,rotation:number,def:DecalDef,tint?:DecalTint,scale?:number,layer:number=Layers.Normal):Decal{
        const d=this.objects.add_object(new Decal(),layer,undefined,{def:def,position:position,rotation,tint,scale}) as Decal
        return d
    }
    add_human_body(position:Vec2,name:string,angle:number,badge?:BadgeDef,layer:number=Layers.Normal):HumanBody{
        const b=this.objects.add_object(new HumanBody(),layer,undefined,{name:name,badge:badge,position:position,angle}) as HumanBody
        return b
    }
    add_grenade(position:Vec2,def:GrenadeDef,owner?:Human,layer:number=Layers.Normal):Grenade{
        const p=this.objects.add_object(new Grenade(),layer,undefined,{def:def,owner,position:position}) as Grenade
        return p
    }
    add_loot(position:Vec2,data:LootData,layer:number=Layers.Normal):Loot{
        const l=this.objects.add_object(new Loot(),layer,undefined,{loot:data,position}) as Loot
        if(this.game.statistics){
            this.game.statistics.items.dropped[data.item.idString]=(this.game.statistics.items.dropped[data.item.idString]??0)+data.count
        }
        return l
    }
    add_vehicle(position:Vec2,def:VehicleDef,layer:number=Layers.Normal):Vehicle{
        const v=this.objects.add_object(new Vehicle(),layer,undefined,{position,def}) as Vehicle
        return v
    }
    add_creature(position:Vec2,def:CreatureDef,layer:number=Layers.Normal):Creature{
        const c=this.objects.add_object(new Creature(),layer,undefined,{position,def}) as Creature
        return c
    }
    add_parachute(position:Vec2,obstacle:ObstacleDef,layer=Layers.Normal):Parachute{
        const p=this.objects.add_object(new Parachute(),layer,undefined,{position,obstacle}) as Parachute
        return p
    }
    add_synced_particle(position:Vec2,def:SyncedParticleDef,owner?:Human,layer=Layers.Normal):SyncedParticle{
        const p=this.objects.add_object(new SyncedParticle(),layer,undefined,{def,position,owner}) as SyncedParticle
        return p
    }
    add_synced_particles_creator(position:Vec2,def:SyncedParticleDef,owner?:Human,count?:number,time?:number,layer=Layers.Normal):SyncedParticle{
        const p=this.objects.add_object(new SyncedParticlesCreator(),layer,undefined,{def,count,time,position,owner}) as SyncedParticle
        return p
    }

    add_drone(position?:Vec2,args?:any,drone?:Drone){
        if(!drone)drone=new Drone()
        this.objects.add_object(drone,Layers.Normal,undefined,{position,...args})
    }
    add_plane(position:Vec2,args:Record<string,any>,plane?:Plane){
        if(!plane)plane=new Plane()
        this.objects.add_object(
            plane,
            Layers.Normal,
            undefined,
            {
                target_pos: position,
                ...args
            }
        )
    }
    add_airdrop(position?:Vec2,obstacle?:ObstacleDef){
        if(!position)position=this.game.deadzone.next_position()
        if(!position)position=v2(3,3)
        if(!obstacle)obstacle=this.game.definitions.obstacles.getFromString("airdrop_locked")

        this.add_plane(position,{
            speed: 21,
            obstacle,
            type: 0
        })
    }
    add_airstrike(position:Vec2,grenade:GrenadeDef,count:number,radius:number,owner?:Human){
        this.add_plane(position,{
            speed: 130,
            grenade,
            count,
            radius,
            owner,
            type: 1
        })
    }
}