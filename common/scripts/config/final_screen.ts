export enum FinalScreenLayerType{
    Static,
    Walk,
    Tile,
}
export type FinalScreenLayer={
    image:string
    css?:string
    class_name?:string
}&({
    type:FinalScreenLayerType.Static
}|{
    type:FinalScreenLayerType.Walk
    begin_x?:number
    inverted?:boolean
    speed?:number
    count?:number
    gap?:number
}|{
    type:FinalScreenLayerType.Tile
    inverted?:boolean
    speed?:number
})
export interface FinalScreenTheme{
    class_name?:string
    css?:string
    accent?:string
    music?:string
}
export interface FinalScreenDef{
    theme:FinalScreenTheme
    foreground?:FinalScreenLayer[]
    background?:FinalScreenLayer[]
}
export const city_final:FinalScreenDef={
    theme:{
        css:`
            background: linear-gradient(to bottom, #0d1e35, #040618);
        `,
        accent:"#33b8ff",
        music:"/sounds/musics/final_screen_music_1.mp3"
    },
    background:[
        {
            type:FinalScreenLayerType.Static,
            image:"/img/menu/final_screen/moon.svg",
            css:`
                top:150px;
                left:50%;
                transform: translateX(-50%)
            `
        },
        {
            type:FinalScreenLayerType.Walk,
            image:"/img/menu/final_screen/building_1.svg",
            css:`
                top:280px;
            `,
            speed:0.7,
            count:2,
            gap:1500,
        },
        {
            type:FinalScreenLayerType.Walk,
            image:"/img/menu/final_screen/palm.svg",
            css:`
                top:600px;
            `,
            speed:1,
            count:4,
            gap:800,
        }
    ],
}
export const island_final:FinalScreenDef={
    theme:{
        css:`
            background: linear-gradient(to bottom, #0d1e35, #040618);
        `,
        accent:"#33b8ff",
        music:"/sounds/musics/final_screen_music_1.mp3"
    },
    background:[
        {
            type:FinalScreenLayerType.Static,
            image:"/img/menu/final_screen/moon.svg",
            css:`
                top:150px;
                left:50%;
                transform: translateX(-50%);
            `
        },
        // Reflected Moon
        {
            type:FinalScreenLayerType.Static,
            image:"/img/menu/final_screen/moon.svg",
            css:`
                left:50%;
                bottom:0px;
                transform: translateX(-50%) scale(65%, -65%);
                filter: blur(20px);
            `
        },
        // Cloud
        {
            type:FinalScreenLayerType.Walk,
            image:"/img/menu/final_screen/cloud_1.svg",
            css:`
                top:50px;
                opacity:50%;
                filter: blur(3px);
            `,
            speed:0.01,
            count:3,
            gap:1000,
        },
        {
            type:FinalScreenLayerType.Walk,
            image:"/img/menu/final_screen/cloud_1.svg",
            css:`
                bottom:25px;
                opacity:50%;
                filter: blur(10px);
                transform: scale(60%,-60%);
            `,
            speed:0.01,
            count:3,
            gap:1000,
        },
        // Mountains
        {
            type:FinalScreenLayerType.Tile,
            image:"/img/menu/final_screen/mountains_1.svg",
            css:`
                bottom:250px;
                height:400px;
            `,
            speed:0.05
        },
        
        // Reflected Montains
        {
            type:FinalScreenLayerType.Tile,
            image:"/img/menu/final_screen/mountains_1.svg",
            css:`
                bottom:250px;
                height:400px;
                transform: scaleY(-50%) translateY(-100%);
                filter: blur(20px);
            `,
            speed:0.05
        },
        // Water Waves
        {
            type:FinalScreenLayerType.Tile,
            image:"/img/menu/final_screen/waves.svg",
            css:`
                bottom:50px;
                height:50px;
                opacity:50%;
                filter: blur(4px);
            `,
            speed:0.13
        },
        {
            type:FinalScreenLayerType.Tile,
            image:"/img/menu/final_screen/waves.svg",
            css:`
                bottom:150px;
                height:40px;
                opacity:50%;
                filter: blur(4px);
            `,
            speed:0.12
        },
        {
            type:FinalScreenLayerType.Tile,
            image:"/img/menu/final_screen/waves.svg",
            css:`
                bottom:215px;
                height:35px;
                opacity:50%;
                filter: blur(4px);
            `,
            speed:0.11
        },
        {
            type:FinalScreenLayerType.Tile,
            image:"/img/menu/final_screen/waves.svg",
            css:`
                bottom:295px;
                height:30px;
                opacity:50%;
                filter: blur(4px);
            `,
            speed:0.1
        },
    ],
    foreground:[
    ],
}