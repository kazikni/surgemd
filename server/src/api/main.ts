import { ConfigType } from "common/scripts/config/config.ts";
import { ApiServer } from "./server.ts";
import { parseJSONC } from "common/engine/core.ts";


if (import.meta.main) {
    await Deno.mkdir("database/replays",{
        recursive:true,
        mode:0o700
    })

    const txt = Deno.readTextFileSync("../config.jsonc")
    const config:ConfigType=parseJSONC(txt)
    const api=new ApiServer(config.api)
    api.run()
}