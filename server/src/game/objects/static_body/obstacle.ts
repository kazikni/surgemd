import { type DamageParams } from "../projectile/projectile.ts";
import { Angle, CircleCollider2D, Numeric, Orientation, random, RotationMode, Stream, v2, Vec2 } from "common/engine/core.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { LootData, object_instance_type } from "common/scripts/others/constants.ts";
import { type Inventory } from "../../inventory/inventory.ts";
import { type Human } from "../human/human.ts";
import { type Loot } from "../loot.ts"
import { StaticBody } from "./static_body.ts";

export class Obstacle extends StaticBody{
    override physical:{
        dirty:boolean
        dirty_part:boolean
    }&StaticBody["physical"]
    def!:ObstacleDef

    scale:number
    rotation:number

    variation:number

    health?:{
        dead:boolean
        value:number
    }

    max_scale:number=1
    loot:LootData[]

    transform_into_data?:{activated:boolean,def:number}

    constructor(){
        super()
        this.physical={
            collider:this.collider,
            dirty_part:true,
            dirty:true,
        }
        this.instance_type=object_instance_type.obstacle
        this.rotation=0
        this.scale=1
        this.variation=0
        this.loot=[]
        this.allow_net_update=true
    }
    on_create(args:{def:ObstacleDef}){
        if(args?.def)this.set_definition(args.def)
    }
    set_definition(def:ObstacleDef):void{
        this.def=def
        if(this.def.health!==undefined&&!this.def.imortal){
            this.health={
                value:0,
                dead:true
            }
        }
        this.physical.no_collision=this.def.no_collision??false
        this.physical.no_projectiles_collision=this.def.no_projectiles_collision??false
        this.physical.reflect_projectiles=this.def.reflect_bullets??false
        this.physical.passable_by_projectiles=this.def.passable_by_bullets??false
        this.physical.no_spawn_collision=this.def.no_spawn_collision
        this.physical.no_pathfinding_collision=this.def.no_pathfinding_collision
    }
    die(params:DamageParams){
        if(!this.health||this.health.dead)return
        this.health.dead=true
        for(const l of this.loot){
            const loot=this.scene.add_object(this.scene.make_object(object_instance_type.loot)!,this.layer,undefined,{data:l,position:v2.add(this.position,random.random_in_circle(0.3))}) as Loot
            loot.push(random.float(0.5,2),random.rad())
        }
        this.loot.length=0
        if(this.def.onDestroyExplosion){
            this.scene.add_object(this.scene.make_object(object_instance_type.explosion),this.layer,undefined,{position:this.position,owner:params.owner,def:this.app.definitions.explosions.getFromString(this.def.onDestroyExplosion),source:this.def})
        }
        if(!this.def.keep_collision_on_die){
            this.physical.no_collision=true
            this.physical.no_projectiles_collision=true
        }
        this.reset_scale()
        this.set_dirty_part()
    }
    damage(params:DamageParams):void{
        if(!this.health||this.health.dead||this.def.imortal)return
        if((this.def.resistence??0)>(params.resistence??0))return
        this.health.value=Math.max(this.health.value-params.amount,0)
        if(this.health.value<=0){
            this.die(params)
            ;(params.owner as {inventory?:Inventory}|undefined)?.inventory?.emit_event("obstacle_destroy",{obstacle:this,human:params.owner})
        }else{
            this.reset_scale()
        }
        this.set_dirty_part()
    }
    load_loot():void{
        this.loot.length=0
        if(this.def.loot_table)this.loot.push(...this.scene.mode.get_loot(this.def.loot_table))
    }
    can_interact(user:Human):boolean{
        if(this.destroyed||!this.def.interactDestroy||!this.health||this.health.dead)return false
        return new CircleCollider2D(user.position,user.interaction.radius).colliding_with(this.collider)
    }
    on_interact(user:Human):void{
        if(this.def.interactDestroy){
            this.die({amount:9999,owner:user})
        }
    }
    init(rotation?:number,scale?:number,variation?:number,parent_side?:number):void{
        if(this.def.rotation_mode===RotationMode.limited){
            this.rotation=rotation===undefined?random.int(0,3):Angle.add_orientation(rotation as Orientation,(parent_side??0) as Orientation)
            if(this.def.collider)this.physical.collider=this.def.collider.transform(undefined,undefined,undefined,this.rotation)
        }else{
            this.rotation=rotation??random.rad()
            if(this.def.collider)this.physical.collider=this.def.collider
        }

        if(variation){
            this.variation=variation
        }else if(this.def.assets?.frame?.variations){
            this.variation=Numeric.clamp(random.int(1,this.def.assets.frame.variations+1),1,this.def.assets.frame.variations)
        }

        this.max_scale=scale??(this.def.scale?.min&&this.def.scale.max?random.float(this.def.scale.min,this.def.scale.max):1)

        this.base_collider=this.physical.collider

        if(this.health){
            this.health.dead=false
            this.health.value=this.def.health!
        }

        this.reset_scale()
        this.load_loot()
    }
    set_position(position:Vec2):void{
        this.position=position
        this.reset_scale()
        this.physical.dirty=true
    }
    reset_scale(){
        let scale=this.max_scale
        if(this.physical.collider&&this.def.scale&&this.health){
            const destroyScale = (this.def.scale.destroy ?? 1)*this.max_scale;
            scale=Math.max(this.health.value/this.def.health!*(this.max_scale-destroyScale)+destroyScale,0)
            this.set_dirty_part()
            this.physical.dirty_part=true
        }
        
        this.scale=scale

        this.base_collider=this.physical.collider.transform(undefined,this.scale)
        if(this.def.spawnCollider){
            this.physical.spawn_collider=this.def.rotation_mode===RotationMode.limited?this.def.spawnCollider.transform(undefined,undefined,undefined,this.rotation):this.def.spawnCollider
            this.physical.spawn_collider=this.physical.spawn_collider.transform(undefined,scale)
        }
        this.update_collider()
    }
    on_net_update(){
        this.physical.dirty_part=false
        this.physical.dirty=false
    }
    on_encode_net(stream:Stream,full:boolean){
        stream.write_boolean_group(this.health?.dead??false,this.physical.dirty_part,this.physical.dirty)
        if(full){
            stream.write_uint16(this.def.id_number!)
        }
        if(full||this.physical.dirty){
            stream.write_uint8(this.variation)
            stream.write_float32(this.rotation)
            stream.write_pos2(this.position)
        }
        if(full||this.physical.dirty||this.physical.dirty_part){
            stream.write_float32(this.scale)
        }
        if(this.health){
            stream.write_float(this.health.value/this.def.health!,0,1,1)
        }
    }

    on_checkpoint_encode(stream:Stream){
        stream.write_string(this.def.id_string,1)
        stream.write_uint8(this.variation)
        stream.write_float32(this.rotation)
        stream.write_float32(this.max_scale)
        stream.write_pos2(this.position)
        stream.write_boolean_group(this.health!==undefined,this.health?.dead??false)
        if(this.health)stream.write_float32(this.health.value)
    }
    on_checkpoint_decode(stream:Stream){
        this.set_definition(this.app.definitions.obstacles.getFromString(stream.read_string(1)))
        const variation=stream.read_uint8()
        const rotation=stream.read_float32()
        const max_scale=stream.read_float32()
        const position=stream.read_pos2()
        const [has_health,dead]=stream.read_boolean_group()
        const health=has_health?stream.read_float32():undefined
        this.init(rotation,max_scale,variation)
        if(this.health&&health!==undefined){
            this.health.value=health
            this.health.dead=dead
        }
        this.set_position(position)
    }
}