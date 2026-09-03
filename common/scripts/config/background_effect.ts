import { BackgroundEDef, BackgroundELayerType, CutsceneTheme } from "../../engine/core/definition/utils.ts";

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
    },
    smoke: {
        theme: {
            css: `
                background: #050008;

                overflow: hidden;

                --smoke-color-1: #ff174f99;
                --smoke-color-2: #7700ff99;
                --smoke-color-3: #006cff99;
                --smoke-color-4: #00ffff99;
                --smoke-color-5: #48ff0099;
                --smoke-color-6: #a6ff0099;
                --smoke-color-7: #ffd90099;
                --smoke-color-8: #ff7b0099;

                --current-smoke-a: var(--smoke-color-1);
                --current-smoke-b: var(--smoke-color-2);

                animation: smoke-color-a 30s linear infinite alternate, smoke-color-b 30s linear infinite alternate;
            `
        },
        inner_html: `
            <svg width="0" height="0" style="position:absolute" aria-hidden="true">
                <filter id="distort" x="-20%" y="-20%" width="140%" height="140%">
                    <feTurbulence type="fractalNoise" baseFrequency=".006 .012" numOctaves="3" seed="7" result="noise"/>
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="130" xChannelSelector="R" yChannelSelector="G"/>
                </filter>
            </svg>
        `,
        layers: [
            {

                type: BackgroundELayerType.Static,
                css: `
                    position: absolute;
                    inset: -15%;
                    width: 130%;
                    height: 130%;
                    filter: url(#distort);
                    transform-origin: center;
                    animation: smoke-distort 20s ease-in-out infinite alternate;
                `,

                childs: [
                    {

                        type: BackgroundELayerType.Static,
                        css: `
                            position: absolute;
                            width: 170vw;
                            height: 170vh;
                            left: -35vw;
                            top: -35vh;
                            border-radius: 50%;

                            background: radial-gradient(ellipse 42% 55% at 20% 30%, var(--current-smoke-a) 0%,var(--current-smoke-a) 18%, transparent 70%), radial-gradient(ellipse 50% 48% at 78% 72%,var(--current-smoke-a) 0%,transparent 72%);

                            mix-blend-mode: screen;

                            filter: blur(55px) saturate(1.25);
                            transform-origin: center;

                            animation:smoke-move-1 20s ease-in-out infinite alternate;
                        `
                    },
                    {

                        type: BackgroundELayerType.Static,
                        css: `
                            position: absolute;
                            width: 185vw;
                            height: 185vh;
                            left: -42vw;
                            top: -42vh;
                            border-radius: 50%;

                            background:radial-gradient( ellipse 50% 55% at 76% 20%, var(--current-smoke-b) 0%, var(--current-smoke-b) 18%, transparent 69%), radial-gradient(ellipse 45% 55%at 25% 82%,var(--current-smoke-b) 0%,transparent 72%);

                            mix-blend-mode: screen;

                            filter: blur(55px) saturate(1.25);
                            transform-origin: center;
                            animation:smoke-move-2 25s ease-in-out infinite alternate;
                        `
                    },
                    {
                        type: BackgroundELayerType.Static,
                        css: `
                            position: absolute;
                            width: 210vw;
                            height: 210vh;
                            left: -55vw;
                            top: -55vh;
                            border-radius: 50%;

                            background:radial-gradient(ellipse 42% 50%at 50% 50%,var(--current-smoke-a) 0%,transparent 70%);
                            opacity: 0.5;

                            mix-blend-mode: screen;

                            filter: blur(110px) saturate(1.2);

                            animation: smoke-soft 60s ease-in-out infinite alternate;
                        `
                    }
                ]
            }

        ]

    },
} satisfies Record<string,BackgroundEDef>
export const default_cutscene_theme: CutsceneTheme = {
    text:{
        color:"#fff",
        font:"Russo-One",
        size:"20px"
    },
    text_styles:{
        "nn_title_blue":{
            typewriter:{delay:{min:40,max:200}},
            color:"#104b81",
            font:"Russo-One",
            size:"15vh",
        },
        "nn_location":{
            typewriter:{delay:{min:40,max:150}},
            color:"#eee",
            font:"Russo-One",
            size:"3.5vh",
        },
        "nn_date":{
            typewriter:{delay:{min:40,max:200}},
            color:"#eee",
            font:"Russo-One",
            size:"2vh",
        },
        "nn_description":{
            typewriter:{delay:{min:40,max:100}},
            color:"#bbb",
            font:"Russo-One",
            size:"3vw",
            css:"letter-spacing: 1px;"
        },

        credits_role: {
            font: "Russo-One",
            color: "#2d17a2",
            size: "4vh",
            typewriter:{delay:{min:40,max:200}},
            css:`
                text-align: center;
                text-shadow: 1.5px 1.5px 0 #5a2ce6, 3px 3px 0 #5419d0;

                filter: drop-shadow(0 0 12px rgba(84, 25, 208, 0.65)) drop-shadow(0 0 35px rgba(84, 25, 208, 0.35));

                //animation: TitleAnimation 30s infinite ease-in-out alternate;
            `
        },
        credits: {
            font: "Russo-One",
            color: "#cfd6eb",
            size: "8vh",
            weight: "bold",
            typewriter:{delay:{min:40,max:50}},
            css: `
                text-align: center;
                line-height: 1.05;
                text-shadow: 3px 3px 0 #aac0f2, 6px 6px 0 #7691eb;

                filter: drop-shadow(0 0 10px rgba(118, 145, 235, 0.7)) drop-shadow(0 0 30px rgba(118, 145, 235, 0.4));
            `
        },
    },
    dialog:{
        background:"linear-gradient(135deg,rgba(7, 170, 238, 0.08),rgba(7, 170, 238, 0.18))",
        padding:"8px 12px",
        border:"2px solid #07aaee80",
        radius:"12px",
        max_width:"90%",
        name:{
            color:"#ffffff",
            size:"20px",
            weight:"bold"
        },
        content: {
            size: "16px",
            color: "#ffffff"
        }
    },
}

export const FinalCredits=[
    {
        role: "Created By",
        users: "Kazikni / Hugo Mendonça Santana"
    },
    {
        role: "Programmed By",
        users: "@kazikni"
    },
    {
        role: "Game Designs / Graphics",
        users: [
            "@kazikni",
            "@cheerfulbull_29688",
            "@endermanking",
            "@littlethief69",
            "Suroi.io",
            "Surviv.io",
            "Survev.io"
        ]
    },

    {
        role: "Menu Design",
        users: [
            "@kazikni",
            "@namerio"
        ]
    },

    {
        role: "Sound Design",
        users: [
            "@kazikni",
            "@teardwop",
            "Surviv.io",
            "Suroi.io",
            "Free Sounds On Net",
            "Half-Life",
            "Postal 2",
            "Fortnite"
        ]
    },

    {
        role: "Music",
        users: [
            "@showusmusic",
            "@rivals2444",
            "Wreckfest",
            "I Wanna Be The Guy",
            "Various YouTube Music",
            "NoCopyrightSounds",
            "Hotline Miami 2",
            "Five Nights at Freddy's"
        ]
    },

    {
        role: "Lore",
        users: "@kazikni"
    },

    {
        role: "Additional Art",
        users: [
            "@sentido_ss",
            "@bien.star",
            "@paoagiota4740"
        ]
    },

    {
        role: "Videos / Trailers",
        users: [
            "@kazikni",
            "@rapxtor_yt"
        ]
    },

    {
        role: "Discord Server",
        users: [
            "@kazikni",
            "@Zahirralt2"
        ]
    },
    {
        role: "Inspirations",
        users: [
            "Surviv.io",
            "Hotline Miami 1 & 2",
            "Suroi.io",
            "Roblox Doors",
            "Pixel Gun 3D",
            "Fortnite"
        ]
    },
    {
        role: "Special Thanks",
        users: [
            "Surviv.io creators",
            "@hasanger",
            "@1092384",
            "@mamoun0",
            "@leia_uwu",
            "@guiz3rabrr2466._24385",
            "@jgpow",
            "Everyone Who Played",
        ]
    }
]