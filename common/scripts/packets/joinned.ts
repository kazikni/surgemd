import { Packet } from "../../engine/core.ts";
import { Stream } from "../../engine/core/net/stream.ts";
import { PacketType } from "../definitions/utils.ts";
import { decode_general_main_state, encode_general_main_state, GeneralFullMainState } from "./general_update.ts";

export class JoinnedPacket extends Packet{
    override ID: number=PacketType.Joinned
    override Name: string="joinned"

    main_state!:GeneralFullMainState
    override encode(stream: Stream): void {
        encode_general_main_state(stream,this.main_state)
    }
    override decode(stream: Stream): void {
        this.main_state=decode_general_main_state(stream)
    }
}