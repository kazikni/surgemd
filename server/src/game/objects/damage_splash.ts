import { CircleCollider2D, Stream, v2, Vec2 } from "common/engine/core.ts";
import { object_instance_type, ObjectType } from "common/scripts/others/constants.ts";
import { SimObject } from "../main/base.ts";

const DamageSplashDelay=0.1
export class DamageSplash extends SimObject{
    owner?:SimObject
    victim?:SimObject
    count:number=0
    critical:boolean=false
    shield:boolean=false
    delay:number=DamageSplashDelay

    constructor(){
        super()
        this.object_type=ObjectType.DamageSplash
        this.instance_type=object_instance_type.damage_splash
        this.allow_tick=true
        this.allow_checkpoint=false
        this.net_sync_creation=false
        this.net_sync_dirty=false
        this.net_sync_deletion=false
    }

    on_create(args:{owner?:SimObject,victim?:SimObject,position?:Vec2,critical?:boolean,shield?:boolean,count:number}){
        this.base_collider=new CircleCollider2D(v2(0,0),3)
        this.victim=args.victim
        this.owner=args.owner
        this.count=args.count
        if(args.critical)this.critical=args.critical
        if(args.shield)this.shield=args.shield
        this.position=args.position??args.victim?.position??args.owner?.position??v2.zero()
        if(this.victim){
            if(this.scene.damage_splashes[this.victim.id]){
                for(let i=0;i<this.scene.damage_splashes[this.victim.id].length;i++){
                    const other=this.scene.damage_splashes[this.victim.id][i]
                    if(other.owner?.id===this.owner?.id&&other.shield===this.shield){
                        this.count+=other.count
                        //this.delay=other.delay
                        if(other.critical)this.critical=true
                        other.destroy()
                        this.scene.damage_splashes[this.victim.id].splice(i,1)
                        i--
                    }
                }
                this.scene.damage_splashes[this.victim.id].push(this)
            }else{
                this.scene.damage_splashes[this.victim.id]=[this]
            }

        }
    }
    on_destroy(){
        if(!this.victim||!this.scene.damage_splashes[this.victim.id])return
        const idx=this.scene.damage_splashes[this.victim.id].indexOf(this)
        if(idx!==-1){
            this.scene.damage_splashes[this.victim.id].splice(idx,1)
            if(this.scene.damage_splashes[this.victim.id].length===0)delete this.scene.damage_splashes[this.victim.id]
        }
    }

    on_tick(dt:number){
        this.delay-=dt
        if(this.delay<=0){
            this.net_sync_dirty=true
            this.net_sync_creation=true
            this.set_dirty_full()
            this.destroy()
        }
    }
    on_encode_net(stream:Stream){
        stream.write_boolean_group(this.critical,this.shield)
        stream.write_pos2(this.position)
        stream.write_uint16(Math.round(this.count))
    }
}
