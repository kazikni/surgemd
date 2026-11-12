import { Vec2 } from "../../../../engine/core.ts";
import { type SimObject, type SimulatedScene } from "../../base.ts";
import { type Human } from "../human/human.ts";
import { MovingBody } from "../moving_body.ts";

export interface ProjectileCreateArgs{
    position?:Vec2
    owner?:Human
    source?:{id_string:string}
}

export abstract class Projectile extends MovingBody{
    owner?:Human
    source?:{id_string:string}

    on_create(args:ProjectileCreateArgs={}){
        if(args.position)this.position=args.position
        this.owner=args.owner
        this.source=args.source
    }
}

export function spawn_projectile<T extends SimObject=SimObject>(scene:SimulatedScene,type:number,layer:number,args:ProjectileCreateArgs&Record<string,any>):T{
    return scene.add_object(scene.make_object(type)!,layer,undefined,args) as T
}
