import { CircleCollider2D, Collider2D, OverlapCollision2D, Stream, v2, v2m, Vec2 } from "common/engine/core.ts";
import { GameConstants, ObjectType, LootData, object_instance_type } from "common/scripts/others/constants.ts";
import { decode_loot_data, encode_loot_data } from "common/scripts/others/functions.ts";
import { Floors, FloorType } from "common/scripts/others/terrain.ts";
import { SimObject } from "../main/base.ts";
import { type Human } from "./human/human.ts";
import { SI_StaticBody } from "./static_body/static_body.ts";

export class Loot extends SimObject{
    loot_data!:LootData
    old_position=v2(-1,-1)
    velocity:Vec2=v2.zero()
    current_floor:FloorType=FloorType.Water

    collision_collider:CircleCollider2D=new CircleCollider2D(v2.zero(),0)

    constructor(){
        super()
        this.object_type=ObjectType.Loot
        this.instance_type=object_instance_type.loot
        this.allow_tick=true
    }

    push(speed:number,direction:number){
        v2m.add(this.velocity,this.velocity,v2.from_RadAngle(direction,speed))
    }
    set_loot_data(data:LootData){
        this.loot_data=data
        this.base_collider=new CircleCollider2D(v2(0,0),GameConstants.loot.main_radius[data.item.item_type!]??0.5)
        this.collision_collider.radius=GameConstants.loot.collision_radius[data.item.item_type!]??0.5
    }

    on_create(args:{data?:LootData,position?:{x:number,y:number}}={}){
        if(args.position)this.position=args.position
        if(args.data)this.set_loot_data(args.data)
    }

    on_collided(obj:SimObject,dt:number){
        if(obj.object_type===ObjectType.StaticBody){
            if((obj as unknown as SI_StaticBody).physical.no_collision)return
            const collisions:OverlapCollision2D[]=this.collision_collider.overlap_collisions(obj.collider)
            for(const col of collisions)v2m.sub(this.position,this.position,v2.scale(col.dir,col.pen))
        }else if(obj.object_type===ObjectType.Loot){
            const col=this.collider.overlap_collision((obj as Loot).collider)
            if(!col)return
            const pen=col.pen*dt
            const dir=col.pen<=0.00001?v2.random(-1,1):col.dir
            v2m.sub(this.velocity,this.velocity,v2.scale(dir,pen*3))
            v2m.sub(this.position,this.position,v2.scale(dir,pen*2.5))
        }
    }

    on_tick(dt:number){
        if(this.current_floor===FloorType.Water){
            for(const river of this.scene.map.rivers){
                if(!river.get_point_inside(this.position)?.push)continue
                const point=river.get_closest_point(this.position)
                if(point)v2m.add(this.velocity,this.velocity,v2.scale(point.direction,point.push_force*dt))
                break
            }
        }
        for(const obj of this.manager.cells.get_objects(this.collider,this.layer) as SimObject[]){
            if(obj.id!==this.id)this.on_collided(obj,dt)
        }
        const speed=Floors[this.current_floor].speed_mult??1
        const pos=v2.add(this.position,v2.scale(this.velocity,speed*dt))
        this.collision_collider.position=pos
        v2m.scale(this.velocity,this.velocity,1/(1+dt*2.5))
        this.position=this.scene.map.clamp_collider(pos,this.base_collider)
        if(!v2.is(this.position,this.old_position)){
            this.old_position=v2.clone(this.position)
            this.current_floor=this.scene.map.terrain.get_floor_type(this.position,this.layer,this.scene.map.default_floor)
            this.set_dirty_part()
        }
    }

    can_interact(user:Human):boolean{
        return !this.destroyed&&this.loot_data.count>0&&user.collider.colliding_with(this.collider)
    }
    auto_interact(user:Human):boolean{
        return user.inventory.can_auto_take(this.loot_data.item)
    }
    on_interact(user:Human){
        const data=this.loot_data
        const remaining=user.inventory.give_item(data.item,data.count,false,{ammo:data.ammo,skin:data.skin},this.position,this.layer)
        for(const l of data.aditional??[])user.inventory.give_loot(l,true,this.position,this.layer)
        data.aditional=undefined
        if(remaining===data.count)return
        if(remaining<=0){
            this.destroy()
        }else if(data.count!==Infinity){
            data.count=remaining
            this.set_dirty_full()
        }
    }

    on_encode_net(stream:Stream,full:boolean){
        stream.write_pos2(this.position)
        if(full)encode_loot_data(this.app.definitions,this.loot_data,stream)
    }
    on_encode_checkpoint(stream:Stream){
        stream.write_pos2(this.position).write_pos2(this.velocity)
        encode_loot_data(this.app.definitions,this.loot_data,stream)
    }
    on_decode_checkpoint(stream:Stream){
        this.position=stream.read_pos2()
        this.velocity=stream.read_pos2()
        this.set_loot_data(decode_loot_data(this.app.definitions,stream))
    }
}
