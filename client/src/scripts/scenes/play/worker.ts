import { ClientsManager, WorkerSocket } from "common/engine/core.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { Game } from "../../../../../server/src/game/game.ts";
import type { WorkerMessage } from "./scene.ts";

let game:Game|undefined

self.addEventListener("message",async (e:MessageEvent)=>{
    const msg=e.data as WorkerMessage
    if(!msg||typeof msg!=="object"||msg.type!=="init"||game)return
    const options=msg.options??{}

    const clients=new ClientsManager(make_packet_manager())
    game=new Game({
        tps:options.tps??100,
        ntps:options.ntps??32,
    },clients)
    await game.init({
        mode:options.mode??"normal",
        settings:options.settings??{},
    })
    game.mainloop()

    clients.fake_connect_other_s(new WorkerSocket(self as unknown as Worker))
})
