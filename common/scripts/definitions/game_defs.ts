// deno-lint-ignore-file ban-types
import { Definitions, DefinitionsMerge, mergeDeep } from "../../engine/core.ts";
import { TD, TDType } from "../../engine/core/lang/td.ts";
import { DefaultDefinitions } from "./default.ts";
import { AccessoryDef } from "./items/accessorys.ts";
import { AmmoDef } from "./items/ammo.ts";
import { BackpackDef } from "./items/backpacks.ts";
import { ConsumibleDef } from "./items/consumibles.ts";
import { HelmetDef, VestDef } from "./items/equipaments.ts";
import { GrenadeDef } from "./items/grenades.ts";
import { GunDef } from "./items/guns.ts";
import { MeleeDef } from "./items/melees.ts";
import { ScopeDef } from "./items/scopes.ts";
import { BadgeDef } from "./loadout/badges.ts";
import { EmoteDef } from "./loadout/emotes.ts";
import { PingDef } from "./loadout/ping.ts";
import { LoadoutItemDef } from "./loadout/skins.ts";
import { WrappingDef } from "./loadout/wrapping.ts";
import { BuildingClientTD, BuildingDef,BuildingTD } from "./objects/buildings_base.ts";
import { CreatureDef } from "./objects/creatures.ts";
import { DecalDef } from "./objects/decals.ts";
import { ExplosionDef} from "./objects/explosions.ts";
import { ObstacleDef, ObstacleTD } from "./objects/obstacles.ts";
import { SyncedParticleDef } from "./objects/synced_particles.ts";
import { VehicleDef} from "./objects/vehicles.ts";
import { BoostDef } from "./player/boosts.ts";
import { GameItemType, GameObjectDefinitionType } from "./utils.ts";

export type GameItem=GunDef|MeleeDef|GrenadeDef|AmmoDef|ConsumibleDef|VestDef|HelmetDef|BackpackDef|AccessoryDef|ScopeDef
export type GameObjectDef=GameItem|EmoteDef|BadgeDef|ObstacleDef|ExplosionDef|BuildingDef|VehicleDef|VehicleDef|CreatureDef|SyncedParticleDef|LoadoutItemDef|PingDef
export type WeaponDef=MeleeDef|GunDef|GrenadeDef
export type DamageSourceDef=WeaponDef|ObstacleDef

export const DefinitionItemCategoryList:DefinitionItemCategoryType[]=["ammos","backpacks","helmets","vests","accessorys","consumibles","grenades","guns","melees","scopes"]
export type DefinitionItemCategoryType="ammos"|"backpacks"|"helmets"|"vests"|"accessorys"|"consumibles"|"grenades"|"guns"|"melees"|"scopes"

export const DefinitionLoadoutCategoryList:DefinitionLoadoutCategoryType[]=["loadout","badges","emotes","wrapping","pings"]
export type DefinitionLoadoutCategoryType="loadout"|"badges"|"emotes"|"wrapping"|"pings"

export const DefinitionObjectsCategoryList:DefinitionObjectsCategoryType[]=["buildings","creatures","decals","explosions","obstacles","vehicles","synced_particles"]
export type DefinitionObjectsCategoryType="buildings"|"creatures"|"decals"|"explosions"|"obstacles"|"vehicles"|"synced_particles"

export const DefinitionOthersCategoryList:DefinitionOthersCategoryType[]=["boosts"]
export type DefinitionOthersCategoryType="boosts"

export interface GameADefinitions{
    items?:{
        ammos?:AmmoDef[]
        backpacks?:BackpackDef[]
        helmets?:HelmetDef[]
        vests?:VestDef[]
        accessorys?:AccessoryDef[]
        consumibles?:ConsumibleDef[]
        grenades?:GrenadeDef[]
        guns?:GunDef[]
        melees?:MeleeDef[]
        scopes?:ScopeDef[]
    }
    loadout?:{
        loadout?:LoadoutItemDef[]
        badges?:BadgeDef[]
        emotes?:EmoteDef[]
        wrapping?:WrappingDef[]
        pings?:PingDef[]
    }
    objects?:{
        buildings?:BuildingDef[]
        creatures?:CreatureDef[]
        decals?:DecalDef[]
        explosions?:ExplosionDef[]
        obstacles?:ObstacleDef[]
        vehicles?:VehicleDef[]
        synced_particles?:SyncedParticleDef[]
    }
    others?:{
        boosts?:BoostDef[]
    }
}
export class GameDefinition{
    static add_td:TD={type:TDType.onu,content:{
        type: TDType.object,
        content: [
            {name: "objects",content: {type:TDType.onu,content:{type:TDType.object,content:[
                {name:"obstacles",content:{type:TDType.array,content:ObstacleTD,len_bytes:2}},
                {name:"buildings",content:{type:TDType.array,content:BuildingTD,len_bytes:2}},
            ]}}}
        ]
    }} satisfies TD
    static add_client_td:TD={type:TDType.onu,content:{
        type: TDType.object,
        content: [
            {name: "objects",content: {type:TDType.onu,content:{type:TDType.object,content:[
                {name:"obstacles",content:{type:TDType.array,content:ObstacleTD,len_bytes:2}},
                {name:"buildings",content:{type:TDType.array,content:BuildingClientTD,len_bytes:2}},
            ]}}}
        ]
    }} satisfies TD
    //Items
    ammos=new Definitions<AmmoDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.ammo
    })
    backpacks=new Definitions<BackpackDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.backpack
    })
    vests=new Definitions<VestDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.vest
    })
    helmets=new Definitions<HelmetDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.helmet
    })
    accessorys=new Definitions<AccessoryDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.accessory
    })
    consumibles=new Definitions<ConsumibleDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.consumible
    })
    grenades=new Definitions<GrenadeDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.grenade
    })
    guns=new Definitions<GunDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.gun
        if(i.dual&&!i.dual_from){
            const dd=mergeDeep({},i,i.dual,{dual_from:i.idString}) as GunDef
            dd.idString=dd.idString+"_dual"
            this.guns.insert(dd)
        }
    })
    melees=new Definitions<MeleeDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.melee
    })
    scopes=new Definitions<ScopeDef,{}>((i)=>{
        i.def_type=GameObjectDefinitionType.item
        i.item_type=GameItemType.scope
    })

    // Loadout
    loadout=new Definitions<LoadoutItemDef,{}>((i)=>{})
    badges=new Definitions<BadgeDef,{}>((i)=>{})
    emotes=new Definitions<EmoteDef,{}>((e)=>{
        e.def_type=GameObjectDefinitionType.emote
    })
    wrapping=new Definitions<WrappingDef,{}>((w)=>{})
    pings=new Definitions<PingDef,{}>((e)=>{
        e.idString="ping_"+e.idString
    })

    // Objects
    buildings=new Definitions<BuildingDef,{}>((i)=>{})
    creatures=new Definitions<CreatureDef,{}>((i)=>{})
    decals=new Definitions<DecalDef,{}>((_v)=>{})
    explosions=new Definitions<ExplosionDef,{}>((_v)=>{})
    obstacles=new Definitions<ObstacleDef,{}>((o)=>{
        o.def_type=GameObjectDefinitionType.obstacle
    })
    vehicles=new Definitions<VehicleDef,{}>((_g)=>{})
    synced_particles=new Definitions<SyncedParticleDef,{}>((_v)=>{})

    // Others
    boosts=new Definitions<BoostDef,{}>((_v)=>{})

    game_items=new DefinitionsMerge<GameItem>()
    game_objects=new DefinitionsMerge<GameObjectDef>()
    valueString: any;

    constructor(){
        
    }

    clear(){
        for(const c of [...DefinitionItemCategoryList,...DefinitionLoadoutCategoryList,...DefinitionObjectsCategoryList,...DefinitionOthersCategoryList]){
            this[c].clear()
        }

        this.game_items.clear()
        this.game_objects.clear()
    }
    init_default(){
        this.add_definitions(DefaultDefinitions)
    }
    reset(){
        this.clear()
        this.init_default()
    }
    add_definitions(mm:GameADefinitions){
        for(const c in mm.items){
            for(const def of mm.items[c as DefinitionItemCategoryType]??[]){
                this[c as DefinitionItemCategoryType].insert(def as any)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
        }
        for(const c in mm.loadout){
            for(const def of mm.loadout[c as DefinitionLoadoutCategoryType]??[]){
                this[c as DefinitionLoadoutCategoryType].insert(def as any)
                this.game_objects.insert(def)
            }
        }
        for(const c in mm.objects){
            for(const def of mm.objects[c as DefinitionObjectsCategoryType]??[]){
                this[c as DefinitionObjectsCategoryType].insert(def as any)
                this.game_objects.insert(def)
            }
        }
        for(const c in mm.others){
            for(const def of mm.others[c as DefinitionOthersCategoryType]??[]){
                this[c as DefinitionOthersCategoryType].insert(def as any)
            }
        }
    }
}