import { TranslationManager } from "../../core/definition/definitions.ts";
import { CutsceneCommand, CutsceneCommandType, CutsceneTextStyle, CutsceneTheme, FontStyle } from "../../core/definition/utils.ts";
import { random } from "../../core/math/random.ts";
import { ResourcesManager } from "../resources/resources.ts";
import { AudioEngine, SoundController } from "../resources/sounds.ts";
import { BackgroundManager } from "./background.ts";
import { InputManager } from "./keys.ts";
import { ApplyFontStyle, HideElement, ImageBuffer, ShowElement, typewriter } from "./utils.ts";
export type CustomCutsceneCommand=(cutscene:CutsceneManager,command:any)=>void
export class CutsceneManager {
    root!: HTMLDivElement

    container!: HTMLDivElement
    frame!: HTMLImageElement

    dialog!: HTMLDivElement
    dialogIndicator!: HTMLDivElement

    content!: HTMLDivElement

    background!: BackgroundManager
    historyBuffer = new ImageBuffer()

    theme?:CutsceneTheme
    themes:Record<string,CutsceneTheme>={}

    default_theme?:CutsceneTheme

    commands: CutsceneCommand[] = []
    text_styles:Record<string,CutsceneTextStyle>={}

    controllers:Record<string,SoundController>={}
    custom_commands:Record<string|number,CustomCutsceneCommand>={}

    timeScale = 1
    playing = false

    default_action="next"

    set_loading_current?:(val:string)=>void

    constructor(public resources: ResourcesManager,public sounds: AudioEngine,public input: InputManager,public translation: TranslationManager) {
        this.resources=resources
        this.sounds=sounds
        this.input=input
        this.translation=translation
    }
    initialize(root:HTMLDivElement) {
        this.root = root
        this.root.innerHTML = `
<div class="cutscene-overlay">
    <div class="cutscene-background"></div>
    <img class="cutscene-frame" draggable="false">
    <div class="cutscene-dialog"></div>
    <div class="cutscene-dialog-indicator">▼</div>
    <div class="cutscene-content"></div>
</div>`

        this.container=this.root.querySelector(".cutscene-overlay")as HTMLDivElement

        this.frame=this.root.querySelector(".cutscene-frame")as HTMLImageElement
        this.dialog=this.root.querySelector(".cutscene-dialog")as HTMLDivElement
        this.dialogIndicator=this.root.querySelector(".cutscene-dialog-indicator")as HTMLDivElement
        this.content=this.root.querySelector(".cutscene-content")as HTMLDivElement

        this.background=new BackgroundManager()
        this.background.initialize(this.root.querySelector(".cutscene-background") as HTMLDivElement)

        this.reset()
    }
    set_theme(theme:CutsceneTheme|string|undefined){
        let def: CutsceneTheme
        if(!theme){
            def=this.default_theme??{}
        }else if(typeof theme === "string"){
            def=this.themes[theme]??this.default_theme??{}
        }else{
            def=theme
        }

        this.theme=def
        this.text_styles=def.text_styles??{}
        this.container.className="cutscene-overlay "+(def.class_name??"")

        const variables:Record<string,string>={
            "--cutscene-dialog-background":def.dialog?.background??"",
            "--cutscene-dialog-max-width":def.dialog?.max_width??"30%",
            "--cutscene-dialog-padding":def.dialog?.padding??"",
            "--cutscene-dialog-radius":def.dialog?.radius??"",
            "--cutscene-dialog-border":def.dialog?.border??"",
        }
        this.apply_font_style(variables,"cutscene-text",def.text)
        this.apply_font_style(variables,"cutscene-dialog-content",def.dialog?.content)
        this.apply_font_style(variables,"cutscene-dialog-name",def.dialog?.name)
        if(def.variables)Object.assign(variables,def.variables)
        for(const [key, value] of Object.entries(variables)){
            this.container.style.setProperty(key,value)
        }

        this.root.style.cssText=def.css??""
    }
    cutscene_text_style(style:(CutsceneTextStyle|string|undefined)[]):CutsceneTextStyle{
        const ret:CutsceneTextStyle={}
        for(let s of style){
            if(typeof s==="string")s=this.text_styles[s]
            if(!s)s={}

            if(s.color!==undefined)ret.color=s.color
            if(s.size!==undefined)ret.size=s.size
            if(s.weight!==undefined)ret.size=s.weight
            if(s.font!==undefined)ret.font=s.font
            if(s.class_name!==undefined)ret.class_name+=s.class_name
            if(s.css!==undefined)ret.css+=s.css
            if(s.typewriter!==undefined)ret.typewriter=s.typewriter
        }
        return ret
    }
    async preload_frames(commands: CutsceneCommand[],max = 6){
        let count = 0
        for (const command of commands) {
            if(command.type!==CutsceneCommandType.SetFrame){
                continue
            }
            this.set_loading_current?.(command.frame)
            await this.historyBuffer.load(command.frame)
            count++
            if(count>=max){
                break
            }
        }
    }
    async play(commands: CutsceneCommand[] = this.commands,timeScale = 1):Promise<void>{
        if(!commands.length||this.playing)return
        this.background.set_def(undefined)
        this.set_theme(this.default_theme)

        this.playing=true
        this.timeScale=timeScale
        this.reset()
        ShowElement(this.root)
        for(let index=0;index<commands.length;index++) {
            const command=commands[index]
            await this.execute_command(command,commands,index)
        }
        this.playing = false
        HideElement(this.root)
    }
    private async execute_command(command:CutsceneCommand,commands:CutsceneCommand[],index:number){
        const custom_command=this.custom_commands[command.type]
        if(custom_command){
            custom_command(this,command)
            return
        }
        switch(command.type){
            case CutsceneCommandType.Wait:{
                await this.wait(command.time)
                this.dialog.style.opacity="0"
                break
            }
            case CutsceneCommandType.WaitInput:{
                ShowElement(this.dialogIndicator)
                await this.input.wait_for_action(command.action??this.default_action)
                HideElement(this.dialogIndicator)
                this.dialog.style.opacity="0"
                break
            }
            case CutsceneCommandType.SetFrame:{
                for(let i = 1; i <= 3; i++){
                    const next=commands[index + i]
                    if(next?.type===CutsceneCommandType.SetFrame){
                        this.historyBuffer.preload(next.frame)
                    }
                }
                this.frame.style.opacity="0"
                await this.wait(0.4)
                const image=await this.historyBuffer.load(command.frame)
                this.frame.src=image.src
                requestAnimationFrame(()=>{
                    this.frame.style.opacity="1"
                })

                break
            }
            case CutsceneCommandType.SetDialog:{
                this.clear_content()
                const text=this.translation.get(command.text_ln??"",{},command.text)
                if(!text)break
                this.dialog.style.opacity="1"

                const name=this.translation.get(command.name_ln??"",{},command.name)
                this.dialog.innerHTML = `${name?`<p class="name">${name}</p>`:""}<p class="content"></p>`
                const content=this.dialog.querySelector(".content")as HTMLSpanElement

                await typewriter(content,text,command.typewriter_delay??20)
                content.style.color=command.color ?? "white"

                break
            }
            case CutsceneCommandType.SetContentText: {
                this.clear_content()
                this.content.style.opacity="1"
                this.content.className="cutscene-content cutscene-content-centered"
                for(const v of command.content ?? []) {
                    if(!v)continue
                    await this.show_text(this.content,this.translation.get(v.value_ln ?? "",{},v.value),this.cutscene_text_style([v.style]))
                }
                break
            }
            case CutsceneCommandType.SetSoundController:{
                const sound=command.path?await this.resources.load_sound(command.source,{src:command.path},this.set_loading_current):this.resources.get_sound(command.source)
                this.controllers[command.controller].set(sound,{
                    loop:command.loop!==undefined?command.loop:true,
                    offset:command.start_at
                })
                break
            }
            case CutsceneCommandType.PlaySoundEffect:{
                const sound=this.resources.get_sound(command.sfx)
                this.sounds.play(sound,command.options ?? {})
                break
            }
            case CutsceneCommandType.SetBackground:{
                if(command.background){
                    this.background.set_def(command.background,(command.timescale??1)*(command.background?.theme.timescale??1)*this.timeScale)
                    await this.background.show()
                }else{
                    await this.background.hide()
                }
                break
            }
        }
    }
    async show_text(parent:HTMLDivElement,text:string,style:CutsceneTextStyle):Promise<HTMLDivElement|undefined>{
        const elem=document.createElement("div")
        ApplyFontStyle(elem,style)
        parent.appendChild(elem)
        if(style.typewriter){
            await typewriter(elem,text,style.typewriter.delay,()=>{
                if(style.typewriter?.sound)this.sounds.play(this.resources.get_sound(random.choose(style.typewriter.sound)),style.typewriter.sound_options??{})
            })
        }else{
            elem.innerHTML=text
        }
        return elem
    }
    clear_content(){
        this.dialog.innerHTML=""
        this.content.innerHTML=""
        this.frame.src=""
        this.dialog.style.opacity="0"
        this.content.style.opacity="0"
        this.frame.style.opacity="0"
    }
    private reset(){
        this.clear_content()
        HideElement(this.dialogIndicator)
        HideElement(this.root)
        this.playing = false
    }
    wait(seconds: number):Promise<void>{
        return new Promise<void>(resolve=>setTimeout(()=>{
            resolve()
        },seconds*1000))
    }

    private apply_font_style(variables: Record<string, string>,prefix: string,style?: FontStyle){
        if(!style)return
        if(style.font!==undefined)variables[`--${prefix}-font`]=style.font
        if(style.color!==undefined)variables[`--${prefix}-color`]=style.color
        if(style.size !== undefined)variables[`--${prefix}-size`]=style.size
        if(style.weight !== undefined)variables[`--${prefix}-weight`]=style.weight
    }
}