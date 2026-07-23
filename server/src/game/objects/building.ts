import { BuildingCeilingDef, BuildingDef, BuildingObstacles } from "common/scripts/definitions/objects/buildings_base.ts";
import { Angle, Hitbox2D, Stream, NullHitbox2D, Orientation, random, RotationMode, v2, Vec2, CheckpointContext } from "common/engine/core.ts";
import { StaticBody, StaticBodyPhysicalData } from "./static_body.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Obstacle } from "./obstacle.ts";
export type BuildingObstacleChild={type:0,obj:Obstacle,def:BuildingObstacles}
export class BuildingCeiling{
    def:BuildingCeilingDef
    hitbox:Hitbox2D
    alive:boolean
    connections:Obstacle[]
    no_scope_block:boolean
    constructor(def:BuildingCeilingDef,hitbox:Hitbox2D,connections:Obstacle[]){
        this.def=def
        this.hitbox=hitbox
        this.alive=true
        this.connections=connections
        this.no_scope_block=!!def.no_scope_block
    }
    can_below(hb:Hitbox2D){
        return this.alive&&hb.colliding_with(this.hitbox)
    }
}
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
        passable_by_bullets:false,
        stairs:[]
    }
    children:BuildingObstacleChild[]=[]
    objects_ids:Record<number,Obstacle>={}
    ceilings:BuildingCeiling[]=[]

    constructor() {
        super()

        this.allow_net_update=true
    }

    override on_net_update(): void {
        this.physical_data.dirty=false
    }

    set_definition(def: BuildingDef) {
        if (this.def) return
        this.def = def

        if (def.hitbox){
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
    init(side:Orientation=random.int(0,3) as Orientation){
        this.physical_data.side = side
        this.base_hitbox=this.physical_data.hitbox.transform(undefined,undefined,undefined,side)

        if(this.def.spawnHitbox){
            this.physical_data.spawn_hitbox=this.def.spawnHitbox.transform(undefined,undefined,undefined,side)
        }else{
            this.physical_data.spawn_hitbox=this.physical_data.hitbox
        }
    }
    begin_generate(position:Vec2){
        this.position = position
        this.spawn_hitbox=this.physical_data.spawn_hitbox.transform(position,undefined,undefined,undefined)
    }
    after_generate(){
        for(const c of this.def.content.ceiling??[]){
            const conns:Obstacle[]=[]
            for(const conn of c.connections??[]){
                if(this.objects_ids[conn])conns.push(this.objects_ids[conn])
            }
            this.ceilings.push(new BuildingCeiling(c,c.hitbox.transform(this.position,undefined,undefined,this.physical_data.side),conns))
        }

        let idx=0
        for(const s of this.def.content.stair_data??[]){
            const base_hb=s.hitbox.transform(undefined,undefined,undefined,this.physical_data.side)
            this.physical_data.stairs.push({
                index:idx,
                dest_layer:s.dest,
                hitbox:base_hb.transform(this.position),
                base_hitbox:base_hb,
            })
            idx++
        }
        this.manager.cells.update_object(this)
    }
    generate(position: Vec2){
        this.begin_generate(position)

        /*for(const f of this.def.floors??[]){
            const hb=f.hitbox.transform(this.position)
            const l=this.layer+(f.layer??0)
            this.game.map.terrain.add_floor(f.type,hb,l)
        }*/
        for (const l of this.def.content.loots ?? []) {
            const items = this.game.get_loot_table(l.table)
            const p = v2.add_with_orientation(this.position, l.position, this.physical_data.side)
            for (const li of items) {
                this.game.add_loot(p, {item:li.item, count:li.count}, this.layer)
            }
        }
        for (const d of this.def.content.decals ?? []) {
            const def=this.game.definitions.decals.getFromString(d.def)
            const side=this.physical_data.side
            const p = v2.add_with_orientation(this.position, d.position, side)
            const rotation=(d.rotation??0)+Angle.side_rad(this.physical_data.side)
            this.game.add_decal(p,rotation,def,d.tint,d.scale,d.layer)
        }
        for(const o of this.def.content.obstacles ?? []) {
            const def_name=typeof o.def==="string"?o.def:random.weight2(o.def)!.def
            if(!def_name||def_name==="")continue
            const def=this.game.definitions.obstacles.getFromString(def_name)
            const side=this.physical_data.side
            let rotation=o.rotation??0
            switch(def.rotation_mode){
                case RotationMode.full:
                    rotation+=Angle.side_rad(this.physical_data.side)
                    break
                case RotationMode.limited:
                    rotation=Angle.add_orientation(rotation as Orientation,side)
                    break
            }
            const p = v2.add_with_orientation(this.position, o.position, side)
            const obj=this.game.map.add_obstacle(def,this.layer+(o.layer??0))
            obj.parent=this
            if(o.id)this.objects_ids[o.id]=obj
            obj.initialize(rotation,o.variation,o.skin)
            obj.set_position(p,o.allow_biome_skin)
            if(o.stairs_dest){
                for(const s in o.stairs_dest){
                    obj.physical_data.stairs[s].dest_layer=o.stairs_dest[s]
                }
            }

            if(obj.door_data&&o.only_side){
                obj.door_data.only_side=o.only_side
            }
            if(obj.def.expanded_behavior?.type===4&&o.press_data&&obj.press_data){
                if(o.press_data.activated!==undefined)obj.press_data.activated=o.press_data.activated
                if(o.press_data.locked!==undefined)obj.press_data.activated=o.press_data.locked
                if(o.press_data.allow_switch!==undefined)obj.press_data.allow_switch=o.press_data.allow_switch
            }
            this.children.push({obj,def:o,type:0})
        }
        for (const b of this.def.content.sub_building ?? []) {
            const def=this.game.definitions.buildings.getFromString(typeof b.def==="string"?b.def:random.weight2(b.def)!.def)
            const side=this.physical_data.side
            const p = v2.add_with_orientation(this.position, b.position, side)

            const obj=this.game.map.add_building(def,this.layer+(b.layer??0))
            obj.init(Angle.add_orientation(side,b.rotation??0))
            obj.generate(p)
        }
        for(const child of this.children){
            if(child.type!==0)continue
            for(const conn of child.def.connections??[]){
                const connection=this.objects_ids[conn]
                if(conn)child.obj.connections.push(connection)
            }
        }
        this.after_generate()
    }

    verify_childrens(){
        for(const child of this.ceilings){
            if(child.alive&&child.def.destroy){
                let alive_count:number=0
                for(const c of child.connections){
                    if(!c.health_data.dead)alive_count++
                }
                if(alive_count<=child.def.destroy.count){
                    child.alive=false
                    this.set_dirty_part()
                }
            }
        }
    }
    override on_encode_net(stream: Stream, full: boolean): void {
        stream.write_boolean_group(this.physical_data.dirty)
        if(full||this.physical_data.dirty){
            stream.write_pos2(this.position)
            .write_uint8(this.physical_data.side)
        }
        if(full){
            stream.write_id(this.def.idNumber!)
        }
        stream.write_array(this.ceilings,(v)=>{
            stream.write_boolean_group(v.alive)
        },1)
    }
    override on_encode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        stream.write_uint16(this.def.idNumber!)
        stream.write_pos2(this.position)
        stream.write_uint8(this.physical_data.side)
        stream.write_number_dict(this.objects_ids,(i)=>{
            stream.write_id(ctx.idco[i.id])
        },1)
        stream.write_array(this.ceilings,(c)=>{
            stream.write_boolean_group(c.alive)
        },1)
    }
    override on_decode_checkpoint(stream: Stream, ctx: CheckpointContext): void {
        const def = this.game.definitions.buildings.valueNumber[stream.read_uint16()]
        const pos = stream.read_pos2()
        const side = stream.read_uint8() as Orientation

        this.objects_ids=stream.read_number_dict(()=>{
            const obj=this.manager.objects[ctx.coid[stream.read_id()]] as Obstacle
            obj.parent=this
            return obj
        },1)

        this.set_definition(def)
        this.init(side)

        this.begin_generate(pos)
        this.after_generate()

        stream.read_array((i)=>{
            const [alive] = stream.read_boolean_group()
            this.ceilings[i].alive = alive
        },1)

        this.update_hitbox()
    }
}
