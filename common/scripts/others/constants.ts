import { LootTable as LootTableBase, Vec2 } from "../../engine/core.ts";
import { GameDefinition, type GameItem } from "../definitions/game_defs.ts";
import { LoadoutAccessoryDef, LoadoutBodyDef, LoadoutEyesDef, LoadoutFootDef, LoadoutHairDef, LoadoutLegDef, LoadoutShirtDef } from "../definitions/loadout/skins.ts";
import { WrappingDef } from "../definitions/loadout/wrapping.ts"
import { DamageReason, GameItemType } from "../definitions/utils.ts";
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
            [GameItemType.ammo]:0.5,
            [GameItemType.consumible]:0.5,
            [GameItemType.backpack]:0.5,
            [GameItemType.helmet]:0.5,
            [GameItemType.vest]:0.5,
            [GameItemType.scope]:0.5,
            [GameItemType.grenade]:0.5,

            [GameItemType.gun]:0.59,
            [GameItemType.melee]:0.59,

            [GameItemType.accessory]:0.6,
        }satisfies Record<GameItemType,number>
    },
    collision:{
        threads:2,
        chunckSize:2
    }
}
export const object_instance_type={
    loot:1,
    wall:2,
    obstacle:3,
    human:4
}
export const gelo_instance_type={
    map:1,
    deadzone:2,
    mode:3,
}
export enum ObjectType{
    StaticBody,
    MovingBody,

    Humanoid,
    Human,
    HumanBody,
    Loot,
    Bullet,
    Decal,
    GraphicVisual,
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
    Underground=-1,
    Normal=0,
    Top=1
}
export const LayersL=[
    Layers.Normal
]

export enum zIndexes{
    //Ground
    Terrain,
    Grid,
    TilemapV,
    BuildingFloor1,
    BuildingsFloor2,
    BuildingsFloor3,
    Decals,
    DeadObstacles,
    DeadCeilings,
    ClientDecals,
    DeadCreatures,
    PlayersBody,

    BuildingsWalls1,
    Loots,
    DownedHumans,
    Bullets,
    Obstacles1,
    GrenadeGround,
    Obstacles2,
    Rain2,

    Vehicles,
    Creatures,
    CaseParticles,
    Humans,
    Particles,
    GrenadeAir1,
    DamageSplashs,
    Obstacles3,
    Obstacles4,
    Explosions,
    SyncedParticle,
    BuildingsCeiling,
    Obstacles5,
    Obstacles6,
    ParachutePlayers,
    GrenadeAir2,
    Rain1,
    Parachute,
    Airbodys,
    Deadzone,
    Lights,
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
export interface ObstacleVisualData{
    dirty:boolean
    skin:number
    variation:number
}
export enum ScoreApplyerType{
    Kill,
    BounceKill,
    LeaderKill,
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
    ammo?:number|boolean
    skin?:number
    aditional?:LootData[]
}

export interface LootSetting{
    without_ammo?:boolean
    include_ammo?:boolean
    hold_ammo?:boolean
    all_skins?:boolean
    definitions:GameDefinition
}
export interface LootAditional{
    without_ammo?:boolean
    include_ammo?:boolean
    hold_ammo?:boolean
    all_skins?:boolean
    skin?:number
}

export type LootTable<A=LootAditional>=LootTableBase<A>

export type DamageParams={
    amount:number
    reason:DamageReason
    owner?:{id:number}&Record<string,any>
    source?:{id_string:string}
    position?:Vec2
    direction?:number
    critical?:boolean
    penetration?:number
    resistence?:number
}