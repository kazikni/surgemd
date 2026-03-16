import { NetStream, Packet, v2, Vec2 } from "../../engine/core.ts";
import { type BiomeDef, type BiomeFloor } from "../definitions/maps/base.ts";
import { NormalBiome } from "../definitions/maps/normal.ts";
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
}
export class MapPacket extends Packet{
    ID=6
    Name="map"
    map:MapConfig={terrain:[],size:v2.new(0,0),objects:[],seed:0,biome:NormalBiome}
    constructor(){
        super()
    }
    encode(stream: NetStream): void {
        stream.writeArray(this.map.terrain,(t)=>{
            stream.writeBooleanGroup(t.smooth,t.jagged)
            .writeHitbox(t.final_hb)
            stream.writeUint8(t.type)
            .writeInt8(t.layer)
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
        //Biome
        .writeStringSized(30,this.map.biome.biome_skin??"")
        .writeArray(this.map.biome.assets,(i,_s)=>{
            stream.writeString(i)
        })
        .writeArray(this.map.biome.ambient.particles,(i,_s)=>{
            stream.writeString(i)
        })
        .writeBooleanGroup(this.map.biome.ambient.rain===true,this.map.biome.ambient.snow===true)
        .writeString(this.map.biome.ambient.sound??"")
        .writeNumberDict(this.map.biome.floors as Record<number,BiomeFloor>,(i,_s)=>{
            stream.writeBooleanGroup(i.color!==undefined)
            if(i.color!==undefined)stream.writeUint32(i.color??0)
        },1)
    }
    decode(stream: NetStream): void {
        this.map.terrain=stream.readArray(()=>{
            const bg=stream.readBooleanGroup()
            const fhb=stream.readHitbox()
            return {
                type:stream.readUint8(),
                smooth:bg[0],
                jagged:bg[1],
                layer:stream.readInt8(),
                final_hb:fhb,
                hb:fhb
            }
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
        this.map.size=v2.new(stream.readUint16(),stream.readUint16())
        this.map.biome={
            floors:{},
            ambient:{
                particles:[],
            },
            assets:[],
            biome_skin:stream.readStringSized(30)??undefined
        }
        this.map.biome.assets=stream.readArray((s)=>{
            return s.readString()
        },1)
        this.map.biome.ambient.particles=stream.readArray((s)=>{
            return s.readString()
        },1)
        const bg1=stream.readBooleanGroup()
        this.map.biome.ambient.rain=bg1[0]
        this.map.biome.ambient.snow=bg1[1]
        this.map.biome.ambient.sound=stream.readString()
        this.map.biome.floors=stream.readNumberDict((_s)=>{
            const [has_color]=stream.readBooleanGroup()
            const floor:BiomeFloor={}
            if(has_color){
                floor.color=stream.readUint32()
            }
            return floor
        },1)
    }
}