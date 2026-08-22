import { Packet } from "../../engine/core/net/packets.ts";
import { Stream } from "../../engine/core/net/stream.ts";
import { PacketType } from "../definitions/utils.ts";

export interface StartSettings{
    textures:string[]
    musics:string[]
    assets:Record<string,string>
    languages_path:string
    background_music?:string
    map?:Stream
}

export class StartPacket extends Packet{
    ID=PacketType.Start
    Name="start"
    settings!:StartSettings
    override encode(stream: Stream): void {
        stream.write_array(this.settings.textures,(i)=>{
            stream.write_string(i)
        },1)
        .write_string_dict(this.settings.assets,(i)=>{
            stream.write_string(i)
        },2)
        .write_array(this.settings.musics,(i)=>{
            stream.write_string(i)
        },1)
        .write_string(this.settings.background_music??"",1)
        .write_string(this.settings.languages_path)
        stream.write_stream_dynamic(this.settings.map)
    }
    override decode(stream: Stream): void {
        this.settings={
            textures:stream.read_array(()=>{
                return stream.read_string()
            },1),
            assets:stream.read_string_dict(()=>{
                return stream.read_string()
            },2),
            musics:stream.read_array(()=>{
                return stream.read_string()
            },1),
            background_music:stream.read_string(1),
            languages_path:stream.read_string(1),
        }
        if(this.settings.background_music==="")this.settings.background_music=undefined
        this.settings.map=stream.read_stream_dynamic()
    }
}