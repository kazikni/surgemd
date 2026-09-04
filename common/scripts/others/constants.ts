import { LootTable as LootTableBase, Vec2 } from "../../engine/core.ts";
import { type GameItem } from "../definitions/game_defs.ts";
import { LoadoutAccessoryDef, LoadoutBodyDef, LoadoutEyesDef, LoadoutFootDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "../definitions/loadout/skins.ts";
import { WrappingDef } from "../definitions/loadout/wrapping.ts"
import { FloorType } from "./terrain.ts";

export const GameConstants={
    humanoid:{
        radius:0.42,
    },
    player:{
        defaultName:"Player",
        max_name_size:27,
    },
    loot:{
        radius:{
            ammo:0.46,
            weapon:0.6,
            accessory:0.65,
            consumible:0.44,
            equipament:0.44,
            grenade:0.44,
            scopes:0.44,
        }
    },
    collision:{
        threads:2,
        chunckSize:2
    }
}
export enum GameObjectType{
    StaticBody,
    Humanoid,
    Human,
    HumanBody,
    Loot,
    Obstacle,
    Building,
    Walls,
    Bullet,
    Decal,
    Explosion,
    Grenade,
    Vehicle,
    Creature,
    Parachute,
    SyncedParticle,
    Plane,
    Drone
}

export enum HumanAnimationType{
    Reloading,
    Consuming,
    Melee,
    Fire,
    Cook,
    Throw,
    Reset
}
export type HumanAnimation={
}&({
    type:HumanAnimationType.Reloading
    alt_reload:boolean
}|{
    type:HumanAnimationType.Consuming
    item:number
}|{
    type:HumanAnimationType.Melee
}|{
    type:HumanAnimationType.Fire
    last:boolean
    alt:boolean
    alt_func:boolean
}|{
    type:HumanAnimationType.Cook
}|{
    type:HumanAnimationType.Throw
}|{
    type:HumanAnimationType.Reset
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
    BuildingFloor1,
    BuildingsFloor2,
    BuildingsFloor3,
    Decals,
    DeadObstacles,
    DeadCeilings,
    ClientDecals,
    DeadCreatures,
    PlayersBody,

    Loots,
    DownedPlayers,
    Obstacles1,
    Obstacles2,
    GrenadeGround,
    Rain2,

    Bullets,
    Vehicles,
    Creatures,
    Players,
    Particles,
    GrenadeAir1,
    Obstacles3,
    BuildingsWalls1,
    Explosions,
    SyncedParticle,
    BuildingsCeiling,
    Obstacles4,
    Obstacles5,
    ParachutePlayers,
    GrenadeAir2,
    Rain1,
    Parachute,
    Airbodys,
    DeadZone,
    Lights,
    DamageSplashs,
    PingWorld,
    UI,
}
export enum ActionsType{
    Reload,
    Consuming,
    Helpup,
    BeingHelpup
}
export enum  SpawnModeType{
    any,
    fixed,
    blacklist,
    whitelist,
    river
}
export type SpawnMode={
    position_generator?:"normal"|"deadzone"
}&({
    type:SpawnModeType.any
}|{
    type:SpawnModeType.fixed
    position:Vec2
}|{
    type:SpawnModeType.blacklist|SpawnModeType.whitelist
    list:FloorType[]
}|{
    type:SpawnModeType.river
    list:FloorType[],
})

export const Spawn={
    any:{
        type:SpawnModeType.any,
    },
    water:{
        type:SpawnModeType.whitelist,
        list:[FloorType.Water,FloorType.Ice]
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
    river_water:{
        type:SpawnModeType.river,
        list:[FloorType.Water,FloorType.Ice]
    },
} satisfies Record<string,SpawnMode>
export interface HumanoidVisualData {
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
export interface HumanVisualData extends HumanoidVisualData{
    wrapping?:WrappingDef
}
export interface ObstacleVisualData{
    dirty:boolean
    skin:number
    variation:number
}
export enum ScoreApplyerType{
    Kill,
    Win,
    Rank,
    DamageTaken,
    DamageDealth,
}
export type ScoreApplyer={
    type:number
    amount:number
    multiplier:number
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
export interface LootData{
    count:number
    item:GameItem
    skin?:number
    aditional?:LootData[]
}
export interface LootSetting{
    without_ammo?:boolean
    include_ammo?:boolean
    all_skins?:boolean
}
export interface LootAditional extends LootSetting{
    without_ammo?:boolean
    include_ammo?:boolean
    skin?:number
}

export type LootTable<A=LootAditional>=LootTableBase<A>