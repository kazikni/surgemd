import { CircleHitbox2D, DeepPartial, Definition, Definitions, Hitbox2D, HitboxGroup2D, mergeDeep, v2, Vec2 } from "../../../engine/core.ts";

export interface VehicleDef extends Definition {
    hitbox: Hitbox2D

    frame: {
        base?: string
        base_scale?: number
        zindex?: number
    }
    center: Vec2
    physics: {
        mass: number

        engine_force: number
        brake_force: number

        traction: number

        drag: number
        rolling_resistance: number

        max_steer_speed: number
        steer_force: number

        max_speed: number
        reverse_speed_mult: number
    }
    pillot_seat?: {
        position: Vec2
        leave: Vec2
        doors: Vec2[]
    }
    seats?: {
        position: Vec2
        leave: Vec2
        doors: Vec2[]
    }[]
    wheels: {
        defs: {
            movable: boolean
            position: Vec2
            scale: number
        }[]
        frame?: string
    }
    infinity_walk?: boolean
}

export const VehicleTemplates = {
    bike: (id: string, ...merge: DeepPartial<VehicleDef>[]) => mergeDeep({
        idString: id,
        hitbox: new HitboxGroup2D(
            new CircleHitbox2D(v2(1.0, 0), 1.0),
            new CircleHitbox2D(v2(-0.9, 0), 1.0),
            new CircleHitbox2D(v2(0, 0), 1.2)
        ),
        frame: {
            base_scale: 2.5
        },
        center: v2(0, 0),
        pillot_seat: {
            position: v2(0, 0),
            leave: v2(0, 1),
            doors: [v2(0, 0.5), v2(0, -0.5)]
        },
        wheels: {
            defs: [
                {
                    movable: true,
                    position: v2(0.5, 0),
                    scale: 2.5
                }
            ]
        },
        physics:{
            mass:100,

            engine_force:800,
            brake_force:700,

            traction:0.7,

            drag:0.1,
            rolling_resistance:0.5,

            max_steer_speed:7,
            steer_force:20,

            max_speed:22,
            reverse_speed_mult:0.25
        },
    }, ...merge),
    jeep:(id:string,...merge)=>mergeDeep({
        idString:id,

        hitbox:new HitboxGroup2D(
            new CircleHitbox2D(v2(1.2,0.55),1.15),
            new CircleHitbox2D(v2(1.2,-0.55),1.15),

            new CircleHitbox2D(v2(-1.2,0.55),1.2),
            new CircleHitbox2D(v2(-1.2,-0.55),1.2),

            new CircleHitbox2D(v2(0,0),1.45)
        ),
        frame:{
            base_scale:4
        },
        center:v2(0,0),
        physics:{
            mass:1200,
            engine_force:3500,
            brake_force:1000,
            traction:1,
            drag:0.2,
            rolling_resistance:0.1,
            max_steer_speed:12,
            steer_force:12,
            max_speed:20,
            reverse_speed_mult:0.45
        },
        pillot_seat:{
            position:v2(0,-0.7),
            leave:v2(0,-1.5),
            doors:[v2(0,-1.5)]
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
                    scale:2.5
                },
                {
                    movable:true,
                    position:v2(.4,1.4),
                    scale:2.5
                },
                {
                    movable:false,
                    position:v2(-1.5,-1.4),
                    scale:2.5
                },
                {
                    movable:false,
                    position:v2(-1.5,1.4),
                    scale:2.5
                }
            ]
        }
    },...merge)
} satisfies Record<string, (id: string, ...merge: DeepPartial<VehicleDef>[]) => VehicleDef>

export function Vehicles_Default_Init(vehicles: Definitions<VehicleDef, {}>) {
    vehicles.insert(
        VehicleTemplates.bike("bike"),
        VehicleTemplates.jeep("jeep"),
    )
}