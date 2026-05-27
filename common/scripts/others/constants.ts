import { LoadoutBodyDef, LoadoutEyesDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "../definitions/loadout/skins.ts";
import { type BoostDef } from "../definitions/player/boosts.ts";
import { FloorType } from "./terrain.ts";

export const GameConstants={
    player:{
        defaultName:"Player",
        radius:0.42,
        max_name_size:25,
    },
    loot:{
        radius:{
            ammo:0.42,
            weapon:0.65,
            accessory:0.65,
            consumible:0.42,
            equipament:0.42,
            grenade:0.42,
            scopes:0.42,
        }
    },
    collision:{
        threads:2,
        chunckSize:2
    }
}
export enum PlayerAnimationType{
    Switch,
    Reloading,
    Consuming,
    Melee,
    Fire,
    Cook,
    Throw,
    Reset
}
export type PlayerAnimation={
}&({
    type:PlayerAnimationType.Switch   
}|{
    type:PlayerAnimationType.Reloading
    alt_reload:boolean
}|{
    type:PlayerAnimationType.Consuming
    item:number
}|{
    type:PlayerAnimationType.Melee
}|{
    type:PlayerAnimationType.Fire
    last:boolean
    alt:boolean
}|{
    type:PlayerAnimationType.Cook
}|{
    type:PlayerAnimationType.Throw
}|{
    type:PlayerAnimationType.Reset
})
export enum Layers{
    Normal=10
}
export const LayersL=[
    Layers.Normal
]

export enum zIndexes{
    //Ground
    Terrain,
    Grid,
    BuildingsFloor,
    Decals,
    DeadObstacles,
    DeadCeilings,
    ClientDecals,
    DeadCreatures,
    PlayersBody,
    Obstacles1,
    Obstacles2,
    Loots,
    GrenadeGround,
    Rain2,

    Bullets,
    Vehicles,
    Creatures,
    Players,
    Particles,
    GrenadeAir,
    Obstacles3,
    Explosions,
    SyncedParticle,
    BuildingsCeiling,
    Obstacles4,
    ParachutePlayers,
    Rain1,
    Parachute,
    Planes,
    DeadZone,
    Lights,
    DamageSplashs,
    UI,
}
export enum ActionsType{
    Reload,
    Consuming,
    Helpup
}

export type HumanModifiers={
    size:number
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
    outside_water:{
        type:SpawnModeType.blacklist,
        list:[FloorType.Water,FloorType.Ice,FloorType.Void]
    },
    grass:{
        type:SpawnModeType.whitelist,
        list:[FloorType.Grass,FloorType.Snow]
    },
    ground:{
        type:SpawnModeType.whitelist,
        list:[FloorType.Grass,FloorType.Snow,FloorType.Sand]
    },
    snow_only:{
        type:SpawnModeType.whitelist,
        list:[FloorType.Snow]
    },
    grass_only:{
        type:SpawnModeType.whitelist,
        list:[FloorType.Grass]
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
    body:{
        def:LoadoutBodyDef
        tint:number
    }
    hair?:{
        def:LoadoutHairDef
        tint:number
    }
    eyes?:LoadoutEyesDef
    shirt:LoadoutShirtDef
    legs:LoadoutLegDef
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
    Decal,
    Explosion,
    Grenade,
    Vehicle,
    Creature,
    Parachute,
    SyncedParticle,
    Plane,
}
export enum ScoreApplyerType{
    Kill,
    Win,
    Rank,
    DamageTaken,
    DamageDealth,
    KillLeader
}
export type ScoreApplyer={
    type:number
    amount:number
}
export interface HumanStatus{
    damage:number
    damage_taken:number
    kills:number
    score:number
}
export interface PlayerStatus extends HumanStatus{
    id:number
    time_alive:number
    score_applyer:ScoreApplyer[]
}