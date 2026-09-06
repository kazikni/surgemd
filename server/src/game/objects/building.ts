import { BuildingCeilingDef, BuildingDef, BuildingObstacles, BuildingPuzzleDef, PuzzleAction, PuzzleCondition } from "common/scripts/definitions/objects/buildings_base.ts";
import { Angle, Hitbox2D, Stream, NullHitbox2D, Orientation, random, RotationMode, v2, Vec2, CheckpointContext, cloneDeep } from "common/engine/core.ts";
import { StaticBody, StaticBodyPhysicalData } from "./static_body.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Obstacle } from "./obstacle.ts";
import { ScopeChange } from "common/scripts/definitions/utils.ts";
export type BuildingObstacleChild={type:0,obj:Obstacle,def:BuildingObstacles}
export class BuildingCeiling{
    def:BuildingCeilingDef
    hitbox:Hitbox2D
    alive:boolean
    connections:Obstacle[]
    scope_change?:ScopeChange
    constructor(def:BuildingCeilingDef,hitbox:Hitbox2D,connections:Obstacle[]){
        this.def=def
        this.hitbox=hitbox
        this.alive=true
        this.connections=connections
        this.scope_change=def.scope_change
    }
    can_below(hb:Hitbox2D){
        return this.alive&&hb.colliding_with(this.hitbox)
    }
}
export class BuildingPuzzle{
    def:BuildingPuzzleDef
    parent:Building
    id:string
    global:boolean

    code_value?:string
    code_size?:number
    current_code:string=""

    complete_activated:boolean=false
    complete_conditions?:PuzzleCondition[]
    complete_actions?:PuzzleAction[]

    fail_activated:boolean=false
    fail_conditions?:PuzzleCondition[]
    fail_actions?:PuzzleAction[]

    check_actions?:PuzzleAction[]

    current_actions:{actions:PuzzleAction[],tp:number}[]=[]

    connections:Obstacle[]=[]

    constructor(parent:Building,def:BuildingPuzzleDef){
        this.def=def
        this.parent=parent
        this.id=def.idString??"main"
        this.global=def.global??false
        if(def.code){
            this.code_size=def.code.size
            this.code_value=def.code.value
        }

        this.complete_conditions=def.complete_conditions
        this.complete_actions=def.complete_actions

        this.fail_conditions=def.fail_conditions
        this.fail_actions=def.fail_actions

        this.check_actions=def.check_actions
    }
    get_object(id:number):Obstacle{
        return this.parent.objects_ids[id]
    }
    add_object(obj:Obstacle,puzzle_value?:string){
        obj.puzzle=this
        obj.puzzle_value=puzzle_value
        obj.puzzle.connections.push(obj)
    }
    input_piece(value:Obstacle) {
        if(value.puzzle_value&&this.code_size){
            if(value.press_data?.activated||value.door_data){
                this.current_code+=value.puzzle_value??""
                if(this.code_size!==undefined&&this.current_code.length>=this.code_size){
                    this.check()
                    this.current_code=""
                }
            }
        }else{
            this.check()
        }
    }
    check() {
        if(!this.complete_activated&&this.complete_conditions&&this.check_conditions(this.complete_conditions)){
            this.complete_activated=true
            if(this.complete_actions)this.start_actions(this.complete_actions,1)
        }
        if(!this.fail_activated&&this.fail_conditions&&this.check_conditions(this.fail_conditions)){
            this.fail_activated=true
            if(this.fail_actions)this.start_actions(this.fail_actions,2)
        }
        if(this.check_actions)this.start_actions(this.check_actions)
    }
    check_conditions(conditions: PuzzleCondition[]): boolean {
        for (const c of conditions) {
            let ok = false
            switch (c.type){
                case "code":{
                    if(c.dont_need_orden){
                        let code=""
                        for(const o of this.connections){
                            if(o.press_data?.activated&&o.puzzle_value){
                                code+=o.puzzle_value
                            }
                        }
                        ok=code===(c.value??this.code_value??"")
                        if(c.negate)ok=!ok
                    }else{
                        ok=this.current_code===(c.value??this.code_value??"")
                    }
                    break
                }
                case "press":{
                    const ids=typeof c.id==="number"?[c.id]:(c.id??[])
                    ok=true
                    for(const id of ids){
                        const obj=this.get_object(id)
                        if (!obj.press_data?.activated) {
                            ok=false
                            break
                        }
                    }
                    break
                }
                case "break":{
                    const ids=typeof c.id === "number"?[c.id]:(c.id??[])
                    ok=true
                    for(const id of ids) {
                        const obj=this.get_object(id)
                        if(!obj.health_data.dead){
                            ok = false
                            break
                        }
                    }

                    break
                }
            }
            if(c.negate)ok=!ok
            if(!ok)return false
        }
        return true
    }
    start_actions(actions:PuzzleAction[],tp:number=0){
        this.current_actions.push({actions:cloneDeep(actions),tp})
    }
    tick(dt:number){
        for(let i=0;i<this.current_actions.length;i++){
            const a=this.current_actions[i].actions[0]
            if(!a)continue
            switch(a.type){
                case "door":{
                    this.current_actions[i].actions.shift()
                    const objects:(Obstacle|undefined)[]=[]
                    if(typeof a.id==="number"){
                        objects.push(this.get_object(a.id))
                    }else{
                        for(const id of a.id){
                            objects.push(this.get_object(id))
                        }
                    }
                    for(const o of objects){
                        if(!(o&&o.door_data))continue
                        o.door_data.dirty=true
                        o.set_dirty_part()
                        if(a.open_state!==undefined)o.door_open(a.open_state)
                        if(a.locked!==undefined)o.door_data.locked=a.locked
                        if(a.only_side!==undefined)o.door_data.only_side=a.only_side
                    }
                    break
                }
                case "press":{
                    this.current_actions[i].actions.shift()
                    const objects:(Obstacle|undefined)[]=[]
                    if(typeof a.id==="number"){
                        objects.push(this.get_object(a.id))
                    }else{
                        for(const id of a.id){
                            objects.push(this.get_object(id))
                        }
                    }
                    for(const o of objects){
                        if(!(o&&o.press_data))continue
                        o.press_data.dirty=true
                        o.set_dirty_part()
                        if(a.activated!==undefined)o.press_data.activated=a.activated
                        if(a.locked!==undefined)o.press_data.locked=a.locked
                        if(a.can_switch!==undefined)o.press_data.allow_switch=a.can_switch
                    }
                    break
                }
                case "wait":{
                    a.time-=dt
                    if(a.time<=0){
                        this.current_actions[i].actions.shift()
                    }
                    break
                }
                case "puzzle":{
                    this.current_actions[i].actions.shift()
                    const puzzle=a.id===undefined?this:this.parent.puzzles[a.id]
                    if(a.lock!==undefined){
                        if(a.lock){
                            puzzle.complete_activated=true
                            puzzle.fail_activated=true
                        }else{
                            puzzle.complete_activated=false
                            puzzle.fail_activated=false
                        }
                    }
                    break
                }
                case "check_fail":
                    this.current_actions[i].actions.shift()
                    break
            }
            if(this.current_actions[i].actions.length===0){
                this.current_actions[i].actions.splice(i,1)
                i--
            }
        }
    }

    encode(stream: Stream, ctx: CheckpointContext) {
        stream.write_string(this.current_code)
        .write_boolean_group(this.complete_activated,this.fail_activated)
        .write_array(this.connections, o=>{
            stream.write_id(ctx.idco[o.id])
            stream.write_string(o.puzzle_value??"",1)
        }, 1)
        .write_array(this.current_actions, a=>{
            stream.write_uint8(a.tp)
            .write_any(a.actions)
        }, 1)
    }
    decode(stream: Stream, ctx: CheckpointContext) {
        this.current_code = stream.read_string()
        const [complete, fail] = stream.read_boolean_group()
        this.complete_activated = complete
        this.fail_activated = fail
        this.connections.length = 0
        stream.read_array(() => {
            const obj = this.parent.manager.objects[ctx.coid[stream.read_id()]] as Obstacle
            this.add_object(obj,stream.read_string(1))
        }, 1)
        this.current_actions = stream.read_array(() => ({
            tp: stream.read_uint8(),
            actions: stream.read_any() as PuzzleAction[]
        }), 1);
    }
}
export class Building extends StaticBody {
    override string_type = "building"
    override number_type = GameObjectType.Building
    def!: BuildingDef

    puzzles:Record<string,BuildingPuzzle>={}

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
        interaction_hitbox:new NullHitbox2D(v2.new(0,0)),

        reflect_bullets:false,
        no_collision:true,
        no_pathfinding_collision:false,
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

    override update_hitbox(): void {
        super.update_hitbox()
        this.interaction_hitbox=this.physical_data.interaction_hitbox.transform(this.position)
    }
    override tick(dt:number):void{
        for(const p in this.puzzles){
            this.puzzles[p].tick(dt)
        }
    }
    override on_net_update(): void {
        this.physical_data.dirty=false
    }

    set_definition(def: BuildingDef) {
        if(this.def) return
        this.def=def

        if(def.hitbox)this.physical_data.hitbox=def.hitbox.clone()

        if(this.def.spawnHitbox){
            this.physical_data.spawn_hitbox=this.def.spawnHitbox.clone()
        }else{
            this.physical_data.spawn_hitbox=this.physical_data.hitbox
        }

        this.allow_tick=this.def.generate.puzzles!==undefined
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
        this.physical_data.interaction_hitbox=this.physical_data.hitbox.transform(undefined,1.1)
        this.update_hitbox()
    }
    begin_generate(position:Vec2){
        this.position = position
        this.spawn_hitbox=this.physical_data.spawn_hitbox.transform(position)
        for(const p of this.def.generate.puzzles??[]){
            const puzzle=new BuildingPuzzle(this,p)
            this.puzzles[puzzle.id]=puzzle
            if(p.global)this.scene.puzzles[puzzle.id]=puzzle
        }
    }
    after_generate(){
        for(const c of this.def.ceiling??[]){
            const conns:Obstacle[]=[]
            for(const conn of c.connections??[]){
                if(this.objects_ids[conn])conns.push(this.objects_ids[conn])
            }
            this.ceilings.push(new BuildingCeiling(c,c.hitbox.transform(this.position,undefined,undefined,this.physical_data.side),conns))
        }

        let idx=0
        for(const s of this.def.generate.stair_data??[]){
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
        for (const l of this.def.generate.loots ?? []) {
            const items = this.game.get_loot_table(l.table)
            const p = v2.add_with_orientation(this.position, l.position, this.physical_data.side)
            for (const li of items) {
                this.scene.add_loot(p, {item:li.item, count:li.count}, this.layer)
            }
        }
        for (const d of this.def.generate.decals ?? []) {
            const def=this.game.definitions.decals.getFromString(d.def)
            const side=this.physical_data.side
            const p = v2.add_with_orientation(this.position, d.position, side)
            const rotation=(d.rotation??0)+Angle.side_rad(this.physical_data.side)
            this.scene.add_decal(p,rotation,def,d.tint,d.scale,d.layer)
        }
        for(const o of this.def.generate.obstacles ?? []) {
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

            if(obj.def.expanded_behavior?.type===4&&o.press_data&&obj.press_data){
                if(o.press_data.activated!==undefined)obj.press_data.activated=o.press_data.activated
                if(o.press_data.locked!==undefined)obj.press_data.activated=o.press_data.locked
                if(o.press_data.allow_switch!==undefined)obj.press_data.allow_switch=o.press_data.allow_switch
            }
            if(obj.door_data&&o.door_data){
                if(o.door_data.open_state!==undefined)obj.door_open(o.door_data.open_state)
                if(o.door_data.locked!==undefined)obj.door_data.locked=o.door_data.locked
                if(o.door_data.only_side!==undefined)obj.door_data.only_side=o.door_data.only_side
            }

            if(o.puzzle_piece){
                this.puzzles[o.puzzle_piece.id??"main"].add_object(obj,o.puzzle_piece.value)
            }

            this.children.push({obj,def:o,type:0})
        }
        for (const b of this.def.generate.sub_building ?? []) {
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
        stream.write_array(Object.keys(this.puzzles), p => {
            stream.write_string(p,1)
            this.puzzles[p].encode(stream,ctx)
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
        stream.read_array(() => {
            const puzzle = this.puzzles[stream.read_string(1)]
            puzzle.decode(stream,ctx)
        },1)

        this.update_hitbox()
    }
}
