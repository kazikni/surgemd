import { ScoreApplyerType } from "../others/constants.ts";

export interface FinalScreenLayer{
    image:string

    transform?:string
    x?:string
    y:number

    alpha?:number

    inverted?:boolean
    speed?:number
    count?:number
    gap?:number
}
export enum FinalScreenEffectType{
    Rain,
    Snow,
    Fog,
    Stars,
    Moon,
    Sun,
    Scanlines,
    VHS,
    PalmLeaves,
    Fireflies
}
export interface FinalScreenEffect{
    type:FinalScreenEffectType

    amount?:number
    speed?:number

    color?:number
}
export interface FinalScreenTheme{
    background:string
    accent:string
    text:string
    music?:string
}
export interface FinalScreenDef{
    theme:FinalScreenTheme
    effects:FinalScreenEffect[]
    foreground:FinalScreenLayer[]
    background:FinalScreenLayer[]
}
export const city_final:FinalScreenDef={
    theme:{
        background:"linear-gradient(to bottom, #0d1e35, #040618)",
        accent:"#33b8ff",
        text:"#ffffff",
        music:"/sounds/musics/final_screen_music_1.mp3"
    },
    background:[
        {
            image:"/img/menu/final_screen/moon.svg",
            y:150,
            transform:"translateX(-50%)",
            x:"50%",
            speed:0,
        },
        {
            image:"/img/menu/final_screen/building_1.svg",
            y:280,
            speed:0.7,
            count:2,
            gap:1500,
        },
    ],
    foreground:[
        {
            image:"/img/menu/final_screen/palm.svg",
            y:600,
            speed:1,
            count:4,
            gap:800,
        }
    ],
    effects:[
        {
            type:FinalScreenEffectType.Moon
        }
    ],
}