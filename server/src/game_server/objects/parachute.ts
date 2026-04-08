import { CircleHitbox2D, NetStream, v2, Vec2 } from "common/engine/core.ts";
import { ServerGameObject } from "../others/gameObject.ts";
import { GameObjectType } from "common/scripts/others/constants.ts";
import { type Human } from "./human.ts";
import { ObstacleDef } from "common/scripts/definitions/objects/obstacles.ts";

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
            obs.set_position(this.position,0)
            obs.manager.cells.updateObject(obs)
            this.destroy()
        }
    }
    interact(user: Human): void {
    }
    create(args: {position:Vec2}): void {
        this.parachute_data={
            lifetime:15,
            spawn_obstacle:this.game.definitions.obstacles.getFromString("iron_crate")
        }
        this.base_hitbox=new CircleHitbox2D(v2.zero(),3)
        this.position=args.position
        this.manager.cells.updateObject(this)
    }
    override encode(stream: NetStream, full: boolean): void {
        stream.writeFloat(this.time,0,30,2)
        if(full){
            stream.writePos2(this.position)
            stream.writeFloat(this.parachute_data.lifetime,0,30,2)
        }
    }
}