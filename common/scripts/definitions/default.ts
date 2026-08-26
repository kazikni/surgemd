import { GameADefinitions } from "./game_defs.ts";
import { Accessorys_Default_Init } from "./items/accessorys.ts";
import { Ammos_Default_Init } from "./items/ammo.ts";
import { Backpacks_Default_Init } from "./items/backpacks.ts";
import { Consumibles_Default_Init } from "./items/consumibles.ts";
import { Helmets_Default_Init, Vests_Default_Init } from "./items/equipaments.ts";
import { Grenades_Default_Init } from "./items/grenades.ts";
import { Guns_Default_Init } from "./items/guns.ts";
import { Melees_Default_Init } from "./items/melees.ts";
import { Scopes_Default_Init } from "./items/scopes.ts";
import { Badges_Default_Init } from "./loadout/badges.ts";
import { Emotes_Default_Init } from "./loadout/emotes.ts";
import { Pings_Default_Init } from "./loadout/pings.ts";
import { Loadout_Default_Init } from "./loadout/skins.ts";
import { Wrapping_Default_Init } from "./loadout/wrapping.ts";
import { Buildings_Default_Init } from "./objects/buildings_base.ts";
import { Creatures_Default_Init } from "./objects/creatures.ts";
import { Decals_Default_Init } from "./objects/decals.ts";
import { Explosions_Default_Init } from "./objects/explosions.ts";
import { Obstacles_Default_Init, obstacles_factory } from "./objects/obstacles.ts";
import { SyncedParticles_Default_Init } from "./objects/synced_particles.ts";
import { Vehicles_Default_Init } from "./objects/vehicles.ts";
import { Boosts_Default_Init } from "./player/boosts.ts";

export const DefaultDefinitions:GameADefinitions={
    items:{
        guns:Guns_Default_Init(),
        melees:Melees_Default_Init(),
        ammos:Ammos_Default_Init(),
        backpacks:Backpacks_Default_Init(),
        vests:Vests_Default_Init(),
        helmets:Helmets_Default_Init(),
        scopes:Scopes_Default_Init(),
        grenades:Grenades_Default_Init(),
        consumibles:Consumibles_Default_Init(),
        accessorys:Accessorys_Default_Init(),
    },
    loadout:{
        loadout:Loadout_Default_Init(),
        badges:Badges_Default_Init(),
        emotes:Emotes_Default_Init(),
        wrapping:Wrapping_Default_Init(),
        pings:Pings_Default_Init(),
    },
    objects:{
        buildings:Buildings_Default_Init(),
        creatures:Creatures_Default_Init(),
        decals:Decals_Default_Init(),
        explosions:Explosions_Default_Init(),
        obstacles:Obstacles_Default_Init(),
        vehicles:Vehicles_Default_Init(),
        synced_particles:SyncedParticles_Default_Init()
    },
    others:{
        boosts:Boosts_Default_Init()
    }
}

const guns_mount=["hp18","m870","model94","blr81","kar98k","rifle_cbc","vss","awp"]

for(const g of guns_mount){
    DefaultDefinitions.objects!.obstacles!.push(obstacles_factory.gun_mount(DefaultDefinitions.items!.guns!.find((def)=>def.idString===g)!,{}))
}