import { PacketsManager } from "../../engine/core.ts";
import { InputPacket } from "./input_packet.ts";
import { GameOverPacket } from "./gameOver.ts";
import { GeneralUpdatePacket } from "./general_update.ts";
import { JoinPacket } from "./join_packet.ts";
import { UpdatePacket } from "./update_packet.ts";
import { StartPacket } from "./start_packet.ts";
import { JoinnedPacket } from "./joinned.ts";

export const PacketManager:PacketsManager=new PacketsManager()
PacketManager.add_packet(JoinPacket)
PacketManager.add_packet(JoinnedPacket)
PacketManager.add_packet(InputPacket)
PacketManager.add_packet(UpdatePacket)
PacketManager.add_packet(GameOverPacket)
PacketManager.add_packet(GeneralUpdatePacket)
PacketManager.add_packet(StartPacket)