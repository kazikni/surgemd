export enum BoostType{
    Adrenaline,
    Shield,
    Mana,
    Addiction,
    GreenBless,
    Death
}
export interface BoostDef{
    name:string
    type:BoostType
    color:string
}
export const Boosts={
    [BoostType.Shield]:{
        name:"shield",
        color:"#08f",
        type:BoostType.Shield
    },
    [BoostType.Adrenaline]:{
        name:"adrenaline",
        color:"#ff0",
        type:BoostType.Adrenaline
    },
    [BoostType.Mana]:{
        name:"mana",
        color:"#92a",
        type:BoostType.Mana
    },
    [BoostType.Addiction]:{
        name:"addiction",
        color:"#e13",
        type:BoostType.Addiction
    },
    [BoostType.GreenBless]:{
        name:"green_bless",
        color:"#1f3",
        type:BoostType.GreenBless
    },
    [BoostType.Death]:{
        name:"death",
        color:"#001",
        type:BoostType.Death
    }
} as Record<BoostType,BoostDef>