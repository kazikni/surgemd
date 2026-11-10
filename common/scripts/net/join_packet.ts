import { Packet, Stream } from "../../engine/core.ts";
import { LoadoutPreset, PacketType } from "../definitions/utils.ts";
import { GameConstants } from "../others/constants.ts";

/**
 * Dados que um jogador manda para entrar no jogo.
 * E usado igual no modo online/worker (dentro do JoinPacket) e no modo local (direto para o ModeManager).
 */
export interface JoinData{
    name:string
    group_token?:string
    loadout?:LoadoutPreset
}

export class JoinPacket extends Packet{
    ID=PacketType.Join
    Name="join"

    data:JoinData={name:""}

    constructor(data?:JoinData){
        super()
        if(data)this.data=data
    }
    encode(stream: Stream): void {
        stream.write_string_sized(this.data.name,GameConstants.player.max_name_size)
        stream.write_string_sized(this.data.group_token??"",20)
        stream.write_boolean_group(this.data.loadout!==undefined)
        if(this.data.loadout)stream.write_any(this.data.loadout,1,1)
    }
    decode(stream: Stream): void {
        this.data={
            name:stream.read_string_sized(GameConstants.player.max_name_size),
            group_token:stream.read_string_sized(20),
        }
        const [has_loadout]=stream.read_boolean_group()
        if(has_loadout)this.data.loadout=stream.read_any(1,1) as LoadoutPreset
    }
}

/**
 * Resposta do servidor ao JoinPacket. Diz qual humano e o humano ativo do cliente.
 */
export class JoinedPacket extends Packet{
    ID=PacketType.Joinned
    Name="joined"

    human_id:number=0
    ntps:number=32

    encode(stream: Stream): void {
        stream.write_id(this.human_id)
        stream.write_uint8(this.ntps)
    }
    decode(stream: Stream): void {
        this.human_id=stream.read_id()
        this.ntps=stream.read_uint8()
    }
}
