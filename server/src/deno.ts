import { DenoClientsManager, DenoFileManager, DenoServer } from "common/engine/deno.ts";
import {main} from "./cli.ts"
import { createCanvas } from "npm:@napi-rs/canvas";
if (import.meta.main) {
    await main(Deno.args,import.meta.filename?.endsWith(".ts")?"../deno/worker.ts":"../deno/worker.js",new DenoFileManager(),createCanvas,DenoServer,DenoClientsManager)
}

//deno run -A ./server/src/deno.ts kspr extract client/dist/assets/kspr/main/sheets/sheet_low.kspr
//deno run -A ./server/src/deno.ts game map compile common/scripts/definitions/maps/tundra.ts
//deno run -A ./server/src/deno.ts audio compile client/public/assets/sounds/game/main