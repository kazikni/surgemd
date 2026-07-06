import { DeepPartial, Definition, Definitions, FrameTransform, mergeDeep, Random1, v2, Vec2 } from "../../../engine/core.ts";
import { WeaponsArmRig,WeaponsRig, ItemRank, tracers, FistRig, WeaponAssets, FireMode} from "../../others/item.ts";
import { BulletDef, InventoryItemType } from "../utils.ts";
export interface GunRecoilDef{
    duration:number
    speed:number
}
export type GunDef={
    item_type?:InventoryItemType.gun
    class:GunClasses
    rank:ItemRank
    description?:string|boolean

    barrel_length:number
    barrel_offset?:number

    fire_delay:number
    switch_delay?:number
    switch_multiply?:number
    class_switch_multiply?:Partial<Record<GunClasses,number>>

    spread?:number
    move_spread?:number
    jitter_radius?:number

    fire_mode?:FireMode
    fire_on_release?:boolean
    burst?:{
        delay:number
        sequence:number
    }

    muzzle_flash?:MuzzleFlash
    gas_particles?:GasParticle
    case_particle?:{
        position:Vec2
        at_begin?:boolean
        frame?:string
        sound?:string
    }

    bullet?:{
        def:BulletDef
        count?:number
    }
    projectile?:{
        def:string
        count?:number
        angular_speed?:number
        speed?:number
    }
    synsed_particle?:{
        def:string
        count?:number
        speed?:Random1
    }
    alt_func?:GunAltFunc

    recoil?:GunRecoilDef
    speed_mod?:number

    ammo_type:string
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
})&Definition
export interface DualAdditional{dual_offset:number}
export interface GasParticle{
    count:number
    size:{
        min:number
        max:number
    }
    speed:{
        min:number
        max:number
    }
    life_time:number
    direction_variation:number
}
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
export interface MuzzleFlash{
    sprite:string
}
export const MuzzleFlash={
    normal:{
        sprite:"muzzle_flash_1",
    }
}
export interface GunAltFunc{
    type:0// Shot Projectile
    projectile:string
    speed:number
    delay:number
    ammo:string
}
export const GunsConstructors={
    extends(gun:GunDef,variant:DeepPartial<GunDef>):GunDef{
        return mergeDeep({}as GunDef,gun,variant)as GunDef
    },
}

export const GasParticles={
    shotgun:{
        count:7,
        size:{
            min:0.5,
            max:1.2
        },
        speed:{
            min:1,
            max:2
        },
        life_time:0.9,
        direction_variation:0.4
    } satisfies GasParticle,
    sniper:{
        count:8,
        size:{
            min:0.6,
            max:1.4
        },
        speed:{
            min:1,
            max:2
        },
        life_time:1.1,
        direction_variation:0.43
    } satisfies GasParticle,
    dmr:{
        count:3,
        size:{
            min:0.6,
            max:1.4
        },
        speed:{
            min:1,
            max:2
        },
        life_time:1.1,
        direction_variation:0.43
    } satisfies GasParticle,
    automatic:{
        count:1, 
        size:{
            min:0.8,
            max:1
        },
        speed:{
            min:1,
            max:2
        },
        life_time:0.7,
        direction_variation:0.2
    } satisfies GasParticle,
    pistols:{
        count:2,
        size:{
            min:0.7,
            max:0.8
        },
        speed:{
            min:1,
            max:2
        },
        life_time:0.7,
        direction_variation:0.2
    } satisfies GasParticle
}

export const bullets_factory={
    assault(power:number):BulletDef{
        return {
            damage:8*power,
            range: 160*(1+(power-1) * 0.3),
            speed: 39*(1+(power-1) * 0.7),

            criticalMult: 1.25,
            obstacleMult: 1,
            falloff:0.75,
            tracer:tracers.medium
        }
    },
    sniper(power:number,tracer=tracers.large):BulletDef{
        return {
            damage: 45 * power,
            range: 180 * (1 + (power - 1) * 0.5),
            speed: 55 * (1 + (power - 1) * 0.3),

            criticalMult: 1.1,
            obstacleMult: 1.25,
            falloff: 0.7,
            tracer: tracer
        }
    },
    smg(power:number,tracer=tracers.small):BulletDef{
        return {
            damage:5 * power,
            range:47 * (1 + (power - 1) * 0.4),
            speed:29 * (1 + (power - 1) * 0.7),

            falloff:0.7,
            criticalMult:1.2,
            tracer:tracer
        }
    },

    buckshot(power:number,tracer=tracers.small):BulletDef{
        return {
            damage:7 * power,
            speed:25 * (1 + (power - 1) * 0.4),
            range:31 * (1 + (power - 1) * 0.4),

            falloff:0.7,
            criticalMult:1.2,
            tracer:tracer
        }
    },
    birdshot(power:number,tracer=tracers.tiny):BulletDef{
        return {
            damage:3*power,
            speed:25*(1+(power-1)*0.4),
            range:31*(1+(power-1)*0.4),

            falloff:0.5,
            criticalMult:1.2,
            tracer
        }
    },
    flechette(power:number,tracer=tracers.small):BulletDef{
        return {
            damage:5.6 * power,
            speed:29 * (1 + (power - 1) * 0.4),
            range:52 * (1 + (power - 1) * 0.2),

            falloff:0.7,
            criticalMult:1.2,
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
            switch_delay:0.6,

            gas_particles:GasParticles.pistols,
            muzzle_flash:MuzzleFlash.normal,
            case_particle:{
                position:v2.new(0.5,0.1)
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

            barrel_length:1,

            fire_delay:0.1,
            switch_delay:0.6,

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
            speed_mod:0.97,
        },extend??{})
    },
    smg(id:string,ammo:string,small:boolean,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.SMG,
            rank:ItemRank.C,

            barrel_length:1,

            fire_delay:0.1,
            switch_delay:0.6,

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

            speed_mod:0.98,
        },extend??{})
    },
    dmr(id:string,ammo:string,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.DMR,
            rank:ItemRank.A,
            
            barrel_length:1,

            fire_mode:FireMode.Single,
            fire_delay:0.1,
            switch_delay:0.2,

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

            speed_mod:0.95,
        },extend??{})
    },
    sniper(id:string,ammo:string,extend:DeepPartial<GunDef>={}):GunDef{
        return mergeDeep({
            idString:id,
            class:GunClasses.Sniper,
            rank:ItemRank.A,

            barrel_length:1.3,

            fire_mode:FireMode.Single,
            fire_on_release:true,
            fire_delay:0.1,
            switch_delay:0.15,

            gas_particles:GasParticles.sniper,
            case_particle:{
                position:v2.new(0.7,0.1)
            },
            muzzle_flash:MuzzleFlash.normal,

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

            barrel_length:0.9,

            fire_mode:FireMode.Single,
            fire_delay:0.1,
            switch_delay:0.1,
            class_switch_multiply:{
                [GunClasses.Shotgun]:8
            },

            gas_particles:GasParticles.shotgun,
            case_particle:{
                position:v2.new(0.5,0.1)
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

            fire_mode:FireMode.Auto,
            fire_on_release:true,
            fire_delay:0.1,
            switch_delay:0.6,

            gas_particles:GasParticles.automatic,
            case_particle:{
                position:v2.new(0.7,0.1)
            },
            muzzle_flash:MuzzleFlash.normal,

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

            speed_mod:0.8,
        },extend??{})
    },
}
export function Guns_Default_Init(guns:Definitions<GunDef,{}>){
    guns.insert(
        guns_factory.pistol("m9","9mm",{
            fire_delay:0.2,
            fire_mode:FireMode.Single,
            spread:1,
            move_spread:3,

            ammo_spawn:{
                amount:45,
            },

            bullet:{
                def:{
                    damage:11,
                    range:110,
                    falloff:0.8,
                    speed:38,
                    obstacleMult:1.2,
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
                ammo_spawn:{
                    amount:90,
                },
                reload:{
                    capacity:30,
                    extended_capacity:50,
                    delay:3
                }
            },
        }),
        guns_factory.pistol("taurustx","22lr",{
            fire_delay:0.4,
            fire_mode:FireMode.Burst,
            burst:{
                delay:0.05,
                sequence:4
            },
            spread:2,
            move_spread:2,
            ammo_spawn:{
                amount:60
            },

            bullet:{
                def:{
                    damage:7,
                    range:70,
                    falloff:0.5,
                    speed:22,
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
                spread:3,

                ammo_spawn:{
                    amount:120
                },
                burst:{
                    delay:0.06,
                    sequence:8
                },
                reload:{
                    capacity:40,
                    extended_capacity:80,
                    delay:3
                }
            },
        }),
        guns_factory.pistol("colt1873","45acp",{
            fire_delay:0.3,
            switch_delay:0.2,
            fire_mode:FireMode.Single,

            spread:0.5,
            move_spread:2.5,

            ammo_spawn:{
                amount:30
            },

            bullet:{
                def:{
                    damage:17,
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
                ammo_spawn:{
                    amount:60
                },
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
        guns_factory.pistol("desert_eagle","50cal",{
            fire_delay:0.3,
            fire_mode:FireMode.Single,
            rank:ItemRank.A,
            spread:1,
            move_spread:3,

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
                spread:2,
                ammo_spawn:{
                    amount:94,
                },
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
        guns_factory.pistol("pfeifer_zeliska","308sub",{
            rank:ItemRank.S,

            fire_delay:1.5,
            switch_delay:0.1,
            spread:0.4,
            move_spread:2,
            fire_mode:FireMode.Single,

            ammo_spawn:{
                amount:25
            },

            bullet:{
                def:{
                    damage:55,
                    range:190,
                    falloff:0.7,
                    speed:45,
                    obstacleMult:1.7,
                    tracer:tracers.large
                }
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
        guns_factory.assault("ak47","762mm",{
            fire_delay:0.1,
            spread:2,
            move_spread:3,

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
        guns_factory.assault("ar15","556mm",{
            fire_delay:0.07,
            spread:4,
            move_spread:2,

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
                duration:0.1,
                speed:0.75
            },
        }),
        guns_factory.assault("m4a1","556mm",{
            fire_delay:0.08,
            spread:1,
            move_spread:2.5,

            ammo_spawn:{
                amount:60
            },

            bullet:{
                def:bullets_factory.assault(1.1)
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
        guns_factory.assault("m16_gl","556mm",{
            fire_delay:0.07,
            spread:4,
            move_spread:2,
            rank:ItemRank.S,

            alt_func:{
                type:0,
                ammo:"explosive_ammo",
                delay:2.5,
                projectile:"m79_grenade",
                speed:13
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
                def:bullets_factory.assault(1)
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
        guns_factory.assault("mp5","9mm",{
            fire_delay:0.1,
            spread:1,
            move_spread:3,
            rank:ItemRank.D,

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
        guns_factory.assault("m1921","45acp",{
            fire_delay:0.1,
            spread:3,
            move_spread:2,
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
                def:bullets_factory.assault(0.95)
            },
            assets:{
                world_tint:0x573c05
            }
        }),
        guns_factory.assault("famas","556mm",{
            rank:ItemRank.B,

            fire_delay:0.4,
            spread:1.5,
            move_spread:2,

            fire_mode:FireMode.Burst,
            burst:{
                delay:0.1,
                sequence:3
            },

            ammo_spawn:{
                amount:75
            },

            bullet:{
                def:bullets_factory.assault(1.15)
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
        guns_factory.smg("micro_uzi","9mm",true,{
            rank:ItemRank.D,
            fire_delay:0.03,
            spread:4,
            move_spread:2,

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
        guns_factory.smg("vector","9mm",false,{
            rank:ItemRank.A,
            fire_delay:0.03,
            spread:1,
            move_spread:2.3,

            ammo_spawn:{
                amount:96
            },

            bullet:{
                def:bullets_factory.smg(1)
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
        guns_factory.smg("p90","45acp",false,{
            rank:ItemRank.A,
            fire_delay:0.04,
            spread:1.2,
            move_spread:2.3,

            ammo_spawn:{
                amount:90
            },

            bullet:{
                def:bullets_factory.smg(1.25)
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
        guns_factory.sniper("kar98k","762mm",{
            fire_delay:1.3,
            spread:0.2,
            move_spread:2,

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
                duration:1.4,
                speed:0.5
            },

            assets:{
                cycle_sound:true,
                world_tint:0x573c05
            }
        }),
        guns_factory.sniper("awp","762mm",{
            rank:ItemRank.S,
            fire_delay:1.4,
            spread:0.3,
            move_spread:2,

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
                duration:1.5,
                speed:0.6
            },
            assets:{
                world_tint:0x040c29
            }
        }),
        guns_factory.sniper("awm","308sub",{
            rank:ItemRank.S,

            fire_delay:1.5,
            spread:0.4,
            move_spread:2,

            ammo_spawn:{
                amount:25
            },

            bullet:{
                def:{
                    damage:105,
                    range:160,
                    falloff:0.7,
                    speed:50,
                    criticalMult:1.1,
                    obstacleMult:2,
                    tracer:tracers.large
                }
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
        guns_factory.sniper("blr81","556mm",{
            rank:ItemRank.B,

            fire_delay:1,
            spread:0.5,
            move_spread:2,

            ammo_spawn:{
                amount:15
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
        guns_factory.sniper("model94","45acp",{
            rank:ItemRank.B,

            fire_delay:1,
            spread:0.5,
            move_spread:2,

            ammo_spawn:{
                amount:12
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
        guns_factory.shotgun("m870","12g",{
            fire_delay:1,
            spread:3,
            move_spread:1.7,
            jitter_radius:0.4,

            ammo_spawn:{
                amount:10
            },

            bullet:{
                def:bullets_factory.buckshot(1),
                count:9
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
        guns_factory.shotgun("spas12","12g",{
            rank:ItemRank.B,

            fire_delay:1,
            spread:2.1,
            move_spread:1.2,
            jitter_radius:0.1,
    
            ammo_spawn:{
                amount:16
            },

            bullet:{
                def:bullets_factory.flechette(1),
                count:9
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
        guns_factory.shotgun("hp18","12g",{
            rank:ItemRank.D,

            fire_delay:0.3,
            spread:4,
            move_spread:1.5,
            jitter_radius:0.25,

            fire_mode:FireMode.Auto,
            ammo_spawn:{
                amount:15
            },

            bullet:{
                def:bullets_factory.birdshot(1),
                count:15
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
        guns_factory.dmr("sr25","762mm",{
            fire_delay:0.3,
            spread:1,
            move_spread:2,
            ammo_spawn:{
                amount:60
            },
            bullet:{
                def:{
                    damage:23,
                    falloff:0.75,
                    range:165,
                    speed:55,
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
        guns_factory.dmr("vss","9mm",{
            fire_delay:0.2,
            spread:1,
            move_spread:3,

            ammo_spawn:{
                amount:80
            },

            bullet:{
                def:{
                    damage:14,
                    falloff:0.7,
                    range:165,
                    speed:50,
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
        guns_factory.dmr("rifle_cbc","22lr",{
            fire_delay:0.2,
            spread:1.5,
            move_spread:3,

            ammo_spawn:{
                amount:54
            },

            bullet:{
                def:{
                    damage:15,
                    falloff:0.5,
                    range:165,
                    speed:45,
                    pass_through_humans:true,
                    tracer:{
                        ...tracers.small,
                        alpha:0.75
                    }
                }
            },
            reload:{
                delay:0.7,
                capacity:9,
                extended_capacity:18,
                reload_count:1
            },
            recoil:{
                duration:0.4,
                speed:0.85
            },
            assets:{
                cycle_sound:true,
            }
        }),
        guns_factory.dmr("m1_garand","762mm",{
            fire_delay:0.3,
            spread:1.5,
            move_spread:2,

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
        guns_factory.lmg("pkp","762mm",{
            fire_delay:0.12,
            switch_delay:1,
            spread:2,
            move_spread:4,

            ammo_spawn:{
                amount:200
            },

            bullet:{
                def:{
                    damage:14,
                    obstacleMult:1.5,
                    range:170,
                    speed:42,
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
        guns_factory.lmg("m249","556mm",{
            fire_delay:0.1,
            switch_delay:1,
            spread:2,
            move_spread:2.5,

            ammo_spawn:{
                amount:200
            },

            bullet:{
                def:{
                    damage:10,
                    obstacleMult:1.5,
                    range:170,
                    speed:42,
                    tracer:tracers.medium
                }
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
        {
            idString:"rpg7",
            class:GunClasses.Miscellaneous,
            rank:ItemRank.S,

            fire_delay:1,
            switch_delay:0.3,
            spread:0.2,
            move_spread:2,
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
                    speed:26,
                    criticalMult:1.2,
                    obstacleMult:3,
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
            class:GunClasses.Miscellaneous,
            rank:ItemRank.A,

            fire_delay:1,
            switch_delay:0.1,
            spread:0.2,
            move_spread:3,
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
            class:GunClasses.Miscellaneous,
            rank:ItemRank.A,

            fire_delay:0.1,
            switch_delay:1,
            spread:5,
            move_spread:2,
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
    )
}