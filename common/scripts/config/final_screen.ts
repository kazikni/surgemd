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
export const island_final:FinalScreenDef={
    theme:{
        css:`
            background: linear-gradient(to bottom, #0d1e35, #040618);
        `,
        accent:"#33b8ff",
        music:"/assets/sounds/musics/final_screen_music_1.mp3"
    },
    background:[
        {
            type:FinalScreenLayerType.Static,
            image:"/assets/img/menu/final_screen/moon.png",
            css:`
                top:150px;
                left:50%;
                height:200px;
                transform: translateX(-50%);
            `
        },
        {
            type:FinalScreenLayerType.Static,
            image:"/assets/img/menu/final_screen/moon.png",
            css:`
                top:150px;
                left:50%;
                height:200px;
                transform: translateX(-50%);
                filter: blur(100px);
            `
        },
        // Cloud
        {
            type:FinalScreenLayerType.Walk,
            image:"/assets/img/menu/final_screen/cloud_1.svg",
            css:`
                top:50px;
                opacity:50%;
                filter: blur(3px);
            `,
            speed:0.01,
            count:3,
            gap:1000,
        },
        // Mountains
        {
            type:FinalScreenLayerType.Tile,
            image:"/assets/img/menu/final_screen/mountains_1.png",
            css:`
                bottom:0px;
                height:750px;
            `,
            speed:0.04
        },

        {
            type:FinalScreenLayerType.Walk,
            image:"/assets/img/menu/final_screen/palm.png",
            css:`
                height:320px;
                bottom:-20px;
            `,
            speed:0.35,
            count:4,
            gap:800,
        },
        {
            type:FinalScreenLayerType.Walk,
            image:"/assets/img/menu/final_screen/building_1.png",
            css:`
                height:550px;
                bottom:0px;
            `,
            speed:0.5,
            count:5,
            gap:1000,
        },
        {
            type:FinalScreenLayerType.Walk,
            image:"/assets/img/menu/final_screen/palm.png",
            css:`
                height:480px;
                bottom:-20px;
            `,
            speed:0.75,
            count:4,
            gap:800,
        }
        /*
        // Reflected Montains
        {
            type:FinalScreenLayerType.Tile,
            image:"/assets/img/menu/final_screen/mountains_1.png",
            css:`
                bottom:250px;
                height:400px;
                transform: scale(100%,-50%), translateY(-100%);
                filter: blur(20px);
            `,
            speed:0.05
        },
        // Water Waves
        {
            type:FinalScreenLayerType.Tile,
            image:"/assets/img/menu/final_screen/waves.svg",
            css:`
                bottom:50px;
                height:50px;
                opacity:50%;
                filter: blur(1px);
            `,
            speed:0.13
        },
        {
            type:FinalScreenLayerType.Tile,
            image:"/assets/img/menu/final_screen/waves.svg",
            css:`
                bottom:150px;
                height:40px;
                opacity:50%;
                filter: blur(1px);
            `,
            speed:0.12
        },
        {
            type:FinalScreenLayerType.Tile,
            image:"/assets/img/menu/final_screen/waves.svg",
            css:`
                bottom:215px;
                height:35px;
                opacity:50%;
                filter: blur(1px);
            `,
            speed:0.11
        },
        */
    ],
    foreground:[
    ],
}