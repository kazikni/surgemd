import { HistoryCommand } from "../config/history.ts";

export enum OnlineMessageType{
    Cutscene,
    CharacterSelector,
    Load,
    SetLoad
}
export type OnlineMessageCharacter={
    name?:string
    icon?:string
    description?:string
}
export type OnlineMessage={
    type:OnlineMessageType.Cutscene
    cutscene:HistoryCommand[]
}|{
    type:OnlineMessageType.CharacterSelector
    characters:OnlineMessageCharacter[]
}|{
    type:OnlineMessageType.Load
    assets:Record<string,string>
}|{
    type:OnlineMessageType.SetLoad
    enabled:boolean
}