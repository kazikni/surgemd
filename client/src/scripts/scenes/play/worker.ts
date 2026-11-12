import { ClientsManager, WorkerSocket } from "common/engine/core.ts";
import { make_packet_manager } from "common/scripts/net/packet_manager.ts";
import { Game } from "../../../../../server/src/game/game.ts";
import type { WorkerMessage } from "./scene.ts";

let game:Game|undefined
const clients=new ClientsManager(make_packet_manager())
self.addEventListener("message",async (e:MessageEvent)=>{
    const msg=e.data as WorkerMessage
    if(!msg)return
    switch(msg.type){
        case "init":{
            if(game)return
            const options=msg.options??{}
            game=new Game({
                tps:options.tps??100,
                ntps:options.ntps??32,
            },clients)
            await game.init({
                mode:options.mode??"normal",
                settings:options.settings??{},
            })
            clients.fake_connect_other_s(new WorkerSocket(self as unknown as Worker))
            game.mainloop()
            break
        }
        case "set_state":{
            if(msg.pause!==undefined&&game){
                if(msg.pause){
                    game.clock.time_scale=0
                }else{
                    game.clock.time_scale=1
                }
            }
            break
        }
    }
})
