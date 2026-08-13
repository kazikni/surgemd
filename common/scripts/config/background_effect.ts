export enum BackgroundELayerType{
    Tile,
    Static
}
export type BackgroundELayer={
    css?:string
    class_name?:string
    top?:number
    bottom?:number
    left?:number
    right?:number
    childs?:BackgroundELayer[]
}&({
    type:BackgroundELayerType.Static
    size?:number
}|{
    type:BackgroundELayerType.Tile
    speed:number
    size?:number
})
export interface BackgroundETheme{
    class_name?:string
    css?:string
    accent?:string
    timescale?:number
}
export interface BackgroundEDef{
    theme:BackgroundETheme
    layers:BackgroundELayer[]
}

export const backgrounds={
    city:{
        theme:{
            css:`
background:linear-gradient(
to bottom,
#102540 0%,
#0b1630 45%,
#050811 100%
)
            `,
        },
        layers:[
            {type:BackgroundELayerType.Static,css:
`
position: fixed;
width: 100%;
height: 100%;
background:url("/assets/img/menu/final_screen/stars.png") center/contain;
background-size: 13vw 13vw;
opacity: 20%;
`
            },
            {type:BackgroundELayerType.Static,css:`
left:50%;
top:20%;

width:30vw;
height:30vw;

transform:translate(-50%,-50%);

border-radius:50%;
background:#5dc9f044;
filter:blur(120px);`},
            {type:BackgroundELayerType.Static,css:`
left:50%;
top:20%;

width:10vw;
height:10vw;

transform:translate(-50%,-50%);

background:url("/assets/img/menu/final_screen/moon.png") center/contain no-repeat;`},
            {type:BackgroundELayerType.Tile,speed:0.35,size:50,css:'background:url("/assets/img/menu/final_screen/mountains_1.png")'},
            {type:BackgroundELayerType.Tile,speed:0.38,size:35,css:'background:url("/assets/img/menu/final_screen/buildings_1.svg")'},
            {type:BackgroundELayerType.Tile,speed:0.5,size:16,css:'background:url("/assets/img/menu/final_screen/utility_poles_1.svg")'},
            {type:BackgroundELayerType.Tile,speed:0.83,size:30,css:'background:url("/assets/img/menu/final_screen/beach_front_1.svg")'},
        ],
    },
    city_river:{
        theme:{
            css:`
background:linear-gradient(
to bottom,
#102540 0%,
#0b1630 45%,
#050811 100%
)
            `,
        },
        layers:[
            {type:BackgroundELayerType.Static,css:`
position: fixed;
width: 100%;
height: 100%;
background:url("/assets/img/menu/final_screen/stars.png") center/contain;
background-size: 13vw 13vw;
opacity: 20%;
`},
            {type:BackgroundELayerType.Static,css:`
left:50%;
top:20%;

width:30vw;
height:30vw;

transform:translate(-50%,-50%);

border-radius:50%;
background:#5dc9f044;
filter:blur(120px);`},
            {type:BackgroundELayerType.Static,css:`
left:50%;
top:20%;

width:10vw;
height:10vw;

transform:translate(-50%,-50%);

background:url("/assets/img/menu/final_screen/moon.png") center/contain no-repeat;`},

            {type:BackgroundELayerType.Tile,speed:0.35,bottom:12,size:50,css:'background:url("/assets/img/menu/final_screen/mountains_1.png")'},
            {type:BackgroundELayerType.Tile,speed:0.38,bottom:12,size:35,css:'background:url("/assets/img/menu/final_screen/buildings_1.svg")'},
            {type:BackgroundELayerType.Tile,speed:0.5,bottom:12,size:16,css:'background:url("/assets/img/menu/final_screen/utility_poles_1.svg")'},
            {type:BackgroundELayerType.Tile,speed:0.83,bottom:12,size:30,css:'background:url("/assets/img/menu/final_screen/beach_front_1.svg")'},

            {type:BackgroundELayerType.Static,bottom:9,css:`
width: 100%;
height: 5vw;
background:#050811;
left: 0;
right: 0;`},

            {type:BackgroundELayerType.Static,bottom:-2,css:`
left:0;
right:0;
height:15.5vw;
overflow:hidden;
transform:scaleY(-0.7);
filter: blur(7px) brightness(.75) saturate(80%);
backdrop-filter: blur(7px) brightness(.75) saturate(80%);`,childs:[
    {type:BackgroundELayerType.Tile,speed:0.35,bottom:0,size:50,css:'background:url("/assets/img/menu/final_screen/mountains_1.png")'},
    {type:BackgroundELayerType.Tile,speed:0.38,bottom:0,size:35,css:'background:url("/assets/img/menu/final_screen/buildings_1.svg")'},
    {type:BackgroundELayerType.Tile,speed:0.5,bottom:0,size:16,css:'background:url("/assets/img/menu/final_screen/utility_poles_1.svg")'},
    {type:BackgroundELayerType.Tile,speed:0.83,bottom:-1,size:30,css:'background:url("/assets/img/menu/final_screen/beach_front_1.svg")'},
]},
            {type:BackgroundELayerType.Tile,speed:1,bottom:8,size:3,css:'opacity:0.5;background:url("/assets/img/menu/final_screen/waves.svg")'},
            {type:BackgroundELayerType.Tile,speed:1.2,bottom:4,size:2.5,css:'opacity:0.5;background:url("/assets/img/menu/final_screen/waves.svg")'},
            {type:BackgroundELayerType.Tile,speed:1.4,bottom:0,size:2,css:'opacity:0.5;background:url("/assets/img/menu/final_screen/waves.svg")'},
        ],
    },
    city_river_bloodmoon:{
        theme:{
            css:`
background:linear-gradient(
to bottom,
#102540 0%,
#0b1630 45%,
#050811 100%
)
            `,
        },
        layers:[
            {type:BackgroundELayerType.Static,css:`
position: fixed;
width: 100%;
height: 100%;
background:url("/assets/img/menu/final_screen/stars.png") center/contain;
background-size: 13vw 13vw;
opacity: 20%;
`},
            {type:BackgroundELayerType.Static,css:`
left:50%;
top:20%;

width:30vw;
height:30vw;

transform:translate(-50%,-50%);

border-radius:50%;
background:#f05d5d44;
filter:blur(120px);`},
            {type:BackgroundELayerType.Static,css:`
left:50%;
top:20%;

width:10vw;
height:10vw;

transform:translate(-50%,-50%);
filter:brightness(1) contrast(1) sepia(1) hue-rotate(-60deg) saturate(1);
background:url("/assets/img/menu/final_screen/moon.png") center/contain no-repeat;`},

            {type:BackgroundELayerType.Tile,speed:0.35,bottom:12,size:50,css:'background:url("/assets/img/menu/final_screen/mountains_1.png")'},
            {type:BackgroundELayerType.Tile,speed:0.38,bottom:12,size:35,css:'background:url("/assets/img/menu/final_screen/buildings_1.svg")'},
            {type:BackgroundELayerType.Tile,speed:0.5,bottom:12,size:16,css:'background:url("/assets/img/menu/final_screen/utility_poles_1.svg")'},
            {type:BackgroundELayerType.Tile,speed:0.83,bottom:12,size:30,css:'background:url("/assets/img/menu/final_screen/beach_front_1.svg")'},

            {type:BackgroundELayerType.Static,bottom:9,css:`
width: 100%;
height: 5vw;
background:#050811;
left: 0;
right: 0;`},

            {type:BackgroundELayerType.Static,bottom:-2,css:`
left:0;
right:0;
height:15.5vw;
overflow:hidden;
transform:scaleY(-0.7);
filter: blur(7px) brightness(.75) saturate(80%);
backdrop-filter: blur(7px) brightness(.75) saturate(80%);`,childs:[
    {type:BackgroundELayerType.Tile,speed:0.35,bottom:0,size:50,css:'background:url("/assets/img/menu/final_screen/mountains_1.png")'},
    {type:BackgroundELayerType.Tile,speed:0.38,bottom:0,size:35,css:'background:url("/assets/img/menu/final_screen/buildings_1.svg")'},
    {type:BackgroundELayerType.Tile,speed:0.5,bottom:0,size:16,css:'background:url("/assets/img/menu/final_screen/utility_poles_1.svg")'},
    {type:BackgroundELayerType.Tile,speed:0.83,bottom:-1,size:30,css:'background:url("/assets/img/menu/final_screen/beach_front_1.svg")'},
]},
            {type:BackgroundELayerType.Tile,speed:1,bottom:8,size:3,css:'opacity:0.5;background:url("/assets/img/menu/final_screen/waves.svg")'},
            {type:BackgroundELayerType.Tile,speed:1.2,bottom:4,size:2.5,css:'opacity:0.5;background:url("/assets/img/menu/final_screen/waves.svg")'},
            {type:BackgroundELayerType.Tile,speed:1.4,bottom:0,size:2,css:'opacity:0.5;background:url("/assets/img/menu/final_screen/waves.svg")'},
        ],
    },

    static:{
        theme:{
            class_name:"tv-static"
        },
        layers:[]
    },
    static_blue:{
        theme:{
            class_name:"tv-static",
            css:"opacity:0.5;filter: brightness(0.2) contrast(1.2) sepia(1) hue-rotate(180deg) saturate(6);"
        },
        layers:[]
    }
} satisfies Record<string,BackgroundEDef>