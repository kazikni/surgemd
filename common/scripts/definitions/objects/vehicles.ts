import { CircleHitbox2D, DeepPartial, Definition, Definitions, FrameTransform, Hitbox2D, HitboxGroup2D, mergeDeep, v2, Vec2 } from "../../../engine/core.ts";
import { Spawn, SpawnMode } from "../../others/constants.ts";
import { FloorKind } from "../../others/terrain.ts";
import { ScopeChange } from "../utils.ts";
export interface WheelDef{
    movable: boolean
    position: Vec2
    scale: number
    marks?: {
        frame?:string
        stress_resistance?:number
        frame_transform?:FrameTransform
    }
}
export interface VehicleSeatDef{
    position: Vec2
    leave: Vec2
    doors: Vec2[]
    scope_change?:ScopeChange
}
export interface VehicleDef extends Definition {
    hitbox: Hitbox2D

    spawn?:SpawnMode
    frame: {
        base?: string
        base_transform?: FrameTransform
        zindex?: number
    }
    center: Vec2
    physics: {
        mass: number

        engine_force: number
        brake_force: number

        traction: number

        drag: number

        max_steer_speed: number
        steer_force: number
        reverse_speed_mult: number

        floor_kind?:Record<number,{rolling_resistance:number,traction:number}>
    }
    pillot_seat?: VehicleSeatDef
    seats?: VehicleSeatDef[]
    wheels: {
        stress_distance?:number
        defs: WheelDef[]
        frame?: string
    }
    infinity_walk?: boolean
}

export const VehicleTemplates = {
    bike: (id: string, ...merge: DeepPartial<VehicleDef>[]) => mergeDeep({
        idString: id,
        spawn:Spawn.ground,
        hitbox: new HitboxGroup2D(
            new CircleHitbox2D(v2(1.0, 0), 1.0),
            new CircleHitbox2D(v2(-0.9, 0), 1.0),
            new CircleHitbox2D(v2(0, 0), 1.2)
        ),
        frame: {
            base_transform:{
                scale:2.5
            }
        },
        center: v2(0, 0),
        pillot_seat: {
            position: v2(0, 0),
            leave: v2(0, 1),
            doors: [v2(0, 0.5), v2(0, -0.5)],
            scope_change:{zoom:0.25}
        },
        wheels: {
            defs: [
                {movable: true,position: v2(0.75, 0),scale: 1},
                {movable: true,position: v2(-0.75, 0),scale: 1}
            ]
        },
        physics:{
            mass:130,

            engine_force:700,
            brake_force:700,

            traction:1.1,

            drag:0.1,

            max_steer_speed:7,
            steer_force:20,
            reverse_speed_mult:0.25
        },
    }, ...merge),
    jeep:(id:string,...merge)=>mergeDeep({
        idString:id,
        spawn:Spawn.ground,
        hitbox:new HitboxGroup2D(
            new CircleHitbox2D(v2(1.2,0.55),1.15),
            new CircleHitbox2D(v2(1.2,-0.55),1.15),

            new CircleHitbox2D(v2(-1.2,0.55),1.2),
            new CircleHitbox2D(v2(-1.2,-0.55),1.2),

            new CircleHitbox2D(v2(0,0),1.45)
        ),
        frame: {
            base_transform:{
                scale:4
            }
        },
        center:v2(0,0),
        physics:{
            mass:1200,

            engine_force:20000,
            brake_force:1000,
            reverse_speed_mult:0.75,

            traction:1.5,
            drag:1.4,
            max_steer_speed:25,
            steer_force:20,
            floor_kind:{
                [FloorKind.Liquid]:{
                    traction:0.2,
                    rolling_resistance:4,
                }
            }
        },
        pillot_seat:{
            position:v2(0,-0.7),
            leave:v2(0,-1.5),
            doors:[v2(0,-1.5)],
            scope_change:{zoom:0.3}
        },

        seats:[
            {
                position:v2(0,0.7),
                leave:v2(0,2),
                doors:[v2(0,1.5)]
            }
        ],

        wheels:{
            defs:[
                {
                    movable:true,
                    position:v2(.4,-1.4),
                    marks:{
                        stress_resistance:2.5,
                    },
                    scale:2.5,
                },
                {
                    movable:true,
                    position:v2(.4,1.4),
                    marks:{
                        stress_resistance:2.5,
                    },
                    scale:2.5
                },
                {
                    movable:false,
                    position:v2(-1.5,-1.4),
                    marks:{
                    },
                    scale:2.5
                },
                {
                    movable:false,
                    position:v2(-1.5,1.4),
                    marks:{
                    },
                    scale:2.5
                }
            ]
        },
    },...merge),
    boat:(id:string,...merge)=>mergeDeep({
        idString:id,
        spawn:Spawn.river_water,
        hitbox:new HitboxGroup2D(
            new CircleHitbox2D(v2(1.2,0.55),1.15),
            new CircleHitbox2D(v2(1.2,-0.55),1.15),

            new CircleHitbox2D(v2(-1.2,0.55),1.2),
            new CircleHitbox2D(v2(-1.2,-0.55),1.2),

            new CircleHitbox2D(v2(0,0),1.45)
        ),
        frame: {
            base:"jeep",
            base_transform:{
                scale:4
            }
        },
        center:v2(0,0),
        physics:{
            mass:1200,

            engine_force:4500,
            brake_force:1000,
            reverse_speed_mult:0.45,
            traction:0.4,
            drag:5,
            max_steer_speed:12,
            steer_force:12,
            floor_kind:{
                [FloorKind.Liquid]:{
                    traction:4,
                    rolling_resistance:-4.8
                },
            }
        },
        pillot_seat:{
            position:v2(-2,0),
            leave:v2(-2,-1.5),
            doors:[v2(-2,-1.5)],
            scope_change:{zoom:0.3}
        },
        seats:[
            {
                position:v2(0,0),
                leave:v2(0,-1.5),
                doors:[v2(0,-1.5)]
            },
        ],
        wheels:{
            defs:[]
        }
    },...merge)
} satisfies Record<string, (id: string, ...merge: DeepPartial<VehicleDef>[]) => VehicleDef>

export function Vehicles_Default_Init(vehicles: Definitions<VehicleDef, {}>) {
    vehicles.insert(
        VehicleTemplates.bike("bike"),
        VehicleTemplates.jeep("jeep"),
        VehicleTemplates.boat("boat"),
    )
}