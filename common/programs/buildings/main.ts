import { kxml, rect, v2 } from "../../engine/core.ts";
import { MakeBuilding } from "./builder.ts";

const b=MakeBuilding({
    size:v2(500,500),
    walls:{
        walls:[
            [
                v2.new(0,300),
                v2.new(0,0),
                v2.new(250,0),
            ],
            [
                v2.new(300,0),
                v2.new(500,0),
                v2.new(500,30),
            ],
            [
                v2.new(0,350),
                v2.new(0,500),
                v2.new(500,500),
                v2.new(500,80),
            ],
        ],
        width:20,
        attr:{
            ...kxml.svg.fill.color("#fff"),
            ...kxml.svg.stroke.color("#000",1)
        }
    },
    patterns:{
        /*"bricks-pattern-1":{
            children:[kxml.svg.create.grid_floor("#bb1919",v2.new(300,100),kxml.svg.stroke.color("#5a0f0f", 2),8,8)],
            size:v2.new(100,30),
        },*/
        "wood-pattern-1":{
            children:[kxml.svg.create.grid_floor("rgb(223, 162, 106)",v2.new(100,30),kxml.svg.stroke.color("#8b4320", 1))],
            size:v2.new(100,30),
        }
    },
    floors:[
        {
            rect:rect.create(0,0,500,500),
            pattern:{
                id:"wood-pattern-1",
            }
        },
        /*{
            rect:rect.create(100,100,100,100),
            pattern:{
                id:"bricks-pattern-1",
            }
        }*/
    ],
})
console.log(kxml.stringify(b.svg.floor))