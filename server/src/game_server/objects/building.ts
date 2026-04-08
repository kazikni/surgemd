import { BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts";
import { type Human } from "./human.ts";
import { Angle, NetStream, Orientation, v2, v2m, Vec2 } from "common/engine/core.ts";
import { StaticBody } from "./static_body.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";

export class Building extends StaticBody {
    override string_type = "building"
    override number_type = GameObjectType.Building
    def!: BuildingDef

    state = 0
    side: Orientation = 0

    dead = false

    constructor() {
        super()
        this.updatable = false
    }

    override interact(_user: Human): void {}

    set_definition(def: BuildingDef) {
        if (this.def) return
        this.def = def

        if (def.hitbox) {
            this.physical_data.hitbox = def.hitbox.clone()
            this.base_hitbox = this.physical_data.hitbox
        }
        if(this.def.spawnHitbox){
            this.physical_data.spawn_hitbox=this.def.spawnHitbox
        }else{
            this.physical_data.spawn_hitbox=this.base_hitbox
        }
        this.physical_data.reflect_bullet=this.def.reflect_bullets??false

        this.update_hitbox()
    }
    generate(position: Vec2, side: number){
        this.set_position(position, side)

        for (const b of this.def.sub_building ?? []) {
            const def=this.game.definitions.buildings.getFromString(b.id)
            const p = v2.rotate_RadAngle(b.position,Angle.side_rad(this.side))

            v2m.add(p,p,this.position)
            const obj=this.game.map.add_building(def,this.layer+(b.layer??0))
            obj.generate(p,b.rotation??0)
        }
        for (const o of this.def.obstacles ?? []) {
            const def=this.game.definitions.obstacles.getFromString(o.id)
            const p = v2.rotate_RadAngle(o.position,Angle.side_rad(this.side))
            v2m.add(p,p,this.position)
            const obj=this.game.map.add_obstacle(def,o.rotation,this.layer+(o.layer??0))
            obj.set_position(p,0)
        }
        for (const l of this.def.loots ?? []) {
            const items = this.game.loot_tables.get_loot(l.table, { withammo: true },this.game)
            const p = v2.add_with_orientation(this.position, l.position, this.side)
            for (const li of items) {
                this.game.add_loot(p, li.item, li.count, this.layer)
            }
        }

        for(const f of this.def.floors??[]){
            const hb=f.hitbox.transform(this.position)
            const l=this.layer+(f.layer??0)
            this.game.map.terrain.add_floor(f.type,hb,l)
        }
        this.manager.cells.updateObject(this)
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writeBooleanGroup(this.physical_data.dirty_part,this.physical_data.dirty)
        super.encode(stream,full)
        if(full){
            stream.writeID(this.def.idNumber!)
        }
    }
}
