import { loadConfigDeno } from "../../configs/config.ts";
import { ApiServer } from "./server.ts";


if (import.meta.main) {
    const config=loadConfigDeno("../config.json")
    await Deno.mkdir("database/replays",{
        recursive:true,
        mode:0o700
    })
    const api=new ApiServer(config)
    api.run()
}