import { DeepPartial, Definition, FrameTransform, mergeDeep, v2 } from "../../../engine/core.ts";
import { WeaponsArmRig,WeaponsRig, ItemRank, tracers, FistRig, WeaponAssets, FireMode} from "../../others/item.ts";
import { GasParticles, ItemFireDefinition, MuzzleFlash, type BulletDef, type GameItemType, type GameObjectDefinitionType } from "../utils.ts";
export type GunDef={
    def_type?:GameObjectDefinitionType.item
    item_type?:GameItemType.gun
    name?:string
    tname?:string
    rank:ItemRank

    class:GunClasses
    description?:string|boolean

    barrel_length:number
    barrel_offset?:number

    switch_delay?:number
    unload_delay?:number
    switch_multiply?:number
    class_switch_multiply?:Partial<Record<GunClasses,number>>

    alt_func?:GunAltFunc

    speed_mod?:number

    ammo_spawn?:{
        amount:number
        type?:string
    }

    rig_arms?:FistRig
    rig_image?:FrameTransform
    reload?:{
        capacity:number
        delay:number
        reload_count?:number
        extended_capacity?:number
        reload_alt?:{
            delay:number
            reload_count?:number
        }
        ammo_consume?:number
    }
    assets?:WeaponAssets&{
        reload_sound?:string
        reload_sound_alt?:string
        use_last?:boolean|string
        use_alt_func?:string
    }
    dual?:DeepPartial<GunDef>&DualAdditional
}&({
    dual_from?:undefined
}|{
    dual_from:string
    dual_offset:number
})&Definition&ItemFireDefinition
export interface DualAdditional{dual_offset:number}

export enum GunClasses{
    Pistol,
    Shotgun,
    Sniper,
    Assault,
    SMG,
    DMR,
    LMG,
    Miscellaneous,
    Magic,
}
export type GunAltFunc=({
    type:0// Alt Shoot
}&ItemFireDefinition)
export const GunsConstructors={
    extends(gun:GunDef,variant:DeepPartial<GunDef>):GunDef{
        return mergeDeep({}as GunDef,gun,variant)as GunDef
    },
}

export const bullets_factory={
    assault(power:number):BulletDef{
        return {
            damage:10*power,
            range: 170*(1+(power-1) * 0.5),
            speed: 37*(1+(power-1) * 0.5),

            critical_mult: 1.25,
            obstacle_mult: 1,
            falloff:0.85,
            tracer:tracers.medium
        }
    },
    sniper(power:number,tracer=tracers.large):BulletDef{
        return {
            damage: 50 * power,
            range: 200 * (1 + (power - 1) * 0.5),
            speed: 57 * (1 + (power - 1) * 0.6),

            critical_mult: 1.1,
            obstacle_mult: 1.25,
            falloff: 0.7,
            tracer: tracer,
        }
    },
    heavy_sniper(power:number,tracer=tracers.large):BulletDef{
        return {
            damage:99*power,
            range:220*(1+(power-1)*0.01),
            speed:40*(1+(power-1)*-0.5),

            falloff:0.7,
            critical_mult:1.1,
            obstacle_mult:2,
            tracer:tracer
        }
    },
    smg(power:number,tracer=tracers.small):BulletDef{
        return {
            damage:7*power,
            range:40*(1 + (power - 1) * 0.5),
            speed:28*(1 + (power - 1) * 0.5),

            falloff:0.6,
            critical_mult:1.25,
            tracer:tracer
        }
    },
    ac_smg(power:number,tracer=tracers.small):BulletDef{
        return {
            damage:5.9*power,
            range:50*(1 + (power - 1) * 0.5),
            speed:25*(1 + (power - 1) * 0.5),

            falloff:0.6,
            critical_mult:1.25,
            tracer:tracer
        }
    },
    buckshot(power:number,tracer=tracers.small):BulletDef{
        return {
            damage:6.7 * power,
            speed:26 * (1 + (power - 1) * 0.4),
            range:30 * (1 + (power - 1) * 0.4),

            falloff:0.6,
            critical_mult:1.25,
            tracer:tracer
        }
    },
    birdshot(power:number,tracer=tracers.tiny):BulletDef{
        return {
            damage:2.7*power,
            speed:24*(1+(power-1)*0.4),
            range:32*(1+(power-1)*0.4),

            falloff:0.75,
            critical_mult:1.25,
            tracer
        }
    },
    flechette(power:number,tracer=tracers.small):BulletDef{
        return {
            damage:5 * power,
            speed:30 * (1 + (power - 1) * 0.4),
            range:55 * (1 + (power - 1) * 0.2),

            falloff:0.85,
            critical_mult:1.2,
            tracer:tracer
        }
    },
}
export const guns_factory={
    simple(id:string,ammo:string,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.Pistol,
            rank:ItemRank.E,
            barrel_length:1,
            fire_delay:1,
            ammo_type:ammo,
        },extend)
    },
    pistol(id:string,ammo:string,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.Pistol,
            rank:ItemRank.E,

            barrel_length:0.8,

            fire_delay:1,
            switch_delay:0.1,

            gas_particles:GasParticles.pistols,
            muzzle_flash:MuzzleFlash.normal,
            case_particle:{
                position:v2.new(0.5,0.1)
            },
            recoil_animation:{
                time_scale:9,
                walk:0.05
            },

            ammo_type:ammo,

            rig_arms:WeaponsArmRig[3],
            rig_image:WeaponsRig[0],
            assets:{
                world:"weapon_small_world",
                world_tint:0x22222f
            },

            speed_mod:0.98,
        },extend??{})
    },
    assault(id:string,ammo:string,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.Assault,
            rank:ItemRank.C,

            barrel_length:1.06,
            idle_spread:0.2,

            fire_delay:0.1,
            switch_delay:0.2,
            unload_delay:1,
            fire_sequence:{
                decay:0.55,
                increse:0.073,
                spread:{begin:0.15}
            },

            gas_particles:GasParticles.automatic,
            case_particle:{
                position:v2.new(0.6,0.1)
            },
            muzzle_flash:MuzzleFlash.normal,

            ammo_type:ammo,

            rig_arms:WeaponsArmRig[1],
            rig_image:{
                position:v2.new(0.7,0.0),
            },
            assets:{
                world:"weapon_medium_world",
                world_tint:0x22222f
            },
            recoil_animation:{
                time_scale:20,
                walk:0.05
            },
            speed_mod:0.97,
        },extend??{})
    },
    smg(id:string,ammo:string,small:boolean,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.SMG,
            rank:ItemRank.C,

            barrel_length:1,
            idle_spread:0.4,

            fire_delay:0.1,
            switch_delay:0.2,
            unload_delay:1,
            fire_sequence:{
                decay:0.55,
                increse:0.05,
                spread:{begin:0.5}
            },

            gas_particles:GasParticles.automatic,
            case_particle:{
                position:v2.new(0.6,0.1)
            },
            muzzle_flash:MuzzleFlash.normal,
    
            ammo_type:ammo,

            rig_arms:WeaponsArmRig[1],
            rig_image:{
                position:v2.new(0.7,0.0),
            },
            assets:{
                world:small?"weapon_small_world":"weapon_medium_world",
                world_tint:0x22222f
            },

            recoil_animation:{
                time_scale:25,
                walk:0.03
            },
            speed_mod:0.98,
        },extend??{})
    },
    dmr(id:string,ammo:string,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.DMR,
            rank:ItemRank.A,

            barrel_length:1.06,
            idle_spread:0.5,

            fire_mode:FireMode.Single,
            fire_delay:0.1,
            switch_delay:0.1,

            gas_particles:GasParticles.dmr,
            case_particle:{
                position:v2.new(0.6,0.1)
            },
            muzzle_flash:MuzzleFlash.normal,

            ammo_type:ammo,

            rig_arms:WeaponsArmRig[1],
            rig_image:{
                position:v2.new(0.7,0.0),
                rotation:0,
            },
            assets:{
                world:"weapon_medium_world",
                world_tint:0x22222f
            },

            recoil_animation:{
                time_scale:8,
                walk:0.07
            },
            speed_mod:0.95,
        },extend??{})
    },
    sniper(id:string,ammo:string,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.Sniper,
            rank:ItemRank.A,

            barrel_length:1.3,
            idle_spread:0.1,

            fire_mode:FireMode.Single,
            fire_on_release:true,
            fire_delay:0.2,
            switch_delay:0.2,
            unload_delay:1,

            gas_particles:GasParticles.sniper,
            case_particle:{
                position:v2.new(0.7,0.1)
            },
            muzzle_flash:MuzzleFlash.normal,
            recoil_animation:{
                time_scale:6,
                walk:0.1
            },

            ammo_type:ammo,

            rig_arms:WeaponsArmRig[2],
            rig_image:{
                position:v2.new(0.75,0.0),
                rotation:0,
            },
            assets:{
                world:"weapon_large_world",
                world_tint:0x22222f,
                cycle_sound:true
            },

            speed_mod:0.95,
        },extend??{})
    },
    shotgun(id:string,ammo:string,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.Shotgun,
            rank:ItemRank.C,

            barrel_length:1.06,
            idle_spread:0.75,

            fire_mode:FireMode.Single,
            fire_delay:0.2,
            switch_delay:0.2,
            unload_delay:1,
            class_switch_multiply:{
                [GunClasses.Shotgun]:10
            },

            gas_particles:GasParticles.shotgun,
            case_particle:{
                position:v2.new(0.5,0.1)
            },
            muzzle_flash:MuzzleFlash.normal,
            recoil_animation:{
                time_scale:6,
                walk:0.11
            },

            ammo_type:ammo,

            rig_arms:WeaponsArmRig[1],
            rig_image:{
                position:v2.new(0.7,0.0),
                rotation:0,
            },
            assets:{
                world:"weapon_medium_world",
                world_tint:0x22222f,
                cycle_sound:true
            },

            speed_mod:0.95,
        },extend??{})
    },
    lmg(id:string,ammo:string,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.LMG,
            rank:ItemRank.S,

            barrel_length:1.3,
            idle_spread:0.25,

            fire_mode:FireMode.Auto,
            fire_on_release:true,
            fire_delay:0.1,
            switch_delay:0.5,

            gas_particles:GasParticles.automatic,
            case_particle:{
                position:v2.new(0.7,0.1)
            },
            muzzle_flash:MuzzleFlash.normal,
            recoil_animation:{
                time_scale:12,
                walk:0.07
            },

            ammo_type:ammo,

            rig_arms:WeaponsArmRig[2],
            rig_image:{
                position:v2.new(0.75,0.0),
                rotation:0,
            },
            assets:{
                world:"weapon_large_world",
                world_tint:0x22222f,
            },

            speed_mod:0.75,
        },extend??{})
    },
}
export function Guns_Default_Init():GunDef[]{
    return [
        /////////////////////////////////////////////
        //                 PISTOLS                 //
        /////////////////////////////////////////////
        guns_factory.pistol("m9","l19",{
            name:"M9",
            fire_delay:0.2,
            fire_mode:FireMode.Single,
            spread:3,
            idle_spread:0.3,

            ammo_spawn:{
                amount:45,
            },

            bullet:{
                def:{
                    damage:11,
                    range:110,
                    falloff:0.8,
                    speed:38,
                    obstacle_mult:1.2,
                    tracer:tracers.small,
                }
            },
            recoil:{
                duration:0.2,
                speed:0.8
            },
            reload:{
                delay:2,
                capacity:15,
                extended_capacity:25,
            },
            dual:{
                dual_offset:0.2,

                fire_delay:0.1,
                spread:2,
                reload:{
                    capacity:30,
                    extended_capacity:50,
                    delay:3
                }
            },
        }),
        guns_factory.pistol("taurustx","l15",{
            name:"Taurus-TX 22",
            fire_delay:0.4,
            fire_mode:FireMode.Burst,
            burst:{
                delay:0.05,
                sequence:4
            },
            spread:5,
            idle_spread:0.4,
            ammo_spawn:{
                amount:60
            },

            bullet:{
                def:{
                    damage:8,
                    range:70,
                    falloff:0.8,
                    speed:20,
                    tracer:tracers.tiny
                }
            },
            recoil:{
                duration:0.2,
                speed:0.8
            },
            reload:{
                delay:2,
                capacity:20,
                extended_capacity:40,
            },
            dual:{
                dual_offset:0.2,

                fire_delay:0.2,
                spread:7,

                burst:{
                    delay:0.05,
                    sequence:8
                },
                reload:{
                    capacity:40,
                    extended_capacity:80,
                    delay:3
                }
            },
        }),
        guns_factory.pistol("colt1873","c22",{
            name:"Colt-1873",
            fire_delay:0.3,
            switch_delay:0.2,
            fire_mode:FireMode.Single,

            spread:1.25,
            idle_spread:0.4,

            ammo_spawn:{
                amount:30
            },

            bullet:{
                def:{
                    damage:18,
                    range:130,
                    falloff:0.8,
                    speed:43,
                    tracer:tracers.large
                }
            },
            recoil:{
                duration:1,
                speed:0.75
            },
            reload:{
                delay:3,
                capacity:6,
                extended_capacity:10,
            },
            dual:{
                spread:1,
                dual_offset:0.2,
                fire_delay:0.2,
                reload:{
                    capacity:12,
                    extended_capacity:20,
                    delay:5
                }
            },
            assets:{
                world_tint:0xb7c1c3
            }
        }),
        guns_factory.pistol("desert_eagle","p61",{
            name:"Desert-Eagle",
            fire_delay:0.3,
            fire_mode:FireMode.Single,
            rank:ItemRank.A,
            spread:3,
            idle_spread:0.33333,

            ammo_spawn:{
                amount:47,
            },

            bullet:{
                def:{
                    damage:21,
                    range:170,
                    falloff:0.8,
                    speed:45,
                    tracer:{
                        ...tracers.large,
                        color:0xd8b818
                    }
                }
            },
            recoil:{
                duration:0.3,
                speed:0.75
            },
            reload:{
                delay:2.1,
                capacity:7,
                extended_capacity:15,
            },
            dual:{
                rank:ItemRank.S,
                dual_offset:0.2,
                fire_delay:0.15,
                spread:5,
                reload:{
                    capacity:14,
                    extended_capacity:30,
                    delay:3.5
                }
            },
            assets:{
                world_tint:0xd8b818
            }
        }),
        guns_factory.pistol("pfeifer_zeliska","p85",{
            name:"Pfeifer-Zeliska",
            rank:ItemRank.S,

            fire_delay:1.6,
            switch_delay:0.1,
            spread:0.8,
            idle_spread:0.5,
            fire_mode:FireMode.Single,

            ammo_spawn:{
                amount:30
            },

            bullet:{
                def:bullets_factory.heavy_sniper(0.42)
            },
            reload:{
                delay:3.2,
                capacity:5,
                extended_capacity:7,
            },
            recoil:{
                duration:1.5,
                speed:0.3
            },
            dual:{
                dual_offset:0.2,
                fire_delay:0.8,
                reload:{
                    capacity:10,
                    extended_capacity:14,
                    delay:6
                }
            },
            speed_mod:0.95,
        }),
        /////////////////////////////////////////////
        //                 ASSAULT                 //
        /////////////////////////////////////////////
        guns_factory.assault("ak47","c51",{
            name:"AK-47",
            fire_delay:0.1,
            spread:7.5,

            ammo_spawn:{
                amount:60
            },

            bullet:{
                def:bullets_factory.assault(1)
            },
            reload:{
                delay:2.5,
                capacity:30,
                extended_capacity:45,
            },
            recoil:{
                duration:0.12,
                speed:0.75
            },
            assets:{
                world_tint:0x573c05
            }
        }),
        guns_factory.assault("ar15","c45",{
            name:"AR-15",
            fire_delay:0.07,
            spread:8,

            ammo_spawn:{
                amount:60
            },
            fire_sequence:{
                decay:0.56,
                increse:0.06,
                spread:{begin:0.3}
            },

            bullet:{
                def:bullets_factory.assault(0.85)
            },
            reload:{
                delay:2.5,
                capacity:30,
                extended_capacity:45,
            },
            recoil:{
                duration:0.1,
                speed:0.75
            },
        }),
        guns_factory.assault("m4a1","c45",{
            name:"M4A1",
            fire_delay:0.1,
            spread:2,
            fire_sequence:{
                decay:0.5,
                increse:0.065,
                spread:{begin:0.75},
            },

            ammo_spawn:{
                amount:80
            },

            bullet:{
                def:bullets_factory.assault(1.12)
            },
            reload:{
                delay:2.7,
                capacity:20,
                extended_capacity:35,
            },
            recoil:{
                duration:0.1,
                speed:0.7
            },
        }),
        guns_factory.assault("m16_gl","c45",{
            name:"M16-GL",
            fire_delay:0.08,
            spread:8,
            rank:ItemRank.S,

            alt_func:{
                type:0,
                fire_delay:3,
                recoil:{
                    duration:3,
                    speed:0.25,
                },
                ammo_type:"explosive_ammo",
                projectile:{
                    def:"m79_grenade",
                },
            },

            assets:{
                use_sound:"ar15_fire",
                use_alt_func:"m79_fire",
                reload_sound:"ar15_reload",
                switch_sound:"ar15_switch",
            },
            ammo_spawn:{
                amount:60
            },

            bullet:{
                def:bullets_factory.assault(0.85)
            },
            reload:{
                delay:2.5,
                capacity:30,
                extended_capacity:45,
            },
            recoil:{
                duration:0.1,
                speed:0.75
            },
        }),
        guns_factory.assault("mp5","l19",{
            name:"MP5",
            rank:ItemRank.D,

            fire_delay:0.08,
            spread:3,

            ammo_spawn:{
                amount:96
            },

            bullet:{
                def:bullets_factory.assault(0.8)
            },
            reload:{
                delay:2,
                capacity:32,
                extended_capacity:48,
            },
            recoil:{
                duration:0.15,
                speed:0.8
            },
        }),
        guns_factory.assault("m1921","c22",{
            name:"M1921",
            fire_delay:0.1,
            spread:8,
            fire_sequence:{
                decay:0.5,
                increse:0.045,
                spread:{begin:0.75}
            },
            idle_spread:0.35,
            rank:ItemRank.B,

            ammo_spawn:{
                amount:90
            },

            reload:{
                delay:2.5,
                capacity:40,
                extended_capacity:60,
            },
            recoil:{
                duration:0.12,
                speed:0.75
            },
            bullet:{
                def:bullets_factory.assault(0.9)
            },
            assets:{
                world_tint:0x573c05
            }
        }),
        guns_factory.assault("famas","c45",{
            name:"FAMAS",
            rank:ItemRank.B,

            fire_delay:0.4,
            spread:2.5,
            idle_spread:0.5,

            fire_mode:FireMode.Burst,
            burst:{
                delay:0.07,
                sequence:3
            },

            ammo_spawn:{
                amount:75
            },

            bullet:{
                def:bullets_factory.assault(1.25)
            },
            reload:{
                delay:2.5,
                capacity:24,
                extended_capacity:33,
            },
            recoil:{
                duration:0.4,
                speed:0.75
            },
        }),
        /////////////////////////////////////////////
        //                   SMG                   //
        /////////////////////////////////////////////
        guns_factory.smg("micro_uzi","l19",true,{
            name:"Micro-Uzi",
            rank:ItemRank.D,
            fire_delay:0.035,
            spread:10,

            ammo_spawn:{
                amount:96
            },

            bullet:{
                def:bullets_factory.smg(1)
            },
            reload:{
                delay:1.7,
                capacity:32,
                extended_capacity:48,
            },
            recoil:{
                duration:0.07,
                speed:0.77
            },
        }),
        guns_factory.smg("vector","l19",false,{
            name:"Vector",
            rank:ItemRank.A,
            fire_delay:0.037,
            spread:2,

            ammo_spawn:{
                amount:96
            },

            bullet:{
                def:bullets_factory.ac_smg(1)
            },
            reload:{
                delay:1.7,
                capacity:33,
                extended_capacity:44,
            },
            recoil:{
                duration:0.07,
                speed:0.77
            },
        }),
        guns_factory.smg("p90","c22",false,{
            name:"P90",
            rank:ItemRank.A,
            fire_delay:0.04,
            spread:6,
            fire_sequence:{
                decay:0.55,
                increse:0.05,
                spread:{begin:0.2}
            },

            ammo_spawn:{
                amount:90
            },

            bullet:{
                def:bullets_factory.ac_smg(1.15)
            },
            reload:{
                delay:2.6,
                capacity:30,
                extended_capacity:45,
            },
            recoil:{
                duration:0.07,
                speed:0.7
            },
        }),
        /////////////////////////////////////////////
        //                 SNIPERS                 //
        /////////////////////////////////////////////
        guns_factory.sniper("kar98k","c51",{
            name:"Kar98-K",
            fire_delay:1.6,
            spread:0.4,

            ammo_spawn:{
                amount:20
            },

            bullet:{
                def:bullets_factory.sniper(1)
            },
            reload:{
                delay:1,
                capacity:5,
                extended_capacity:7,
                reload_count:1,
                reload_alt:{
                    delay:2.7,
                },
            },
            recoil:{
                duration:1.8,
                speed:0.5
            },

            assets:{
                cycle_sound:true,
                world_tint:0x573c05
            }
        }),
        guns_factory.sniper("awp","c51",{
            name:"AWP",
            rank:ItemRank.S,
            fire_delay:1.6,
            spread:0.5,

            ammo_spawn:{
                amount:32
            },

            bullet:{
                def:bullets_factory.sniper(1.13,tracers.xl)
            },
            reload:{
                delay:2.7,
                capacity:8,
                extended_capacity:12,
            },
            recoil:{
                duration:1.7,
                speed:0.6
            },
            assets:{
                world_tint:0x040c29
            }
        }),
        guns_factory.sniper("awm","p85",{
            name:"AWM",
            rank:ItemRank.S,

            fire_delay:1.7,
            spread:0.6,

            ammo_spawn:{
                amount:25
            },

            bullet:{
                def:bullets_factory.heavy_sniper(1)
            },
            reload:{
                delay:3.9,
                capacity:5,
                extended_capacity:7,
            },
            recoil:{
                duration:1.85,
                speed:0.3
            },
            assets:{
                world_tint:0x334736
            }
        }),
        guns_factory.sniper("blr81","c45",{
            name:"BLR-81",
            rank:ItemRank.B,

            fire_delay:1,
            spread:1,

            ammo_spawn:{
                amount:21
            },

            bullet:{
                def:bullets_factory.sniper(0.87)
            },
            reload:{
                delay:2.5,
                capacity:3,
                extended_capacity:6
            },
            recoil:{
                duration:1,
                speed:0.75
            },
        }),
        guns_factory.sniper("model94","c22",{
            name:"Model-94",
            rank:ItemRank.B,

            fire_delay:1,
            spread:1,
            idle_spread:0.25,

            ammo_spawn:{
                amount:32
            },

            bullet:{
                def:bullets_factory.sniper(0.72)
            },
            reload:{
                delay:0.6,
                capacity:8,
                extended_capacity:13,
                reload_count:1,
            },
            recoil:{
                duration:0.9,
                speed:0.75
            },
        }),
        /////////////////////////////////////////////
        //                SHOTGUNS                 //
        /////////////////////////////////////////////
        guns_factory.shotgun("m870","p76",{
            name:"M870",
            fire_delay:1,
            spread:4.5,
            jitter_radius:0.35,

            ammo_spawn:{
                amount:10
            },

            bullet:{
                def:bullets_factory.buckshot(1),
                count:10
            },
            reload:{
                delay:0.8,
                capacity:5,
                extended_capacity:10,
                reload_count:1,
            },
            recoil:{
                duration:1.1,
                speed:0.6
            },
            assets:{
                world_tint:0x573c05
            }
        }),
        guns_factory.shotgun("spas12","p76",{
            name:"Spas12",
            rank:ItemRank.B,

            fire_delay:1,
            spread:2.5,
            jitter_radius:0.1,
    
            ammo_spawn:{
                amount:16
            },

            bullet:{
                def:bullets_factory.flechette(1),
                count:10
            },
            reload:{
                delay:0.6,
                capacity:8,
                extended_capacity:13,
                reload_count:1,
            },
            recoil:{
                duration:1.1,
                speed:0.6
            },
            assets:{
                world_tint:0x47527d
            }
        }),
        guns_factory.shotgun("hp18","p76",{
            name:"HP-18",
            rank:ItemRank.D,

            fire_delay:0.3,
            spread:6.75,
            jitter_radius:0.25,

            fire_mode:FireMode.Auto,
            ammo_spawn:{
                amount:15
            },

            bullet:{
                def:bullets_factory.birdshot(1),
                count:16
            },
            reload:{
                delay:0.8,
                capacity:5,
                extended_capacity:7,
                reload_count:1,
            },
            recoil:{
                duration:0.4,
                speed:0.75
            },
            assets:{
                cycle_sound:false
            }
        }),
        /////////////////////////////////////////////
        //                   DMR                   //
        /////////////////////////////////////////////
        guns_factory.dmr("sr25","c51",{
            name:"sr25",
            fire_delay:0.25,
            spread:2,
            ammo_spawn:{
                amount:60
            },
            bullet:{
                def:{
                    damage:23,
                    falloff:0.75,
                    range:165,
                    speed:50,
                    tracer:tracers.large
                }
            },
            reload:{
                delay:2.5,
                capacity:20,
                extended_capacity:35,
            },
            recoil:{
                duration:0.4,
                speed:0.75
            },
        }),
        guns_factory.dmr("vss","l19",{
            name:"VSS Vintorez",
            fire_delay:0.15,
            spread:6,
            fire_sequence:{
                spread:{begin:0.25},
                increse:0.07,
                decay:0.6
            },

            ammo_spawn:{
                amount:80
            },

            bullet:{
                def:{
                    damage:14,
                    falloff:0.7,
                    range:165,
                    speed:45,
                    pass_through_humans:true,
                    tracer:{
                        ...tracers.medium,
                        alpha:0.5
                    }
                }
            },

            reload:{
                delay:2.5,
                capacity:20,
                extended_capacity:40,
            },
            recoil:{
                duration:0.4,
                speed:0.8
            },
        }),
        guns_factory.dmr("rifle_cbc","l15",{
            name:"Rifle-CBC",
            fire_delay:0.14,
            spread:3,
            fire_sequence:{
                spread:{begin:0.5},
                increse:0.14,
                decay:0.6
            },

            ammo_spawn:{
                amount:60
            },

            bullet:{
                def:{
                    damage:14,
                    falloff:0.5,
                    range:165,
                    speed:40,
                    pass_through_humans:true,
                    tracer:{
                        ...tracers.small,
                        alpha:0.75
                    }
                }
            },
            reload:{
                delay:0.8,
                capacity:10,
                extended_capacity:20,
                reload_count:2
            },
            recoil:{
                duration:0.4,
                speed:0.85
            },
            assets:{
                cycle_sound:true,
            }
        }),
        guns_factory.dmr("m1_garand","c51",{
            name:"M1-Garand",
            fire_delay:0.3,
            spread:3,

            ammo_spawn:{
                amount:40
            },

            bullet:{
                def:bullets_factory.sniper(0.72)
            },

            reload:{
                delay:2.5,
                capacity:8,
                extended_capacity:12,
            },
            recoil:{
                duration:0.4,
                speed:0.7
            },
            assets:{
                use_last:true,
                world_tint:0x573c05
            }
        }),
        /////////////////////////////////////////////
        //                   LMG                   //
        /////////////////////////////////////////////
        guns_factory.lmg("pkp","c51",{
            name:"PKP Pecheneg",

            fire_delay:0.1,
            switch_delay:1,
            spread:9,
            fire_sequence:{
                decay:0.13,
                increse:0.02,
                spread:{begin:0.4}
            },

            ammo_spawn:{
                amount:200
            },

            bullet:{
                def:{
                    damage:12,
                    obstacle_mult:2,
                    range:170,
                    speed:35,
                    falloff:0.7,
                    tracer:tracers.large
                }
            },
            reload:{
                delay:5,
                capacity:200,
                extended_capacity:250,
            },
            recoil:{
                duration:0.13,
                speed:0.75
            },
        }),
        guns_factory.lmg("m249","c45",{
            name:"M249",

            fire_delay:0.1,
            switch_delay:1,
            spread:6,
            idle_spread:0.4,
            fire_sequence:{
                decay:0.25,
                increse:0.04,
                spread:{begin:0.45}
            },

            ammo_spawn:{
                amount:200
            },

            bullet:{
                def:bullets_factory.assault(0.87)
            },
            reload:{
                delay:6,
                capacity:100,
                extended_capacity:200,
            },
            recoil:{
                duration:0.1,
                speed:0.75
            },
        }),
        guns_factory.lmg("xm556","c45",{
            name:"XM556-Minigun",

            fire_delay:0.045,
            switch_delay:1,
            spread:8,
            idle_spread:0.35,
            fire_sequence:{
                decay:0.07,
                increse:0.011,
                spread:{begin:0.2}
            },

            ammo_spawn:{
                amount:200
            },

            bullet:{
                def:bullets_factory.assault(0.85)
            },
            reload:{
                delay:6.2,
                capacity:200,
                extended_capacity:300,
            },
            speed_mod:0.5,
            recoil:{
                duration:0.1,
                speed:0.7
            },
            recoil_animation:{
                time_scale:40,
                walk:0.07
            },
        }),
        /////////////////////////////////////////////
        //                  MISC                   //
        /////////////////////////////////////////////
        {
            idString:"rpg7",
            name:"RPG-7",
            class:GunClasses.Miscellaneous,
            rank:ItemRank.S,

            fire_delay:1,
            switch_delay:0.3,
            spread:0.5,
            idle_spread:0.5,

            barrel_length:1.3,
            ammo_type:"explosive_ammo",
            fire_mode:FireMode.Single,
            ammo_spawn:{
                amount:11
            },
            gas_particles:{
                count:10,
                life_time:1.2,
                speed:{
                    min:1,
                    max:2
                },
                direction_variation:0.4,
                size:{
                    min:0.6,
                    max:2,
                }
            },
            bullet:{
                def:{
                    damage:5,
                    range:70,
                    falloff:0.5,
                    on_hit_explosion:"rocket_explosion",
                    speed:20,
                    critical_mult:1.2,
                    obstacle_mult:3,
                    tracer:{
                        height:4,
                        width:2,
                        particles:{
                            frame:1
                        },
                    }
                }
            },
            reload:{
                delay:2,
                capacity:1,
            },
            recoil:{
                duration:1.45,
                speed:0.25
            },
            speed_mod:0.6,
            assets:{
                world:"weapon_large_world",
                world_tint:0x22222f,
            },
            muzzle_flash:MuzzleFlash.normal,
            rig_arms:WeaponsArmRig[1],
            rig_image:WeaponsRig[0]
        },
        {
            idString:"m79",
            name:"M79",
            class:GunClasses.Miscellaneous,
            rank:ItemRank.A,

            fire_delay:1,
            switch_delay:0.1,
            spread:1,
            idle_spread:0.33333,
            barrel_length:1,
            barrel_offset:0.45,

            ammo_type:"explosive_ammo",
            fire_mode:FireMode.Single,

            ammo_spawn:{
                amount:11
            },

            gas_particles:{
                count:10,
                life_time:1.2,
                speed:{
                    min:1,
                    max:2
                },
                direction_variation:0.4,
                size:{
                    min:0.6,
                    max:2,
                }
            },

            projectile:{
                def:"m79_grenade",
            },
            reload:{
                delay:2,
                capacity:1,
            },
            recoil:{
                duration:1,
                speed:0.6
            },
            speed_mod:0.75,
            rig_arms:WeaponsArmRig[1],
            rig_image:WeaponsRig[0],
            assets:{
                world:"weapon_medium_world",
                world_tint:0x22222f
            },
        },
        {
            idString:"m2_2",
            name:"M2-2",
            class:GunClasses.Miscellaneous,
            rank:ItemRank.A,

            fire_delay:0.1,
            switch_delay:1,
            spread:10,
            idle_spread:0.5,
            barrel_length:1,

            ammo_type:"gasoline",
            fire_mode:FireMode.Auto,

            ammo_spawn:{
                amount:15
            },

            synsed_particle:{
                count:2,
                def:"m2_2_fire",
                speed:{
                    min:10,
                    max:20
                },
            },
            reload:{
                delay:5,
                capacity:5,
                extended_capacity:7,
                ammo_consume:0.05,
            },
            recoil:{
                duration:1.45,
                speed:0.5
            },
            rig_arms:WeaponsArmRig[1],
            rig_image:{
                position:v2(0.28,0.075),
                rotation:0,
            },
            speed_mod:0.6,
        },
    ]
}