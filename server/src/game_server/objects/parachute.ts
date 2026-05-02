import { CircleHitbox2D, NetStream, v2, Vec2 } from "common/engine/core.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Human } from "./human.ts";
import { type Obstacle } from "./obstacle.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";
import { DamageReason } from "common/scripts/definitions/utils.ts";

export class Parachute extends ServerGameObject{
    string_type:string="parachute"
    number_type:number=GameObjectType.Parachute

    time=0
    parachute_data!:{
        lifetime:number
        spawn_obstacle:ObstacleDef
    }

    constructor(){
        super()
    }

    override net_update(): void {
    }
    update(dt:number): void {
        this.time+=dt
        if(this.time>=this.parachute_data.lifetime){
            this.time=this.parachute_data.lifetime
            const obs=this.game.map.add_obstacle(this.parachute_data.spawn_obstacle)
            obs.initialize()
            obs.set_position(this.position)
            this.destroy()

            const objects:ServerGameObject[]=this.manager.cells.get_objects(obs.hitbox,obs.layer)
            for(const o of objects){
                if(!o.hitbox.colliding_with(obs.hitbox))continue
                if(o.number_type===GameObjectType.Human){
                    (o as Human).damage({
                        amount:1000,
                        critical:true,
                        direction:v2.lookTo(this.position,o.position),
                        position:this.position,
                        reason:DamageReason.Airdrop,
                    })
                }
                if(o.number_type===GameObjectType.Obstacle){
                    if((o as Obstacle).def.imortal)continue
                    (o as Obstacle).die({
                        amount:1000,
                        critical:true,
                        direction:v2.lookTo(this.position,o.position),
                        position:this.position,
                        reason:DamageReason.Airdrop,
                        resistence:10
                    })
                }
            }

            const def=this.game.definitions.synced_particle.getFromString("airdrop_smoke")
            for(let i=0;i<8;i++){
                this.game.add_synced_particle(this.position,def,undefined,this.layer)
            }
        }
    }
    interact(user: Human): void {
    }
    create(args: {position:Vec2,obstacle:ObstacleDef}): void {
        this.parachute_data={
            lifetime:15,
            spawn_obstacle:args.obstacle
        }
        this.base_hitbox=new CircleHitbox2D(v2.zero(),3)
        this.position=args.position

        this.game.pings.push({
            position:this.position,
            def:this.game.definitions.ping.getFromString("ping_airdrop").idNumber!,
            id:-1,
            color:0xffffff,
        })
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writeFloat(this.time,0,30,2)
        if(full){
            stream.writePos2(this.position)
            stream.writeFloat(this.parachute_data.lifetime,0,30,2)
        }
    }
}