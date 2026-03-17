import { ParticlesManager2D } from "../../core/game/particles.ts";
import { ClientParticle2D } from "../misc/particles.ts";
import { CamA, Container2DObject } from "./base.ts";

export class ParticleObject2D{
    tick(dt:number){

    }
}
export class ParticleEmitterObject2D{
    constructor(){
        
    }
}

export class ParticleContainer2D extends Container2DObject{
    override object_type: string="particles_container";
    manager:ParticlesManager2D<ClientParticle2D>
    constructor(manager?:ParticlesManager2D<ClientParticle2D>){
        super()
        this.manager=manager??new ParticlesManager2D()
    }
    override draw(cam: CamA): void {
    }
}