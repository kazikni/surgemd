import { CircleCollider2D, Stream, v2, v2m } from "../../../engine/core.ts";
import { GameConstants, ObjectType, LootData, object_instance_type } from "../../others/constants.ts";
import { decode_loot_data, encode_loot_data } from "../../others/functions.ts";
import { Floors, FloorType } from "../../others/terrain.ts";
import { type SimObject } from "../base.ts";
import { type Human } from "./human/human.ts";
import { MovingBody } from "./moving_body.ts";

export class Loot extends MovingBody{
    loot_data!:LootData
    old_position=v2(-1,-1)
    current_floor:FloorType=FloorType.Water

    constructor(){
        super()
        this.object_type=ObjectType.Loot
        this.instance_type=object_instance_type.loot
        this.allow_tick=true
    }

    set_loot_data(data:LootData){
        this.loot_data=data
        this.base_collider=new CircleCollider2D(v2(0,0),GameConstants.loot.radius[data.item.item_type!]??0.5)
    }

    on_create(args:{data?:LootData,position?:{x:number,y:number}}={}){
        if(args.position)this.position=args.position
        if(args.data)this.set_loot_data(args.data)
    }

    override on_collided(obj:SimObject,dt:number){
        if(obj.object_type===ObjectType.StaticBody){
            super.on_collided(obj,dt)
        }else if(obj.object_type===ObjectType.Loot){
            const col=this.collider.overlap_collision(obj.collider)
            if(!col)return
            const pen=col.pen*2.5*dt
            const dir=col.pen<=0.0001?v2.random(-1,1):col.dir
            v2m.sub(this.velocity,this.velocity,v2.scale(dir,pen))
            v2m.sub(this.position,this.position,v2.scale(dir,pen))
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
