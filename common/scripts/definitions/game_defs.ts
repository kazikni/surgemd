import { Definitions, DefinitionsMerge, mergeDeep } from "../../engine/core.ts";
import { AccessoryDef, Accessorys_Default_Init } from "./items/accessorys.ts";
import { AmmoDef, Ammos_Default_Init } from "./items/ammo.ts";
import { BackpackDef, Backpacks_Default_Init } from "./items/backpacks.ts";
import { ConsumibleDef, Consumibles_Default_Init } from "./items/consumibles.ts";
import { HelmetDef, Helmets_Default_Init, VestDef, Vests_Default_Init } from "./items/equipaments.ts";
import { GrenadeDef, Grenades_Default_Init } from "./items/grenades.ts";
import { GunDef, Guns_Default_Init } from "./items/guns.ts";
import { MeleeDef, Melees_Default_Init } from "./items/melees.ts";
import { ScopeDef, Scopes_Default_Init } from "./items/scopes.ts";
import { BadgeDef, Badges_Default_Init } from "./loadout/badges.ts";
import { EmoteDef, Emotes_Default_Init } from "./loadout/emotes.ts";
import { Ping_Default_Init, PingDef } from "./loadout/ping.ts";
import { Loadout_Default_Init, LoadoutItemDef } from "./loadout/skins.ts";
import { Wrapping_Default_Init, WrappingDef } from "./loadout/wrapping.ts";
import { BuildingDef, Buildings_Default_Init } from "./objects/buildings_base.ts";
import { CreatureDef, Creatures_Default_Init } from "./objects/creatures.ts";
import { DecalDef, Decals_Default_Init } from "./objects/decals.ts";
import { ExplosionDef, Explosions_Default_Init } from "./objects/explosions.ts";
import { ObstacleDef, Obstacles_Default_Init } from "./objects/obstacles.ts";
import { SyncedParticle_Default_Init, SyncedParticleDef } from "./objects/synced_particle.ts";
import { VehicleDef, Vehicles_Default_Init } from "./objects/vehicles.ts";
import { InventoryItemType } from "./utils.ts";

export type GameItem=GunDef|MeleeDef|GrenadeDef|AmmoDef|ConsumibleDef|VestDef|HelmetDef|BackpackDef|AccessoryDef|ScopeDef
export type GameObjectDef=GameItem|EmoteDef|BadgeDef|ObstacleDef|ExplosionDef|BuildingDef|VehicleDef|VehicleDef|CreatureDef|SyncedParticleDef|LoadoutItemDef|PingDef
export type WeaponDef=MeleeDef|GunDef|GrenadeDef
export type DamageSourceDef=MeleeDef|GunDef|ObstacleDef|ExplosionDef|GrenadeDef

export interface GameADefinitions{
    items?:{
        ammos?:AmmoDef[]
        backpacks?:BackpackDef[]
        consumibles?:ConsumibleDef[]
        helmet?:HelmetDef[]
        vest?:VestDef[]
        grenades?:GrenadeDef[]
        guns?:GunDef[]
        melees?:MeleeDef[]
        scopes?:ScopeDef[]
    }
    objects?:{
        obstacles?:ObstacleDef[]
        buildings?:BuildingDef[]
    }
}
export class GameDefinition{
    //Items
    ammos=new Definitions<AmmoDef,{}>((i)=>{
        i.item_type=InventoryItemType.ammo
    })
    backpacks=new Definitions<BackpackDef,{}>((g)=>{
        g.item_type=InventoryItemType.backpack
    })
    consumibles=new Definitions<ConsumibleDef,{}>((i)=>{
        i.item_type=InventoryItemType.consumible
    })
    vests=new Definitions<VestDef,{}>((obj)=>{
        obj.item_type=InventoryItemType.vest
    })
    helmets=new Definitions<HelmetDef,{}>((obj)=>{
        obj.item_type=InventoryItemType.helmet
    })
    accessorys=new Definitions<AccessoryDef,{}>((obj)=>{
        obj.item_type=InventoryItemType.accessory
    })
    grenades=new Definitions<GrenadeDef,{}>((v)=>{
        v.item_type=InventoryItemType.grenade
    })
    guns=new Definitions<GunDef,{}>((g)=>{
        g.item_type=InventoryItemType.gun
        if(g.dual&&!g.dual_from){
            const dd=mergeDeep({},g,g.dual,{dual_from:g.idString}) as GunDef
            dd.idString=dd.idString+"_dual"
            this.guns.insert(dd)
        }
    })
    melees=new Definitions<MeleeDef,{}>((g)=>{
        g.item_type=InventoryItemType.melee
    })
    scopes=new Definitions<ScopeDef,{}>((i)=>{
        i.item_type=InventoryItemType.scope
    })

    // Loadout
    loadout=new Definitions<LoadoutItemDef,{}>((i)=>{})
    badges=new Definitions<BadgeDef,{}>((i)=>{})
    emotes=new Definitions<EmoteDef,{}>((e)=>{})
    wrapping=new Definitions<WrappingDef,{}>((w)=>{})
    ping=new Definitions<PingDef,{}>((e)=>{
        e.idString="ping_"+e.idString
    })

    // Objects
    buildings=new Definitions<BuildingDef,{}>((i)=>{})
    creatures=new Definitions<CreatureDef,{}>((i)=>{})
    decals=new Definitions<DecalDef,{}>((_v)=>{})
    explosions=new Definitions<ExplosionDef,{}>((_v)=>{})
    obstacles=new Definitions<ObstacleDef,{}>((_v)=>{})
    vehicles=new Definitions<VehicleDef,{}>((_g)=>{})
    synced_particle=new Definitions<SyncedParticleDef,{}>((_v)=>{})

    game_items=new DefinitionsMerge<GameItem>()
    game_objects=new DefinitionsMerge<GameObjectDef>()
    valueString: any;

    constructor(){
        
    }

    clear(){
        this.melees.clear()
        this.guns.clear()
        this.ammos.clear()
        this.consumibles.clear()
        this.backpacks.clear()
        this.helmets.clear()
        this.vests.clear()
        this.grenades.clear()
        this.scopes.clear()
        this.accessorys.clear()

        this.loadout.clear()
        this.badges.clear()
        this.emotes.clear()
        this.wrapping.clear()
        this.ping.clear()

        this.buildings.clear()
        this.creatures.clear()
        this.decals.clear()
        this.explosions.clear()
        this.obstacles.clear()
        this.vehicles.clear()
        this.synced_particle.clear()

        this.game_items.clear()
        this.game_objects.clear()
    }
    init_default(){
        Melees_Default_Init(this.melees)
        Guns_Default_Init(this.guns)
        Ammos_Default_Init(this.ammos)
        Consumibles_Default_Init(this.consumibles)
        Backpacks_Default_Init(this.backpacks)
        Helmets_Default_Init(this.helmets)
        Vests_Default_Init(this.vests)
        Grenades_Default_Init(this.grenades)
        Scopes_Default_Init(this.scopes)
        Accessorys_Default_Init(this.accessorys)

        Loadout_Default_Init(this.loadout)
        Badges_Default_Init(this.badges)
        Emotes_Default_Init(this.emotes)
        Wrapping_Default_Init(this.wrapping)
        Ping_Default_Init(this.ping)

        Buildings_Default_Init(this.buildings)
        Creatures_Default_Init(this.creatures)
        Decals_Default_Init(this.decals)
        Explosions_Default_Init(this.explosions)
        Obstacles_Default_Init(this.obstacles,this.guns)
        Vehicles_Default_Init(this.vehicles)
        SyncedParticle_Default_Init(this.synced_particle)

        this.game_items.insert_def(this.melees.value)
        this.game_items.insert_def(this.guns.value)
        this.game_items.insert_def(this.ammos.value)
        this.game_items.insert_def(this.consumibles.value)
        this.game_items.insert_def(this.backpacks.value)
        this.game_items.insert_def(this.helmets.value)
        this.game_items.insert_def(this.vests.value)
        this.game_items.insert_def(this.grenades.value)
        this.game_items.insert_def(this.scopes.value)
        this.game_items.insert_def(this.accessorys.value)

        this.game_objects.insert_def(this.game_items.valueString)
        this.game_objects.insert_def(this.loadout.value)
        this.game_objects.insert_def(this.emotes.value)
        this.game_objects.insert_def(this.badges.value)
        this.game_objects.insert_def(this.ping.value)
        this.game_objects.insert_def(this.buildings.value)
        this.game_objects.insert_def(this.creatures.value)
        this.game_objects.insert_def(this.explosions.value)
        this.game_objects.insert_def(this.obstacles.value)
        this.game_objects.insert_def(this.vehicles.value)
        this.game_objects.insert_def(this.synced_particle.value)
    }
    reset(){
        this.clear()
        this.init_default()
    }
    add_definitions(mm:GameADefinitions){
        if(mm.items){
            for(const def of mm.items.ammos??[]){
                this.ammos.insert(def)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
            for(const def of mm.items.backpacks??[]){
                this.backpacks.insert(def)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
            for(const def of mm.items.consumibles??[]){
                this.consumibles.insert(def)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
            for(const def of mm.items.vest??[]){
                this.vests.insert(def)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
            for(const def of mm.items.helmet??[]){
                this.helmets.insert(def)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
            for(const def of mm.items.grenades??[]){
                this.grenades.insert(def)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
            for(const def of mm.items.guns??[]){
                this.guns.insert(def)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
            for(const def of mm.items.melees??[]){
                this.melees.insert(def)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
            for(const def of mm.items.scopes??[]){
                this.scopes.insert(def)
                this.game_items.insert(def)
                this.game_objects.insert(def)
            }
        }
        if(mm.objects){
            if(mm.objects.buildings){
                for(const def of mm.objects.buildings??[]){
                    this.buildings.insert(def)
                    this.game_objects.insert(def)
                }
            }
            if(mm.objects.obstacles){
                for(const def of mm.objects.obstacles??[]){
                    this.obstacles.insert(def)
                    this.game_objects.insert(def)
                }
            }
        }
    }
}