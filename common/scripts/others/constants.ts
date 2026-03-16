import { BadgeDef } from "../definitions/loadout/badges.ts";
import { EmoteDef } from "../definitions/loadout/emotes.ts";
import { SkinDef } from "../definitions/loadout/skins.ts";
import { type BoostDef } from "../definitions/player/boosts.ts";
import { FloorType } from "./terrain.ts";

export const GameConstants={
    player:{
        defaultName:"Player",
        radius:0.37,
        max_name_size:25,
    },
    loot:{
        velocityDecay:2,
        radius:{
            ammo:0.38,
            weapon:0.59,
            consumible:0.38,
            equipament:0.38,
            grenade:0.38,
            skin:0.38
        }
    },
    tps:25,
    collision:{
        threads:2,
        chunckSize:2
    }
}
export enum PlayerAnimationType{
    Reloading,
    Consuming,
    Melee
}
export type PlayerAnimation={
}&({
    type:PlayerAnimationType.Reloading
    alt_reload:boolean
}|{
    type:PlayerAnimationType.Consuming
    item:number
}|{
    type:PlayerAnimationType.Melee
})
export enum Layers{
    Normal=10
}
export const LayersL=[
    Layers.Normal
]

export enum zIndexes{
    Terrain,
    Grid,
    BuildingsFloor,
    DeadObstacles,
    Decals,
    DeadCreatures,
    PlayersBody,
    Loots,
    Bullets,
    Obstacles1,
    Obstacles2,
    Rain2,
    Vehicles,
    Creatures,
    Players,
    Particles,
    Obstacles3,
    Obstacles4,
    Explosions,
    BuildingsCeiling,
    ParachutePlayers,
    Rain1,
    Planes,
    DeadZone,
    Lights,
    DamageSplashs,
    Minimap
}
export enum ActionsType{
    Reload,
    Consuming
}

export type HumanModifiers={
    damage:number
    speed:number
    health:number
    boost:number
    bullet_speed:number
    bullet_size:number
    critical_mult:number
    luck:number
    mana_consume:number
    damage_reduction:number
}
export enum  SpawnModeType{
    any,
    blacklist,
    whitelist,
}
export type SpawnMode={
    type:SpawnModeType.any
}|{
    type:SpawnModeType.blacklist|SpawnModeType.whitelist
    list:FloorType[]
}

export const Spawn={
    any:{
        type:SpawnModeType.any,
    },
    grass:{
        type:SpawnModeType.whitelist,
        list:[FloorType.Grass,FloorType.Snow]
    },
} satisfies Record<string,SpawnMode>

export interface HumanHealthData{
    health:number
    max_health:number
    dead:boolean

    boost:number
    max_boost:number
    boost_def:BoostDef

    invensibility_time:number
    downed:boolean
}
export interface HumanLoadoutData {
    dirty:boolean

    original:{
        skin_id:string
        badge_id?:string
        emotes:{
            die?:string
        }
    }
    skin:SkinDef
    badge?:BadgeDef
    emotes:{
        die?:EmoteDef
    }
}
export interface HumanAnimationData{
    dirty:boolean
    attacking:boolean
}
export interface ObstacleVisualData{
    dirty:boolean
    skin:number
    variation:number
}
export enum GameObjectType{
    StaticBody,
    Human,
    Loot,
    Obstacle,
    Building,
    Bullet,
    Explosion,
    Grenade,
    Vehicle
}