import { HistoryCommand } from "../config/history.ts";

export enum OnlineMessageType{
    Cutscene,
    CharacterSelector,
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
}