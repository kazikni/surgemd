import { PacketsManager } from "../../engine/core.ts";
import { InputPacket } from "./input_packet.ts";
import { JoinedPacket, JoinPacket } from "./join_packet.ts";
import { StartPacket, UpdatePacket } from "./update_packet.ts";

export function make_packet_manager():PacketsManager{
    const pm=new PacketsManager()
    pm.add_packet(JoinPacket)
    pm.add_packet(JoinedPacket)
    pm.add_packet(InputPacket)
    pm.add_packet(UpdatePacket)
    pm.add_packet(StartPacket)
    return pm
}

export const PacketManager:PacketsManager=make_packet_manager()
