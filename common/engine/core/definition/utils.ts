import { Random1 } from "../math/random.ts";

export interface FontStyleFull{
    font:string
    color:string
    size:string
    weight:string

    css:string
    class_name:string
}
export const null_font_style_full={
    font:"",
    color:"",
    size:"",
    weight:""
}
export type FontStyle=Partial<FontStyleFull>
export enum BackgroundELayerType{
    Tile,
    Static,
}
export type BackgroundELayer={
    css?:string
    class_name?:string
    top?:number
    bottom?:number
    left?:number
    right?:number
    childs?:BackgroundELayer[]
}&({
    type:BackgroundELayerType.Static
    size?:number
}|{
    type:BackgroundELayerType.Tile
    speed:number
    size?:number
})
export interface BackgroundETheme{
    class_name?:string
    css?:string
    accent?:string
    timescale?:number
}
export interface BackgroundEDef{
    theme:BackgroundETheme
    layers:BackgroundELayer[]
}

export enum CutsceneCommandType{
    Wait,
    WaitInput,
    SetFrame,
    SetDialog,
    SetContentText,
    SetBackground,

    SetSoundController,
    PlaySoundEffect,
}
export type CutsceneCommand={
    type:CutsceneCommandType.Wait,
    time:number
}|{
    type:CutsceneCommandType.WaitInput,
    action?:string
}|{
    type:CutsceneCommandType.SetFrame
    frame:string
}|({
    type:CutsceneCommandType.SetDialog
    text?:string // HTML Text
    text_ln?:string // HTML Text
    name?:string
    name_ln?:string
    typewriter_delay?:number
}&FontStyle)|{
    type:CutsceneCommandType.SetContentText
    style?:string|CutsceneTextStyle
    content?:{value?:string,value_ln?:string,style?:string|CutsceneTextStyle}[]
}|{
    type:CutsceneCommandType.SetBackground
    background?:BackgroundEDef
    timescale?:number
}|{
    type:CutsceneCommandType.SetSoundController
    controller:string
    source:string
    path?:string
    loop?:boolean
    start_at?:number
}|{
    type:CutsceneCommandType.PlaySoundEffect
    sfx:string
    options?:any
}|({
    type:string
})

export type CutsceneTextStyle={
    typewriter?:{
        delay:Random1
        sound?:string[]
        sound_options?:any
    }
}&FontStyle
export interface CutsceneTheme {
    class_name?: string
    css?: string
    variables?: Record<string, string>
    text?: FontStyle
    dialog?: {
        name?: FontStyle
        content?: FontStyle
        background?: string
        padding?: string
        border?: string
        radius?: string
        max_width?: string
    }
    text_styles?:Record<string,CutsceneTextStyle>
}