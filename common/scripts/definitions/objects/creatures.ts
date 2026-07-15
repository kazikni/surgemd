import { CircleHitbox2D, Definition, Definitions, Hitbox2D,  Stream, Numeric, random, v2, Vec2 } from "../../../engine/core.ts";
import { LootTable, SpawnMode } from "../../others/constants.ts";
import { FloorType } from "../../others/terrain.ts";
export type CreatureDef={
    loot_table?:LootTable

    imortal?:boolean
    health:number

    spawn?:SpawnMode
    spawn_hitbox?:Hitbox2D
    hitbox:Hitbox2D

    on_start?:(creature:any,params:any,client_side:boolean)=>void
    on_damage?:(params:any,client_side:boolean)=>void
    on_collided?:(obj:any,client_side:boolean)=>void
    on_die?:(client_side:boolean)=>void

    update?:(creature:any,dt:number,client_side:boolean)=>void
    net_update?:(creature:any,client_side:boolean)=>void

    encode?:(creature:any,stream:Stream,full:boolean)=>void
    decode?:(creature:any,stream:Stream,full:boolean)=>void

    assets?:any
    ai?:any
}&Definition
export const SpriteEntity={
    on_start(c,_params,cs){
        if(!cs)return

        c.main_sprite=c.container.create_sprite()
        c.main_sprite.hotspot = v2.half_one
        c.main_sprite.zIndex = 2
        c.main_sprite.set_frame(c.def.assets.frames.main,c.game.resources)
    }
} satisfies Partial<CreatureDef>
export const PacifictCreature1 = {
    on_start(c, _params, cs) {
        if (cs) return
        c.ai = {
            time: 0,
            angle_dest: random.rad(),
        }
        c.angle = c.ai.angle_dest
    },
    update(c, dt, cs) {
        if(cs)return
        const ai = c.ai ??= {
            time: 0,
            angle_dest: random.rad(),
        }

        const speed = c.def.ai?.speed ?? 0.4
        const walk_time = c.def.ai?.walk_time ?? 1
        const walk_ext = c.def.ai?.walk_time_extension ?? 2
        const only_walk = c.def.ai?.only_walk ?? FloorType.Grass
        const turn_speed = c.def.ai?.turn_speed ?? 10

        function get_offset(angle: number): Vec2 {
            return v2.from_RadAngle(angle, random.float(1, 4))
        }

        function is_valid_direction(angle: number): boolean {
            const pos = v2.add(c.position, get_offset(angle))
            return c.game.map.terrain.get_floor_type(pos, c.layer, FloorType.Water) === only_walk
        }

        function choose_new_angle() {
            let tries = 0
            let angle = random.rad()

            while (!is_valid_direction(angle)) {
                angle = random.rad()
                if (tries++ > 20) break
            }

            ai.angle_dest = angle
        }

        if (ai.time <= 0) {
            ai.time = walk_time + random.float(0, walk_ext)
            choose_new_angle()
        }

        c.physical_data.rotation = Numeric.lerp_rad(c.physical_data.rotation, ai.angle_dest, Numeric.dt_expo_inter(turn_speed,dt))

        if (!is_valid_direction(c.physical_data.rotation)) {
            choose_new_angle()
            c.physical_data.velocity = v2.zero
        } else {
            c.physical_data.velocity=v2.from_RadAngle(c.physical_data.rotation,speed)
        }
        ai.time -= dt
    }
} satisfies Partial<CreatureDef>
export function Creatures_Default_Init(creatures:Definitions<CreatureDef,{}>){
    creatures.insert(
        {
            idString:"chicken",
            health:50,
            hitbox:new CircleHitbox2D(v2(0,0),0.25),
            ai:{
                speed:0.5,
                walk_time:3,
                walk_time_extension:3,
                only_walk:FloorType.Grass
            },
            assets:{
                frames:{
                    main:{
                        image:"chicken_1",
                        scale:1.5
                    }
                }
            },
            on_start(c,p,cs){
                SpriteEntity.on_start(c,p,cs)
                PacifictCreature1.on_start(c,p,cs)
            },
            update(c,dt,cs){
                PacifictCreature1.update(c,dt,cs)
            }
        },
        {
            idString:"pig",
            health:50,
            hitbox:new CircleHitbox2D(v2(0,0),0.25),
            ai:{
                speed:0.5,
                walk_time:3,
                walk_time_extension:3,
                only_walk:FloorType.Grass
            },
            assets:{
                frames:{
                    main:{
                        image:"pig_1",
                        scale:1.5
                    }
                }
            },
            on_start(c,p,cs){
                SpriteEntity.on_start(c,p,cs)
                PacifictCreature1.on_start(c,p,cs)
            },
            update(c,dt,cs){
                PacifictCreature1.update(c,dt,cs)
            }
        }
    )
}