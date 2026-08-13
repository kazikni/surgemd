import { BackgroundEDef } from "./background_effect.ts";

export enum HistoryCommandType{
    Wait,
    WaitInput,
    SetFrame,
    SetDialog,
    SetMusic,
    SetAmbient,
    PlaySoundEffect,
    ShowGameOverMessage,
    ShowInitialScreen,
    SetBackground
}
export type HistoryCommand={
    type:HistoryCommandType.Wait,
    time:number
}|{
    type:HistoryCommandType.WaitInput,
}|{
    type:HistoryCommandType.SetFrame
    frame:string
}|{
    type:HistoryCommandType.SetDialog
    text?:string // HTML Text
    text_ln?:string // HTML Text
    name?:string
    name_ln?:string
    color?:string
    typewriter_delay?:number
}|{
    type:HistoryCommandType.SetMusic
    path?:string
    music?:string
    loop?:boolean
    start_at?:number
}|{
    type:HistoryCommandType.SetAmbient
    ambient:string
    loop?:boolean
    start_at?:number
}|{
    type:HistoryCommandType.PlaySoundEffect
    sfx:string
    category?:string
    options?:any
}|{
    type:HistoryCommandType.ShowGameOverMessage
    text:string[]
    time_per_message?:number
    opacity_anim?:number
}|{
    type:HistoryCommandType.ShowInitialScreen
    name:string
    location:string
    date?:string
    description?:string
}|{
    type:HistoryCommandType.SetBackground
    background?:BackgroundEDef
    timescale?:number
}