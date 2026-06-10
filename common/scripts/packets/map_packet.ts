import { Stream, Packet, v2, Vec2 } from "../../engine/core.ts";
import { type BiomeDef, type BiomeFloor } from "../definitions/maps/base.ts";
import { NormalBiome } from "../definitions/maps/normal.ts";
import { JSONBuildingDef } from "../definitions/objects/buildings_base.ts";
import { Floor } from "../others/terrain.ts";
export interface MapRegion{
    name:string
    position:Vec2
}
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
    regions:MapRegion[]
    buildings?:JSONBuildingDef[]
    assets:string[]
}
function write_biome(biome:BiomeDef,stream:Stream){
    stream.write_string(biome.biome_skin??"",1)
    .write_array(biome.assets,(i,_s)=>{
        stream.write_string(i,1)
    })
    .write_array(biome.musics??[],(i,_s)=>{
        stream.write_string(i,1)
    })
    .write_uint32(biome.ambient.particles_tint??0)
    .write_array(biome.ambient.particles,(i,_s)=>{
        stream.write_string(i,1)
    })
    .write_boolean_group(biome.ambient.rain===true,biome.ambient.snow===true)
    .write_string(biome.ambient.sound??"",1)
    .write_number_dict(biome.floors as Record<number,BiomeFloor>,(i,_s)=>{
        stream.write_boolean_group(i.color!==undefined)
        if(i.color!==undefined)stream.write_uint32(i.color??0)
    },1)
}
function decode_biome(stream:Stream):BiomeDef{
    const biome:BiomeDef={
        ambient:{
            particles:[]
        },
        assets:[],
        floors:{},
    }
    biome.biome_skin=stream.read_string(1)
    biome.assets=stream.read_array(()=>{
        return stream.read_string(1)
    },1)
    biome.musics=stream.read_array(()=>{
        return stream.read_string(1)
    },1)
    biome.ambient.particles_tint=stream.read_uint32()
    biome.ambient.particles=stream.read_array(()=>stream.read_string(1),1)
    const bg1=stream.read_boolean_group()
    biome.ambient.rain=bg1[0]
    biome.ambient.snow=bg1[1]
    biome.ambient.sound=stream.read_string(1)
    biome.floors=stream.read_number_dict((_s)=>{
        const [has_color]=stream.read_boolean_group()
        const floor:BiomeFloor={}
        if(has_color){
            floor.color=stream.read_uint32()
        }
        return floor
    },1)
    return biome
}
export class MapPacket extends Packet{
    ID=6
    Name="map"
    map:MapConfig={terrain:[],size:v2(0,0),objects:[],seed:0,biome:NormalBiome,buildings:[],assets:[],regions:[]}
    constructor(){
        super()
    }
    encode(stream: Stream): void {
        stream.write_array(this.map.terrain,(t)=>{
            stream.write_boolean_group(t.smooth,t.visible,t.tint!==undefined)
            .write_hitbox(t.hb)
            .write_uint8(t.type)
            .write_int8(t.layer)
            if(t.tint!==undefined){
                stream.write_uint32(t.tint)
            }
        },2)
        .write_array(this.map.objects,(i)=>{
            stream.write_uint8(i.type)
            switch(i.type){
                case 0:
                    stream.write_id(i.def)
                    .write_rad(i.rotation)
                    .write_uint8(i.variation)
                    .write_uint8(i.skin)
                    .write_pos2(i.position)
                    .write_float(i.scale,0.1,2,1)
            }
        },2)
        .write_uint32(this.map.seed)
        .write_uint16(this.map.size.x)
        .write_uint16(this.map.size.y)
        write_biome(this.map.biome,stream)
        stream.write_object_advanced(this.map.buildings)
        .write_array(this.map.assets??[],(v)=>stream.write_string(v,1),1)
        .write_array(this.map.regions,(v)=>{
            stream.write_string(v.name,1)
            .write_pos2(v.position)
        },1)
    }
    decode(stream: Stream): void {
        this.map.terrain=stream.read_array(()=>{
            const bg=stream.read_boolean_group()
            const hb=stream.read_hitbox()
            const floor:Floor={
                type:stream.read_uint8(),
                layer:stream.read_int8(),
                smooth:bg[0],
                visible:bg[1],
                hb:hb,
            }
            if(bg[2]){
                floor.tint=stream.read_uint32()
            }
            return floor
        },2)
        this.map.objects=stream.read_array(()=>{
            const tp=stream.read_uint8()
            switch(tp){
                default:
                    return {
                        type:0,
                        def:stream.read_id(),
                        rotation:stream.read_rad(),
                        variation:stream.read_uint8(),
                        skin:stream.read_uint8(),
                        position:stream.read_pos2(),
                        scale:stream.read_float(0.1,2,1),
                    }
            }
        },2)
        this.map.seed=stream.read_uint32()
        this.map.size=v2(stream.read_uint16(),stream.read_uint16())
        this.map.biome=decode_biome(stream)
        this.map.buildings=stream.read_object_advanced()
        this.map.assets=stream.read_array(()=>stream.read_string(1),1)
        this.map.regions=stream.read_array(()=>{
            return {
                name:stream.read_string(1),
                position:stream.read_pos2()
            }
        },1)
    }
}