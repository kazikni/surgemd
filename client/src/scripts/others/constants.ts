import { type FileHandle } from "common/engine/core.ts";

export type PlayArgs={
    type: "online"
    mode:number
    token?:string
}|{
    type: "campaign"
    path:string
    start_with_intro:boolean
}|{
    type: "join"
    url:string
    password:string
    attempts?:number
    delay?:number
}|{
    type: "replay"
    handle:FileHandle
}|{
    type: "editor"
}