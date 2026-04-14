import { BuildingDef } from "common/scripts/definitions/objects/buildings_base.ts";
import { type Human } from "./human.ts";
import { Hitbox2D, NetStream, NullHitbox2D, Orientation, v2, v2m, Vec2 } from "common/engine/core.ts";
import { StaticBody, StaticBodyPhysicalData } from "./static_body.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";

export class Building extends StaticBody {
    override string_type = "building"
    override number_type = GameObjectType.Building
    def!: BuildingDef

    physical_data:{
        dirty:boolean

        side:Orientation

        hitbox:Hitbox2D
        spawn_hitbox:Hitbox2D
    }&StaticBodyPhysicalData={
        dirty:false,

        side:0,

        hitbox:new NullHitbox2D(v2.new(0,0)),
        spawn_hitbox:new NullHitbox2D(v2.new(0,0)),

        reflect_bullets:false,
        no_collision:true,
        no_bullets_collision:true,
    }


    dead = false

    constructor() {
        super()
        this.updatable = false
    }

    override net_update(): void {
        this.physical_data.dirty=false
    }
    override update(dt: number): void {
    }
    override create(args: Record<string, any>): void {
        this.updatable=false
    }
    override interact(_user: Human): void {}

    set_definition(def: BuildingDef) {
        if (this.def) return
        this.def = def

        if (def.hitbox) {
            this.physical_data.hitbox = def.hitbox.clone()
        }

        if(this.def.spawnHitbox){
            this.physical_data.spawn_hitbox=this.def.spawnHitbox.clone()
        }else{
            this.physical_data.spawn_hitbox=this.physical_data.hitbox
        }

        this.physical_data.no_collision=this.def.no_collisions??false
        this.physical_data.no_bullets_collision=this.def.no_bullet_collision??false
        this.physical_data.reflect_bullets=this.def.reflect_bullets??false

        this.update_hitbox()
    }
    generate(position: Vec2, side: Orientation){        
        this.position = position
        this.physical_data.side = side

        this.base_hitbox=this.physical_data.hitbox.transform(undefined,undefined,undefined,side)
        this.spawn_hitbox=this.physical_data.spawn_hitbox.transform(position,undefined,undefined,side)

        /*for(const f of this.def.floors??[]){
            const hb=f.hitbox.transform(this.position)
            const l=this.layer+(f.layer??0)
            this.game.map.terrain.add_floor(f.type,hb,l)
        }*/
        for (const l of this.def.loots ?? []) {
            const items = this.game.loot_tables.get_loot(l.table, { withammo: true },this.game)
            const p = v2.add_with_orientation(this.position, l.position, side)
            for (const li of items) {
                this.game.add_loot(p, li.item, li.count, this.layer)
            }
        }

        for (const o of this.def.obstacles ?? []) {
            const def=this.game.definitions.obstacles.getFromString(o.id)

            const p = v2.add_with_orientation(this.position, o.position, side)
            v2m.add(p,p,this.position)

            const obj=this.game.map.add_obstacle(def,o.rotation,this.layer+(o.layer??0))
            obj.initialize(o.rotation,o.variation,o.skin)
            obj.set_position(p)
        }
        this.manager.cells.updateObject(this)

        /*

        for (const b of this.def.sub_building ?? []) {
            const def=this.game.definitions.buildings.getFromString(b.id)
            const p = v2.rotate_RadAngle(b.position,Angle.side_rad(this.side))

            v2m.add(p,p,this.position)
            const obj=this.game.map.add_building(def,this.layer+(b.layer??0))
            obj.generate(p,b.rotation??0)
        }*/
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writeBooleanGroup(this.physical_data.dirty)
        if(full||this.physical_data.dirty){
            stream.writePos2(this.position)
            .writeUint8(this.physical_data.side)
        }
        if(full){
            stream.writeID(this.def.idNumber!)
        }
    }
}
