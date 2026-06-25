import { ObstacleBehaviorScalable, ObstacleDef, ObstacleDoorData } from "common/scripts/definitions/objects/obstacles.ts";
import { StaticBody, StaticBodyPhysicalData } from "./static_body.ts";
import { GameObjectType, ObstacleVisualData } from "common/scripts/others/constants.ts";
import { Angle, Hitbox2D, LootTableItemRet, Stream, NullHitbox2D, Numeric, Orientation, random, RotationMode, v2, Vec2, CheckpointContext } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { CalculateDoorHitbox } from "common/scripts/others/functions.ts";
import { DamageParams } from "../others/utils.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { type Loot } from "./loot.ts";
import { SideEffect, SideEffectType } from "common/scripts/definitions/player/effects.ts";
import { type Building } from "./building.ts";
import { type Decal } from "./decals.ts";

export class Obstacle extends StaticBody{
    override string_type:string="obstacle"
    override number_type: number=GameObjectType.Obstacle

    def!:ObstacleDef
    parent?:Building
    connections:Obstacle[]=[]

    max_scale:number=1

    actived:boolean=false
    visual_data:ObstacleVisualData&{dirty:boolean}={
        dirty:true,
        skin:0,
        variation:0
    }
    health_data:{
        dirty:boolean

        dead:boolean
        health:number
        max_health:number
    }={
        dirty:false,

        dead:false,
        health:1,
        max_health:1,
    }

    physical_data:{
        dirty:boolean
        dirty_part:boolean

        scale:number
        side:Orientation
        rotation:number

        stairs:{
            index:number
            hitbox:Hitbox2D
            base_hitbox:Hitbox2D
            dest_layer:number
        }[]
    }&StaticBodyPhysicalData={
        dirty:false,
        dirty_part:false,

        scale:1,
        side:0,
        rotation:0,

        hitbox:new NullHitbox2D(v2.new(0,0)),
        spawn_hitbox:new NullHitbox2D(v2.new(0,0)),

        reflect_bullets:false,
        no_collision:true,
        no_bullets_collision:true,
        passable_by_bullets:false,

        stairs:[]
    }

    loot:LootTableItemRet<GameItem>[]=[]
    door_data?:ObstacleDoorData&{dirty:boolean,only_side?:number}
    transform_into_data?:{
        activated:boolean
        def:number
    }

    constructor(){
        super()

        this.allow_net_update=true
    }

    choose_door_side(playerPos: Vec2): -1 | 1 {
        if(this.door_data!.only_side)return this.door_data!.only_side as -1|1
        const toPlayer = v2.sub(playerPos, this.position)
        const local = v2.rotate_RadAngle(toPlayer, -this.physical_data.rotation)
        return local.y >= 0 ? 1 : -1
    }
    override on_interact(user: Human): void {
        if(this.actived)return
        if(this.def.interactDestroy){
            this.die({
                amount:this.health_data.health,
                position:this.position,
                reason:DamageReason.Human,
                owner:user,
                critical:false,
                direction:0,
            })
        }
        if(this.def.expanded_behavior){
            switch(this.def.expanded_behavior.type){
                case 0:{
                    if(!this.door_data?.opening&&!this.door_data?.locked){
                        if(this.def.expanded_behavior.open_delay){
                            this.door_data!.opening=true

                            if(this.door_data!.open===0){
                                this.door_data!.open=this.choose_door_side(user.position)
                            }else{
                                this.door_data!.open=0
                            }

                            this.game.add_timeout(()=>{
                                this.set_dirty_part()
                                this.door_data!.dirty=true
                                this.base_hitbox=this.door_data!.hitboxes[this.door_data!.open]
                                this.door_data!.opening=false
                            },this.def.expanded_behavior.open_delay)
                        }else{
                            if(this.door_data!.open===0){
                                this.door_data!.open=this.choose_door_side(user.position)
                            }else{
                                this.door_data!.open=0
                            }
                            this.set_dirty_part()
                            this.door_data!.dirty=true
                            this.base_hitbox=this.door_data!.hitboxes[this.door_data!.open]
                        }
                    }
                    break
                }
                case 2:{
                    let interact_side:(typeof this.def.expanded_behavior.interact_side[0])|undefined=undefined
                    let dist:number=Infinity
                    for(const s of this.def.expanded_behavior.interact_side){
                        const d=v2.distance(s.pos,user.position)
                        if(d<=dist){
                            dist=d
                            interact_side=s
                        }
                    }

                    if(interact_side!==undefined){
                        const old_m=user.human_data.movement_enabled
                        const old_c=user.human_data.combat_enabled
                        user.human_data.movement_enabled=false
                        user.human_data.combat_enabled=false

                        const pos=v2.add(this.position,v2.rotate_RadAngle(interact_side.pos,this.physical_data.rotation))
                        const angle=interact_side.rot!==undefined?Angle.deg2rad(interact_side.rot)+this.physical_data.rotation:this.physical_data.rotation
                        const valid=user.pathfind_to(pos,()=>{
                            user.physical_data.rotation=angle
                            this.game.add_timeout(()=>{
                                user.manager.set_layer(this,user.layer+(this.def.expanded_behavior as ObstacleBehaviorScalable).floor_walk)

                                user.human_data.movement_enabled=old_m
                                user.human_data.combat_enabled=old_c

                                if(interact_side.dest_pos)user.position=v2.add(this.position,v2.rotate_RadAngle(interact_side.dest_pos,this.physical_data.rotation))
                                if(interact_side.dest_rot)user.physical_data.rotation=Angle.deg2rad(interact_side.dest_rot)+this.physical_data.rotation
                            },(this.def.expanded_behavior as ObstacleBehaviorScalable).action_time)
                        },0.1)
                        if(!valid){
                            user.human_data.movement_enabled=old_m
                            user.human_data.combat_enabled=old_c
                        }
                        /**/
                    }
                    break
                }
                case 3:{
                    if(!this.transform_into_data?.activated){
                        this.set_dirty_part()
                        const choose=random.weight2(this.def.expanded_behavior.obstacles)!
                        this.transform_into_data={
                            activated:true,
                            def:this.def.expanded_behavior.obstacles.indexOf(choose)
                        }
                        const def=this.game.definitions.obstacles.getFromString(choose.id)
                        this.game.add_timeout(()=>{
                            this.destroy()

                            const obs=this.game.map.add_obstacle(def,this.layer)
                            obs.initialize()
                            obs.set_position(this.position)
                        },this.def.expanded_behavior.delay)
                    }
                    break
                }
            }
        }
    }
    override can_interact(user: Human): boolean {
        return (this.def.interactDestroy||this.def.expanded_behavior)as boolean&&!this.destroyed&&user.hitbox.colliding_with(this.hitbox)&&!this.health_data.dead
    }
    override on_net_update(): void {
        if(this.door_data)this.door_data.dirty=false

        this.physical_data.dirty_part=false
        this.physical_data.dirty=false

        this.health_data.dirty=false
        this.visual_data.dirty=false
    }
    load_loot(){
        if(this.def.lootTable){
            this.loot=this.game.loot_tables.get_loot(this.def.lootTable,{withammo:true},this.game)
        }
    }
    set_definition(def:ObstacleDef){
        if(this.def)return
        this.def=def

        this.physical_data.no_collision=this.def.no_collision??false
        this.physical_data.no_bullets_collision=this.def.no_bullets_collision??false
        this.physical_data.reflect_bullets=this.def.reflect_bullets??false
        this.physical_data.passable_by_bullets=this.def.passable_by_bullets??false

        this.health_data.max_health=this.def.health??1
        this.health_data.health=this.def.health??1

        if(this.def.scale?.min&&this.def.scale.max){
            this.max_scale=random.float(this.def.scale.min,this.def.scale.max)
        }

        let idx=0
        for(const s of this.def.stair_data??[]){
            this.physical_data.stairs.push({
                index:idx,
                dest_layer:0,
                hitbox:s.hitbox,
                base_hitbox:s.hitbox,
            })
            idx++
        }
    }
    override on_create(args?: {def:ObstacleDef}): void {
        if(args)this.set_definition(args.def)
    }
    initialize(rotation?:number,variation?:number,skin?:number,parent_side:Orientation=0){
        this.physical_data.dirty=true
        this.physical_data.dirty_part=true
        this.physical_data.scale=this.max_scale
    
        this.load_loot()
        if(variation){
            this.visual_data.variation=variation
        }else if(this.def.assets?.frame?.variations){
            this.visual_data.variation=Numeric.clamp(random.int(1,this.def.assets.frame.variations+1),1,this.def.assets.frame.variations)
        }

        if(skin){
            this.visual_data.skin=skin
        }else if(this.def.assets?.frame?.biome_skins){
            this.visual_data.skin=this.def.assets.frame.biome_skins.indexOf(this.game.map.def.biome.skin??"")+1
        }
        if(rotation===undefined){
            if(this.def.rotation_mode===RotationMode.limited){
                this.physical_data.side=random.int(0,3) as Orientation
                this.physical_data.rotation=Angle.side_rad(this.physical_data.side)
            }else{
                this.physical_data.rotation=Angle.random_rotation_modded(this.def.rotation_mode??RotationMode.full)
            }
        }else if(this.def.rotation_mode){
            if(this.def.rotation_mode===RotationMode.limited){
                this.physical_data.side=Angle.add_orientation(rotation as Orientation,parent_side)
                this.physical_data.rotation=Angle.side_rad(this.physical_data.side)
            }else{
                this.physical_data.rotation=rotation!
            }
        }

        if(this.def.hitbox)this.physical_data.hitbox=this.def.hitbox.transform(undefined,undefined,undefined,this.physical_data.side)
        if(this.def.spawnHitbox)this.physical_data.spawn_hitbox=this.def.spawnHitbox.transform(undefined,undefined,undefined,this.physical_data.side)
        else this.physical_data.spawn_hitbox=this.physical_data.hitbox

        if(this.def.expanded_behavior){
            switch(this.def.expanded_behavior.type){
                case 0:
                    this.door_data={
                        dirty:true,
                        hitboxes:CalculateDoorHitbox(this.physical_data.hitbox,this.def.expanded_behavior),
                        locked:false,
                        open:0,
                        opening:false
                    }
                    break
                case 1:
                    break
                case 2:
                    break
            }
        }

        for(const s of this.physical_data.stairs){
            s.base_hitbox=s.base_hitbox.transform(undefined,undefined,undefined,this.physical_data.side)
        }
    }

    decal?:Decal
    set_position(position:Vec2){
        this.position=position
        this.reset_scale()
        if(this.decal)this.decal.destroy()
        if(this.def.decal){
            this.decal=this.game.add_decal(this.position,this.physical_data.rotation,this.game.definitions.decals.getFromString(this.def.decal.def),this.def.decal.tint,this.def.decal.scale,this.layer)
        }
    }
    reset_scale(){
        if(this.def.hitbox&&this.def.scale){
            const destroyScale = (this.def.scale.destroy ?? 1)*this.max_scale;
            this.physical_data.scale=Math.max(this.health_data.health/this.health_data.max_health*(this.max_scale - destroyScale) + destroyScale,0)
            this.set_dirty_part()
            this.physical_data.dirty_part=true
        }
        if(this.door_data){
            this.base_hitbox=this.door_data.hitboxes[this.door_data.open].transform(undefined,this.physical_data.scale)
        }else{
            this.base_hitbox=this.physical_data.hitbox.transform(undefined,this.physical_data.scale)
        }
        for(const s of this.physical_data.stairs){
            s.hitbox=s.base_hitbox.transform(this.position,this.physical_data.scale)
        }
    }
    override side_effect(sf:SideEffect,owner?:Human){
        switch(sf.type){
            /*case SideEffectType.AddEffect:{
                const def=Effects.getFromString(sf.effect)
                if(this.effects.has(def.idNumber!)){
                    if(sf.merge){
                        this.effects.get(def.idNumber!)!.time+=sf.duration
                    }else{
                        this.effects.get(def.idNumber!)!.time=sf.duration
                    }
                }else{
                    this.effects.set(def.idNumber!,{
                        effect:def,
                        tick_time:0,
                        time:sf.duration
                    })
                    this.effects_dirty=true
                }
                break
            }*/
            case SideEffectType.Damage:
                this.damage({
                    amount:sf.amount*(sf.obstacle_mult??1),
                    critical:false,
                    position:this.position,
                    reason:DamageReason.SideEffect,
                    direction:0,
                    owner:owner
                })
                break
        }
    }
    override damage(params:DamageParams){
        if(this.health_data.dead||this.def.imortal||(this.def.resistence??0)>(params.resistence??0))return

        this.health_data.health=Math.max(this.health_data.health-params.amount,0)
        if(this.health_data.health===0){
            this.die(params)
        }else{
            this.reset_scale()
        }

        this.set_dirty_part()
        this.health_data.dirty=true
    }
    die(params:DamageParams){
        if(this.health_data.dead)return
        this.health_data.health===0
        this.reset_scale()
        if(this.def.onDestroyExplosion){
            const ex=this.game.definitions.explosions.getFromString(this.def.onDestroyExplosion)
            this.game.add_explosion(this.hitbox.center(),ex,params.owner,this.def,this.layer)
        }
        const loots:Loot[]=[]
        for(const l of this.loot){
            loots.push(this.game.add_loot(this.hitbox.random_point(),l.item,l.count,this.layer))
        }

        this.set_dirty_part()
        this.health_data.dead=true
        this.health_data.dirty=true
        this.physical_data.no_collision=true
        this.physical_data.no_bullets_collision=true

        for(let i=0;i<10;i++){
            for(const loot of loots){
                loot.tick(1/30)
            }
        }

        if(params.owner)params.owner.inventory.accessorys.call_event("obstacle_destroy",{obstacle:this,human:params.owner})
        for(const c of this.connections){
            if(c.def.imortal)continue
            c.die({
                amount:9999,
                critical:false,
                direction:0,
                position:this.position,
                reason:DamageReason.Connection,
                owner:params.owner,
                resistence:10,
                source:params.source
            })
        }

        if(this.parent)this.parent.verify_childrens()
    }
    revive(){
        if(!this.health_data.dead)return
        this.health_data.dead=false
        this.set_dirty_part()

        this.physical_data.no_collision=this.def.no_collision??false
        this.physical_data.no_bullets_collision=this.def.no_bullets_collision??false

        this.health_data.health=this.health_data.max_health

        this.reset_scale()
    }
    reset(){
        if(this.health_data.dead){
            this.revive()
        }else{
            this.set_dirty_full()
            this.health_data.health=this.health_data.max_health
            this.reset_scale()
        }
    }
    override on_encode_net(stream: Stream, full: boolean): void {
        const door_dirty=this.door_data&&(full||this.door_data.dirty)

        stream.write_boolean_group(
            this.visual_data.dirty,
            this.physical_data.dirty,this.physical_data.dirty_part,
            this.health_data.dirty,
            this.health_data.dead,

            door_dirty,
            this.transform_into_data?.activated
        )
        if(full||this.visual_data.dirty){
            stream.write_uint8(this.visual_data.variation)
            stream.write_uint8(this.visual_data.skin)
        }
        if(full){
            stream.write_uint16(this.def.idNumber!)
        }
        if(full||this.physical_data.dirty||this.physical_data.dirty_part){
            stream.write_float(this.physical_data.scale,0,10,2)
            if(this.physical_data.dirty||full){
                stream.write_pos2(this.position)
                .write_rad(this.physical_data.rotation)
                .write_uint8(this.physical_data.side)
            }
        }
        if(full||this.health_data.dirty){
            stream.write_float(this.health_data.health/this.health_data.max_health,0,1,1)
        }

        if(door_dirty){
            stream.write_int8(this.door_data!.open)
        }
        if(this.transform_into_data?.activated){
            stream.write_uint8(this.transform_into_data.def)
        }
    }
    override on_encode_checkpoint(stream: Stream,ctx:CheckpointContext): void {
        stream.write_uint16(this.def.idNumber!)
        .write_pos2(this.position)
        .write_rad(this.physical_data.rotation)
        .write_uint8(this.physical_data.side)
        .write_float32(this.max_scale)
        .write_float32(this.health_data.health)
        .write_float32(this.health_data.max_health)
        .write_boolean_group(this.health_data.dead,this.actived)
        .write_uint8(this.visual_data.variation)
        .write_uint8(this.visual_data.skin)
        .write_array(this.connections,(i)=>{
            stream.write_id(ctx.idco[i.id])
        },1)
        .write_array(this.physical_data.stairs,(i)=>{
            stream.write_uint8(i.index)
            stream.write_int8(i.dest_layer)
        })
        stream.write_boolean_group(this.door_data!==undefined,this.transform_into_data!==undefined)
        if(this.door_data){
            stream.write_boolean_group(this.door_data.open===1,this.door_data.open===0,this.door_data.locked,this.door_data.only_side!==undefined)
            if(this.door_data.only_side!==undefined)stream.write_int8(this.door_data.only_side)
        }
        if(this.transform_into_data){
            stream.write_uint8(this.transform_into_data.def)
        }
    }
    override on_decode_checkpoint(stream: Stream,ctx:CheckpointContext): void {
        const def = this.game.definitions.obstacles.valueNumber[stream.read_uint16()]
        this.set_definition(def)
        const position = stream.read_pos2()
        const rotation = stream.read_rad()
        const side = stream.read_uint8() as Orientation
        this.max_scale = stream.read_float32()
        this.initialize(side)
        this.position = position
        this.physical_data.rotation = rotation
        this.physical_data.side = side
        this.health_data.health = stream.read_float32()
        this.health_data.max_health = stream.read_float32()
        const [dead, actived] = stream.read_boolean_group()
        this.actived = actived
        this.visual_data.variation=stream.read_uint8()
        this.visual_data.skin=stream.read_uint8()
        const connections=stream.read_array(()=>{
            return stream.read_id()
        },1)
        for(const c of connections){
            this.connections.push(this.manager.objects[ctx.coid[c]])
        }
        stream.read_array(()=>{
            const idx=stream.read_uint8()
            this.physical_data.stairs[idx].dest_layer=stream.read_int8()
        })
        const [door_data,transform_into_data]=stream.read_boolean_group()

        if(door_data){
            const [open_negative,open_positive,locked,only_side]=stream.read_boolean_group()
            this.door_data!.open = open_positive?1:open_negative?-1:0
            this.door_data!.locked = locked
            if(only_side)this.door_data!.only_side=stream.read_int8()
            this.base_hitbox = this.door_data!.hitboxes[this.door_data!.open]
        }
        if(transform_into_data){
            this.transform_into_data = {
                activated: true,
                def: stream.read_uint8()
            }
        }
        this.reset_scale()
        this.update_hitbox()
        if (dead) {
            this.health_data.dead = true
            this.physical_data.no_collision = true
            this.physical_data.no_bullets_collision = true
        }
    }
}