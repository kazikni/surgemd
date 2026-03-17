import { v2, Vec2 } from "../../engine/core.ts";

export enum ItemQuality{
    Common,
    Uncommon,
    Rare,
    Epic,
    Mythic,
    Legendary,
    Developer
}
export interface FistRig{
    left?:{
        position:Vec2
        rotation:number
        zIndex?:number
    }
    right?:{
        position:Vec2
        rotation:number
        zIndex?:number
    }
}
export interface WeaponAssets{
    item?:string
    item_tint?:number
    world?:string
    world_tint?:number
    cycle_sound?:string|boolean
    use_sound?:string
}
export interface WeaponRig{
    position:Vec2
    rotation:number
    scale?:number
    zIndex?:number
    hotspot?:Vec2
}
export const DefaultFistRig:FistRig={
    left:{
        position:v2.new(0.5,-0.18),
        rotation:0.1,
    },
    right:{
        position:v2.new(0.5,0.18),
        rotation:-0.1,
    }
}
export const WeaponsArmRig={
    0:{
        left:{
            position:v2.new(0.7,-0.05),
            rotation:0.35,
        },
        right:{
            position:v2.new(0.53,0.07),
            rotation:-0.3,
        }
    },
    1:{
        left:{
            position:v2.new(0.8,-0.045),
            rotation:0.32,
        },
        right:{
            position:v2.new(0.5,0),
            rotation:-0.2,
        }
    },
    2:{
        left:{
            position:v2.new(0.7,-0.035),
            rotation:0.35,
        },
        right:{
            position:v2.new(0.5,0.05),
            rotation:-0.3,
        }
    },
    3:{
        right:{
            position:v2.new(0.55,0),
            rotation:-0.45,
        }
    },
}
export const WeaponsRig={
    0:{
        position:v2.new(0.6,0),
        rotation:0
    },
}
export const tracers={
    tiny:{
        width:5,
        height:1, // 0.4H = 0.01 radius
        proj:{
            img:0,
            width:1,
            height:1
        }
    },
    small:{
        width:5.5,
        height:1.2, // 0.6H = 0.012 radius
        proj:{
            img:0,
            width:1,
            height:1
        }
    },
    medium:{
        width:8.5,
        height:1.3, // 0.7H = 0.014 radius
        proj:{
            img:0,
            width:1,
            height:1
        }
    },
    large:{
        width:12,
        height:2.3, // 1H = 0.02 radius
        proj:{
            img:0,
            width:1,
            height:1
        }
    },
    xl:{
        width:12,
        height:2.7, // 1.2H = 0.025 radius
        proj:{
            img:0,
            width:1,
            height:1
        }
    },
    mirv:{
        height:1.3,// 0.4h = 0.01 radius
        width:2,
        color:0x0044aa,
        proj:{
            img:0,
            width:1,
            height:1
        }
    },
    black_projectile:{
        height:1, // 1H = 0.02 radius
        width:1.3,
        color:0x334455,
        proj:{
            img:0,
            width:1,
            height:1
        }
    }
}