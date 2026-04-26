import { BuildingCeilingDef, BuildingDef, BuildingObstacles } from "common/scripts/definitions/objects/buildings_base.ts";
import { type Human } from "./human.ts";
import { Angle, Hitbox2D, NetStream, NullHitbox2D, Orientation, random, RotationMode, v2, Vec2 } from "common/engine/core.ts";
import { StaticBody, StaticBodyPhysicalData } from "./static_body.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Obstacle } from "./obstacle.ts";
export type BuildingObstacleChild={type:0,obj:Obstacle,def:BuildingObstacles}
export type BuildingCeilingChild={type:1,def:BuildingCeilingDef,alive:boolean,connections:Obstacle[]}
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
    children:(BuildingObstacleChild|BuildingCeilingChild)[]=[]
    objects_ids:Record<number,Obstacle>={}

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
    generate(position: Vec2){
        this.position = position
        this.spawn_hitbox=this.physical_data.spawn_hitbox.transform(position,undefined,undefined,this.physical_data.side)

        /*for(const f of this.def.floors??[]){
            const hb=f.hitbox.transform(this.position)
            const l=this.layer+(f.layer??0)
            this.game.map.terrain.add_floor(f.type,hb,l)
        }*/
        for (const l of this.def.content.loots ?? []) {
            const items = this.game.loot_tables.get_loot(l.table, { withammo: true },this.game)
            const p = v2.add_with_orientation(this.position, l.position, this.physical_data.side)
            for (const li of items) {
                this.game.add_loot(p, li.item, li.count, this.layer)
            }
        }

        for (const o of this.def.content.obstacles ?? []) {
            const def=this.game.definitions.obstacles.getFromString(typeof o.def==="string"?o.def:random.weight2(o.def)!.def)

            const p = v2.add_with_orientation(this.position, o.position, this.physical_data.side)

            const obj=this.game.map.add_obstacle(def,this.layer+(o.layer??0))
            obj.parent=this
            if(o.id)this.objects_ids[o.id]=obj
            const rot=def.rotation_mode===RotationMode.full?(o.rotation??0)+Angle.side_rad(this.physical_data.side):(o.rotation??0)+this.physical_data.side
            obj.initialize(rot,o.variation,o.skin)
            obj.set_position(p)

            if(o.stairs_dest){
                for(const s in o.stairs_dest){
                    obj.physical_data.stairs[s].dest_layer=o.stairs_dest[s]
                }
            }

            this.children.push({obj,def:o,type:0})
        }
        for(const child of this.children){
            if(child.type!==0)continue
            for(const conn of child.def.connections??[]){
                child.obj.connections.push(this.objects_ids[conn])
            }
        }
        for (const b of this.def.content.sub_building ?? []) {
            const def=this.game.definitions.buildings.getFromString(typeof b.def==="string"?b.def:random.weight2(b.def)!.def)

            const p = v2.add_with_orientation(this.position, b.position, this.physical_data.side)

            const obj=this.game.map.add_building(def,this.layer+(b.layer??0))
            obj.init(Angle.add_orientation(this.physical_data.side,b.rotation??0))
            obj.generate(p)
        }
       for(const c of this.def.content.ceiling??[]){
            const conns:Obstacle[]=[]
            for(const conn of c.connections??[]){
                conns.push(this.objects_ids[conn])
            }
            this.children.push({
                type:1,
                def:c,
                alive:true,
                connections:conns,
            })
        }
    }

    verify_childrens(){
        for(const child of this.children){
            if(child.type===1){
                if(child.alive&&child.def.destroy){
                    let alive_count:number=0
                    for(const c of child.connections){
                        if(!c.health_data.dead)alive_count++
                    }
                    if(alive_count<=child.def.destroy.count){
                        child.alive=false
                        this.net_sync.part=true
                    }
                }
            }
        }
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
        stream.writeArray(this.children.filter((o)=>o.type===1),(v)=>{
            stream.writeBooleanGroup(v.alive)
        },1)
    }
}
