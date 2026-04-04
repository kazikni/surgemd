import { Definition, Definitions, FrameDef } from "../../../engine/core.ts";
export interface SyncedParticleDef extends Definition{
    frame:FrameDef
    lifetime:number
}

export function SyncedParticle_Default_Init(synced_particles:Definitions<SyncedParticleDef,{}>){
    synced_particles.insert(
        {
            idString:"smoke",
            frame:{
                image:"smoke_particle",
                scale:1.5
            },
            lifetime:30
        },
    )
}