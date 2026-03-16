import { ReplayRecorder } from "../core.ts";

export class ServerReplayRecorder extends ReplayRecorder{
    async save_replay(path: string){
        const file = await Deno.open(path, { write: true, create: true, truncate: true })
        await file.write(this.export())
        file.close()
    }
}