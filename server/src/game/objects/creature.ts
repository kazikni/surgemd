import { Hitbox2D, Stream, NullHitbox2D, v2, Vec2 } from "common/engine/core.ts";
import { type CreatureDef } from "common/scripts/definitions/objects/creatures.ts";
import { DamageParams } from "../others/utils.ts";
import { GameObjectType, LootData } from "common/scripts/others/constants.ts";
import { MovingBody, MovingBodyPhysicalData } from "./moving_body.ts";
import { ServerGameObject } from "../others/gameObject.ts";
export type CreaturePhysicalData=MovingBodyPhysicalData&{
    spawn_hitbox:Hitbox2D
    hitbox:Hitbox2D
}

export class Creature extends MovingBody {
    string_type: string = "creature"
    number_type: number = GameObjectType.Creature

    def!: CreatureDef
    ai: any = {}

    health: number = 100
    dead: boolean = false

    spawn_hitbox!:Hitbox2D
    override physical_data: CreaturePhysicalData&{dirty:boolean}
    loot: LootData[] = []

    old_pos?:Vec2
    old_rot?:number

    constructor() {
        super()

        this.physical_data = {
            dirty:false,
            rotation: 0,
            velocity: v2.zero,
            hitbox:new NullHitbox2D(v2.zero),
            spawn_hitbox:new NullHitbox2D(v2.zero)
        }

        this.allow_tick=true
        this.allow_net_update=true
    }

    override on_create(args: { position: Vec2, def: CreatureDef }) {
        this.def = args.def

        this.position=args.position
        this.physical_data.hitbox=args.def.hitbox.clone()
        this.physical_data.spawn_hitbox=(args.def.spawn_hitbox??args.def.hitbox).clone()
        this.base_hitbox=this.physical_data.hitbox

        this.health = this.def.health

        if (this.def.loot_table) {
            this.loot = this.game.get_loot_table(this.def.loot_table)
        }

        this.def.on_start?.(this, args, false)
    }
    kill() {
        if (this.dead) return
        this.dead = true

        this.def.on_die?.(false)

        for (const l of this.loot) {
            this.game.add_loot(this.position, {item:l.item, count:l.count})
        }
    }
    damage(params: DamageParams) {
        if (this.def.imortal) return
        this.health = Math.max(this.health - params.amount, 0)
        this.def.on_damage?.(params, false)
        if (this.health <= 0) {
            this.kill()
        }
    }
    override on_collided(obj: ServerGameObject,_dt:number) {
        this.def.on_collided?.(obj, false)
    }
    override on_net_update(): void {
        this.def.net_update?.(this, false)
        this.physical_data.dirty=false
    }
    override on_tick(dt: number): void {
        if (this.dead) {
            this.destroy()
            return
        }
        super.on_tick(dt)
        this.def.update?.(this, dt, false)
        if(this.old_rot===undefined||!this.old_pos||!v2.is(this.old_pos,this.position)||this.is_new){
            this.old_pos=v2.clone(this.position)
            this.old_rot=this.physical_data.rotation
            this.physical_data.dirty = true
            this.set_dirty_part()
        }
    }
    override on_encode_net(stream: Stream, full: boolean): void {
        stream.write_boolean_group(this.physical_data.dirty,this.dead)

        if(this.physical_data.dirty||full)this.physical_encode(stream)
        if (full) {
            stream.write_uint16(this.def.idNumber!)
        }

        this.def.encode?.(this, stream, full)
    }
}