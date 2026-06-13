import { type FileHandle } from "common/engine/core.ts";

export type PlayArgs={
    type: "online"
    mode:string
    team_size:number
}|{
    type: "campaign"
    path:string
}|{
    type: "join"
    url:string
    password:string
    attempts?:number
    delay?:number
}|{
    type: "replay"
    handle:FileHandle
}