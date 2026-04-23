import { ObstacleBehaviorScalable, ObstacleDef, ObstacleDoorData } from "common/scripts/definitions/objects/obstacles.ts";
import { StaticBody, StaticBodyPhysicalData } from "./static_body.ts";
import { GameObjectType, ObstacleVisualData } from "common/scripts/others/constants.ts";
import { Angle, LootTableItemRet, NetStream, NullHitbox2D, Numeric, Orientation, random, RotationMode, v2, v2m, Vec2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { CalculateDoorHitbox } from "common/scripts/others/functions.ts";
import { DamageParams } from "../others/utils.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { type Loot } from "./loot.ts";
import { SideEffect, SideEffectType } from "common/scripts/definitions/player/effects.ts";

export class Obstacle extends StaticBody{
    override string_type:string="obstacle"
    override number_type: number=GameObjectType.Obstacle

    def!:ObstacleDef

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
    }

    loot:LootTableItemRet<GameItem>[]=[]
    door_data?:ObstacleDoorData&{dirty:boolean}
    transform_into_data?:{
        activated:boolean
        def:number
    }

    constructor(){
        super()
    }

    override update(_dt:number): void {
        
    }

    choose_door_side(playerPos: Vec2):-1|0|1 {
        const forward = v2.from_RadAngle(this.physical_data.rotation)
        const toPlayer = v2.sub(playerPos, this.position)
        v2m.normalizeSafe(toPlayer)
        const dot = v2.dot(forward, toPlayer)
        return dot >= 0 ? -1 : 1
    }
    override interact(user: Human): void {
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
                                this.net_sync.part=true
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
                            this.net_sync.part=true
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
                                user.set_layer(user.layer+(this.def.expanded_behavior as ObstacleBehaviorScalable).floor_walk)

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
                        this.net_sync.part=true
                        const choose=random.weight2(this.def.expanded_behavior.obstacles)!
                        this.transform_into_data={
                            activated:true,
                            def:this.def.expanded_behavior.obstacles.indexOf(choose)
                        }
                        const def=this.game.definitions.obstacles.getFromString(choose.id)
                        this.game.add_timeout(()=>{
                            this.destroy()

                            const obs=this.game.map.add_obstacle(def)
                            obs.initialize()
                            obs.set_position(this.position)
                        },this.def.expanded_behavior.delay)
                    }
                    break
                }
            }
        }
        /*if(this.door!==undefined){
            this.door!.open=this.door!.open===0?1:0
            const dd=this.def.expanded_behavior!
            if(dd.open_delay!==undefined&&dd.open_delay>0){
                this.actived=true
                this.game.addTimeout(()=>{
                    this.actived=false
                    this.door_change_hb()
                },dd.open_delay!)
            }else{
                this.door_change_hb()
            }
            this.dirtyPart=true
        }*/
    }
    override can_interact(user: Human): boolean {
        return (this.def.interactDestroy||this.def.expanded_behavior) as boolean&&!this.destroyed&&user.hitbox.collidingWith(this.hitbox)
    }
    override net_update(): void {
        if(this.door_data)this.door_data.dirty=false

        this.physical_data.dirty_part=false
        this.physical_data.dirty=false

        this.health_data.dirty=false
        this.visual_data.dirty=false
    }
    set_definition(def:ObstacleDef){
        if(this.def)return
        this.def=def

        this.physical_data.no_collision=this.def.no_collision??false
        this.physical_data.no_bullets_collision=this.def.no_bullets_collision??false
        this.physical_data.reflect_bullets=this.def.reflect_bullets??false

        this.health_data.max_health=this.def.health
        this.health_data.health=this.def.health

        if(this.def.scale?.min&&this.def.scale.max){
            this.max_scale=random.float(this.def.scale.min,this.def.scale.max)
        }
    }
    load_loot(){
        if(this.def.lootTable){
            this.loot=this.game.loot_tables.get_loot(this.def.lootTable,{withammo:true},this.game)
        }
    }
    override create(args: {def:ObstacleDef}): void {
        this.updatable=false

        this.set_definition(args.def)
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
            this.visual_data.skin=this.def.assets.frame.biome_skins.indexOf(this.game.map.def.biome.biome_skin??"")+1
        }
        if(rotation===undefined){
            if(this.def.rotationMode===RotationMode.limited){
                this.physical_data.side=random.int(0,3) as Orientation
                this.physical_data.rotation=Angle.side_rad(this.physical_data.side)
            }else{
                this.physical_data.rotation=Angle.random_rotation_modded(this.def.rotationMode??RotationMode.full)
            }
        }else if(this.def.rotationMode){
            if(this.def.rotationMode===RotationMode.limited){
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
    }

    set_position(position:Vec2){
        this.reset_scale()

        this.base_hitbox=this.physical_data.hitbox.transform(undefined,this.physical_data.scale)
        this.spawn_hitbox=this.physical_data.spawn_hitbox.transform(position,this.physical_data.scale)
        this.position=position
    }
    reset_scale(){
        if(this.def.hitbox&&this.def.scale){
            const destroyScale = (this.def.scale.destroy ?? 1)*this.max_scale;
            this.physical_data.scale=Math.max(this.health_data.health / this.def.health*(this.max_scale - destroyScale) + destroyScale,0)

            if(this.door_data){
                this.base_hitbox=this.door_data.hitboxes[this.door_data.open].transform(undefined,this.physical_data.scale)
            }else{
                this.base_hitbox=this.physical_data.hitbox.transform(undefined,this.physical_data.scale)
            }

            this.net_sync.part=true
            this.physical_data.dirty_part=true
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

        this.net_sync.part=true
        this.health_data.dirty=true
    }
    die(params:DamageParams){
        if(this.health_data.dead)return
        this.health_data.health===0
        this.reset_scale()
        if(this.def.onDestroyExplosion){
            const ex=this.game.definitions.explosions.getFromString(this.def.onDestroyExplosion)
            this.game.add_explosion(this.hitbox.center(),ex,params.owner,this.def)
        }
        const loots:Loot[]=[]
        for(const l of this.loot){
            loots.push(this.game.add_loot(this.hitbox.randomPoint(),l.item,l.count,this.layer))
        }

        this.net_sync.part=true
        this.health_data.dead=true
        this.health_data.dirty=true
        this.physical_data.no_collision=true
        this.physical_data.no_bullets_collision=true

        for(let i=0;i<10;i++){
            for(const loot of loots){
                loot.update(1/30)
            }
        }
        for(const loot of loots){
            loot.is_new=true
        }

        if(params.owner)params.owner.inventory.accessorys.call_event("obstacle_destroy",{obstacle:this,human:params.owner})
    }
    revive(){
        if(!this.health_data.dead)return
        this.health_data.dead=false
        this.net_sync.full=true

        this.physical_data.no_collision=this.def.no_collision??false
        this.physical_data.no_bullets_collision=this.def.no_bullets_collision??false

        this.health_data.health=this.health_data.max_health

        this.reset_scale()
    }
    reset(){
        if(this.health_data.dead){
            this.revive()
        }else{
            this.net_sync.full=true
            this.health_data.health=this.health_data.max_health
            this.reset_scale()
        }
    }
    override encode(stream: NetStream, full: boolean): void {
        const door_dirty=this.door_data&&(full||this.door_data.dirty)

        stream.writeBooleanGroup(
            this.visual_data.dirty,
            this.physical_data.dirty,this.physical_data.dirty_part,
            this.health_data.dirty,
            this.health_data.dead,

            door_dirty,
            this.transform_into_data?.activated
        )
        if(full||this.visual_data.dirty){
            stream.writeUint8(this.visual_data.variation)
            stream.writeUint8(this.visual_data.skin)
        }
        if(full){
            stream.writeUint16(this.def.idNumber!)
        }
        if(full||this.physical_data.dirty||this.physical_data.dirty_part){
            stream.writeFloat(this.physical_data.scale,0,10,2)
            if(this.physical_data.dirty||full){
                stream.writePos2(this.position)
                .writeRad(this.physical_data.rotation)
                .writeUint8(this.physical_data.side)
            }
        }
        if(full||this.health_data.dirty){
            stream.writeFloat(this.health_data.health/this.def.health,0,1,1)
        }

        if(door_dirty){
            stream.writeInt8(this.door_data!.open)
        }
        if(this.transform_into_data?.activated){
            stream.writeUint8(this.transform_into_data.def)
        }
    }
}