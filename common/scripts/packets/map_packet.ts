import { NetStream, Packet, v2, Vec2 } from "../../engine/core.ts";
import { type BiomeDef, type BiomeFloor } from "../definitions/maps/base.ts";
import { NormalBiome } from "../definitions/maps/normal.ts";
import { JSONBuildingDef } from "../definitions/objects/buildings_base.ts";
import { Floor } from "../others/terrain.ts";
export interface MapObjectObstacle{
    type:0,
    def:number
    rotation:number
    variation:number
    position:Vec2
    scale:number
    skin:number
}
export type MapObjectEncode=MapObjectObstacle
export interface MapConfig{
    terrain:Floor[]
    size:Vec2
    seed:number
    biome:BiomeDef
    objects:MapObjectEncode[]
    buildings?:JSONBuildingDef[]
    assets:string[]
}
function write_biome(biome:BiomeDef,stream:NetStream){
    stream.writeString(biome.biome_skin??"",1)
    .writeArray(biome.assets,(i,_s)=>{
        stream.writeString(i,1)
    })
    .writeArray(biome.musics??[],(i,_s)=>{
        stream.writeString(i,1)
    })
    .writeUint32(biome.ambient.particles_tint??0)
    .writeArray(biome.ambient.particles,(i,_s)=>{
        stream.writeString(i,1)
    })
    .writeBooleanGroup(biome.ambient.rain===true,biome.ambient.snow===true)
    .writeString(biome.ambient.sound??"",1)
    .writeNumberDict(biome.floors as Record<number,BiomeFloor>,(i,_s)=>{
        stream.writeBooleanGroup(i.color!==undefined)
        if(i.color!==undefined)stream.writeUint32(i.color??0)
    },1)
}
function decode_biome(stream:NetStream):BiomeDef{
    const biome:BiomeDef={
        ambient:{
            particles:[]
        },
        assets:[],
        floors:{},
    }
    biome.biome_skin=stream.readString(1)
    biome.assets=stream.readArray(()=>{
        return stream.readString(1)
    },1)
    biome.musics=stream.readArray(()=>{
        return stream.readString(1)
    },1)
    biome.ambient.particles_tint=stream.readUint32()
    biome.ambient.particles=stream.readArray(()=>stream.readString(1),1)
    const bg1=stream.readBooleanGroup()
    biome.ambient.rain=bg1[0]
    biome.ambient.snow=bg1[1]
    biome.ambient.sound=stream.readString(1)
    biome.floors=stream.readNumberDict((_s)=>{
        const [has_color]=stream.readBooleanGroup()
        const floor:BiomeFloor={}
        if(has_color){
            floor.color=stream.readUint32()
        }
        return floor
    },1)
    return biome
}
export class MapPacket extends Packet{
    ID=6
    Name="map"
    map:MapConfig={terrain:[],size:v2(0,0),objects:[],seed:0,biome:NormalBiome,buildings:[],assets:[]}
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeArray(this.map.terrain,(t)=>{
            stream.writeBooleanGroup(t.smooth,t.visible,t.tint!==undefined)
            .writeHitbox(t.hb)
            .writeUint8(t.type)
            .writeInt8(t.layer)
            if(t.tint!==undefined){
                stream.writeUint32(t.tint)
            }
        },2)
        .writeArray(this.map.objects,(i)=>{
            stream.writeUint8(i.type)
            switch(i.type){
                case 0:
                    stream.writeID(i.def)
                    .writeRad(i.rotation)
                    .writeUint8(i.variation)
                    .writeUint8(i.skin)
                    .writePos2(i.position)
                    .writeFloat(i.scale,0.1,2,1)
            }
        },2)
        .writeUint32(this.map.seed)
        .writeUint16(this.map.size.x)
        .writeUint16(this.map.size.y)
        write_biome(this.map.biome,stream)
        stream.writeObjectAdvanced(this.map.buildings)
        .writeArray(this.map.assets??[],(v)=>stream.writeString(v,1),1)
    }
    decode(stream: NetStream): void {
        this.map.terrain=stream.readArray(()=>{
            const bg=stream.readBooleanGroup()
            const hb=stream.readHitbox()
            const floor:Floor={
                type:stream.readUint8(),
                layer:stream.readInt8(),
                smooth:bg[0],
                visible:bg[1],
                hb:hb,
            }
            if(bg[2]){
                floor.tint=stream.readUint32()
            }
            return floor
        },2)
        this.map.objects=stream.readArray(()=>{
            const tp=stream.readUint8()
            switch(tp){
                default:
                    return {
                        type:0,
                        def:stream.readID(),
                        rotation:stream.readRad(),
                        variation:stream.readUint8(),
                        skin:stream.readUint8(),
                        position:stream.readPos2(),
                        scale:stream.readFloat(0.1,2,1),
                    }
            }
        },2)
        this.map.seed=stream.readUint32()
        this.map.size=v2(stream.readUint16(),stream.readUint16())
        this.map.biome=decode_biome(stream)
        this.map.buildings=stream.readObjectAdvanced()
        this.map.assets=stream.readArray(()=>stream.readString(1),1)
    }
}