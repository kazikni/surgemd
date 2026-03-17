import { LevelDefinition } from "common/scripts/config/level_definition.ts";

export type PlayArgs={
    type: "online"
    mode:string
    team_size:number
}|{
    type: "campaign"
    level:LevelDefinition
    dificulty:number
}|{
    type: "join"
    url:string
    password:string
    attempts?:number
    delay?:number
}