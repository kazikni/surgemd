import { CircleCollider2D, Stream, v2, Vec2 } from "common/engine/core.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { object_instance_type, ObjectType } from "common/scripts/others/constants.ts";
import { SimObject } from "../main/base.ts";
import { type Human } from "./human/human.ts";
import { type Obstacle } from "./static_body/obstacle.ts";

export class Parachute extends SimObject{
    time:number=0
    lifetime:number=10
    obstacle!:ObstacleDef

    constructor(){
        super()
        this.object_type=ObjectType.Parachute
        this.instance_type=object_instance_type.parachute
        this.allow_tick=true
        this.net_sync_deletion=false
    }
    on_create(args?:{position:Vec2,obstacle:ObstacleDef,lifetime?:number}){
        if(!args)return
        this.obstacle=args.obstacle
        this.lifetime=args.lifetime??this.lifetime
        this.base_collider=new CircleCollider2D(v2.zero(),3)
        this.position=v2.clone(args.position)
    }
    on_tick(dt:number){
        this.time+=dt
        this.set_dirty_part()
        if(this.time<this.lifetime)return
        this.time=this.lifetime
        this.land()
        this.destroy()
    }
    land(){
        const obs=this.scene.add_object(this.scene.make_object(object_instance_type.obstacle),this.layer,undefined,{def:this.obstacle}) as Obstacle
        obs.init()
        obs.set_position(this.position)
        for(const o of this.scene.cells.get_objects(obs.collider,obs.layer)){
            if(o.id===obs.id||o.destroyed||!o.collider.colliding_with(obs.collider))continue
            const params={amount:1000,critical:true,position:this.position,direction:v2.lookTo(this.position,o.position),penetration:1,resistence:10}
            if(o.object_type===ObjectType.Human)(o as Human).piercing_damage(params)
            else if(o.instance_type===object_instance_type.obstacle&&!(o as Obstacle).def.imortal)(o as Obstacle).die(params)
        }
        const smoke=this.app.definitions.synced_particles.getFromString("airdrop_smoke")
        for(let i=0;i<6;i++){
            this.scene.add_object(this.scene.make_object(object_instance_type.synced_particle),this.layer,undefined,{position:this.position,def:smoke})
        }
    }
    on_encode_net(stream:Stream,full:boolean){
        stream.write_float(this.time,0,30,2)
        if(full){
            stream.write_pos2(this.position)
            stream.write_float(this.lifetime,0,30,2)
        }
    }
    on_encode_checkpoint(stream:Stream){
        stream.write_pos2(this.position)
        .write_float32(this.time)
        .write_float32(this.lifetime)
        .write_uint16(this.obstacle.id_number!)
    }
    on_decode_checkpoint(stream:Stream){
        const position=stream.read_pos2()
        const time=stream.read_float32()
        const lifetime=stream.read_float32()
        this.on_create({position,lifetime,obstacle:this.app.definitions.obstacles.valueNumber[stream.read_uint16()]})
        this.time=time
    }
}
