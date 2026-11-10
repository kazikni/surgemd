// WebWorker do modo worker: roda o MESMO Game do servidor (server/src/game/game.ts),
// so que a "rede" e o postMessage entre o worker e a pagina (WorkerSocket).
import { ClientsManager, WorkerSocket } from "common/engine/core.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { Game } from "../../../../../server/src/game/game.ts";
import type { PlayWorkerInitMessage } from "./scene.ts";

let game:Game|undefined

self.addEventListener("message",async (e:MessageEvent)=>{
    const msg=e.data as PlayWorkerInitMessage
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
        group_size:options.group_size,
    })
    game.mainloop()

    clients.fake_connect_other_s(new WorkerSocket(self as unknown as Worker))
})
