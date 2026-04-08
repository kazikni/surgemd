import { ObstacleBehaviorScalable, ObstacleDef, ObstacleDoorStatus } from "common/scripts/definitions/objects/obstacles.ts";
import { StaticBody } from "./static_body.ts";
import { GameObjectType, ObstacleVisualData } from "common/scripts/others/constants.ts";
import { Angle, LootTableItemRet, NetStream, Numeric, Orientation, random, RotationMode, v2 } from "common/engine/core.ts";
import { type Human } from "./human.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";
import { DamageParams } from "../others/utils.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { type Loot } from "./loot.ts";

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

    constructor(){
        super()
    }


    loot:LootTableItemRet<GameItem>[]=[]

    door?:ObstacleDoorStatus

    override update(_dt:number): void {
        
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
        super.net_update()

        this.health_data.dirty=false
        this.visual_data.dirty=false
    }
    override create(args: {def:ObstacleDef,rotation?:number,variation?:number,skin?:number}): void {
        this.def=args.def

        if(this.def.hitbox)this.physical_data.hitbox=this.def.hitbox.clone()
        if(this.def.spawnHitbox)this.physical_data.spawn_hitbox=this.def.spawnHitbox.clone()
        else this.physical_data.spawn_hitbox=this.physical_data.hitbox.clone()

        this.physical_data.no_collision=this.def.no_collision??false

        this.physical_data.reflect_bullet=this.def.reflect_bullets??false

        this.spawn_hitbox=this.physical_data.spawn_hitbox.clone()
    
        if(args.variation){
            this.visual_data.variation=args.variation
        }else if(this.def.assets?.frame?.variations){
            this.visual_data.variation=Numeric.clamp(random.int(1,this.def.assets.frame.variations+1),1,this.def.assets.frame.variations)
        }
        if(args.skin){
            this.visual_data.skin=args.skin
        }else if(this.def.assets?.frame?.biome_skins){
            this.visual_data.skin=this.def.assets.frame.biome_skins.indexOf(this.game.map.def.biome.biome_skin??"")+1
        }
        if(args.rotation===undefined){
            if(this.def.rotationMode===RotationMode.limited){
                this.physical_data.side=random.int(0,3) as Orientation
                this.physical_data.rotation=Angle.side_rad(this.physical_data.side)
            }else{
                this.physical_data.rotation=Angle.random_rotation_modded(this.def.rotationMode??RotationMode.full)
            }
        }else if(this.def.rotationMode){
            if(this.def.rotationMode===RotationMode.limited){
                this.physical_data.side=args.rotation as Orientation
                this.physical_data.rotation=Angle.side_rad(this.physical_data.side)
            }else{
                this.physical_data.rotation=args.rotation!
            }
        }
        this.health_data.max_health=this.def.health
        this.health_data.health=this.def.health

        if(this.def.lootTable){
            this.loot=this.game.loot_tables.get_loot(this.def.lootTable,{withammo:true},this.game)
        }
        if(this.def.scale?.min&&this.def.scale.max){
            this.max_scale=random.float(this.def.scale.min,this.def.scale.max)
            this.physical_data.scale=this.max_scale
        }
        switch(this.def.expanded_behavior?.type??-1){
            case 0:{
                this.updatable=true
                this.door={
                    locked:false,
                    open:0,
                }
                break
            }
            default:
                this.updatable=false
        }
    }
    reset_scale(){
        if(this.def.hitbox&&this.def.scale){
            const destroyScale = (this.def.scale.destroy ?? 1)*this.max_scale;
            this.physical_data.scale=Math.max(this.health_data.health / this.def.health*(this.max_scale - destroyScale) + destroyScale,0)
            this.base_hitbox=this.physical_data.hitbox.transform(undefined,this.physical_data.scale)

            this.net_sync.part=true
            this.physical_data.dirty_part=true

            this.manager.cells.updateObject(this)
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
        this.physical_data.no_bullet_collision=true

        for(let i=0;i<5;i++){
            for(const loot of loots){
                loot.update(1/60)
            }
        }
        for(const loot of loots){
            loot.is_new=true
        }
    }
    revive(){
        if(!this.health_data.dead)return
        this.health_data.dead=false
        this.net_sync.full=true

        this.physical_data.no_collision=this.def.no_collision??false
        this.physical_data.no_bullet_collision=this.def.no_bullet_collision??false

        this.health_data.health=this.health_data.max_health

        this.reset_scale()
        this.manager.cells.updateObject(this)
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
        stream.writeBooleanGroup(
            this.visual_data.dirty,
            this.physical_data.dirty,this.physical_data.dirty_part,
            this.health_data.dirty,
            this.health_data.dead
        )
        if(full||this.visual_data.dirty){
            stream.writeUint8(this.visual_data.variation)
            stream.writeUint8(this.visual_data.skin)
        }
        if(full){
            stream.writeUint16(this.def.idNumber!)
        }
        super.encode(stream,full)
        if(full||this.health_data.dirty){
            stream.writeFloat(this.health_data.health/this.def.health,0,1,1)
        }
    }
}