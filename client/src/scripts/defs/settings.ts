import { ColorM, rect, TranslationManager, v2 } from "common/engine/core.ts";
export const Vec2Input:SettingDef={
    type:"input_list",
    labels:["X","Y"],
    placeholders:["0","0"],
    make_value(b,d,e){
        return v2(parseFloat(b[0]??"0"),parseFloat(b[1]??"0"))
    },
    make_initial(b,def){
        return b===undefined?b:(Array.isArray(b)?b:[b.x.toString(),b.y.toString()])
    }
}
export const RectInput:SettingDef={
    type:"input_list",
    labels:["Min-X","Min-Y","Max-X","Max-Y"],
    placeholders:["0","0","0","0"],
    make_value(b,d,e){
        return rect(v2(parseFloat(b[0]??"0"),parseFloat(b[1]??"0")),v2(parseFloat(b[2]??"0"),parseFloat(b[3]??"0")))
    },
    make_initial(b,def){
        return b===undefined?b:(Array.isArray(b)?b:[b.min.x.toString(),b.min.y.toString(),b.max.x.toString(),b.max.y.toString()])
    }
}
export const RGBInput:SettingDef={
    type:"color",
    make_value(b,d,e){
        return ColorM.rgba2hex(b)
    },
    make_initial(b,def){
        typeof b==="object"?ColorM.rgba2hex(b):b
    }
}
export const RGBAInput:SettingDef={
    type:"input",
    placeholder:0xffffff.toString(),
    make_value(b,d,e){
        return ColorM.hex2number(b)
    },
    make_initial(b,def){
        typeof b==="string"?ColorM.hex2number(b):b
    }
}
export const FrameSettings:SettingDef[]=[
    {type:"input",can_disable:true,name:"Image",var:"image"},
    {...Vec2Input,can_disable:true,name:"Position",var:"position"},
    {type:"input",can_disable:true,name:"Rotation",var:"rotation"},
    {type:"input",can_disable:true,name:"Scale",var:"scale"},
    {...Vec2Input,can_disable:true,name:"Scale2",var:"scale2"},
    {type:"input",can_disable:true,name:"Tint",var:"tint"},
    {type:"range",min:0,max:255,can_disable:true,name:"Alpha",var:"Alpha"},
    {...Vec2Input,can_disable:true,name:"Hotspot",var:"hotspot"},
    {type:"input",can_disable:true,name:"zIndex",var:"zIndex"},
    {type:"input",can_disable:true,name:"Layer",var:"layer"},
    {type:"toggle",can_disable:true,name:"Visible",var:"visible"},
]
export type SettingOption={
    name:string
    value:string|number
}
export type SettingBase={
    var?:string

    name?:string
    tname?:string

    no_label?:boolean

    can_disable?:boolean
    disable_name?:string
    disable_tname?:string

    make_value?:(base:any,def:SettingDef,elem:HTMLElement)=>any
    make_initial?:(base:any,def:SettingDef)=>any
    on_set?:(val:any,elem?:HTMLElement|HTMLElement[])=>void
    on_enable?:(enabled:boolean)=>void
}
export type SettingDef=({
    type:"input"
    placeholder?:string
    initial?:string
    limit?:number
}|{
    type:"text"
    placeholder?:string
    rows?:number
    initial?:string
}|{
    type:"enum"
    options:SettingOption[]
}|{
    type:"toggle"
}|{
    type:"range"
    min:number
    max:number
    step?:number
}|{
    type:"color"
}|{
    type:"button"
    on_click?:(e:MouseEvent)=>void
}|{
    type:"input_list"

    labels?:string[]
    placeholders?:string[]
    initial?:string[]
}|

{
    type:"h1"|"h2"|"h3"|"h4"|"h5"
}|{
    type:"separator"
}|{
    type:"linebreak"
}|{
    type:"space"
    height?:number
}|{
    type:"group"
    content:SettingDef[]
})&SettingBase
export function build_setting_input(def: SettingDef,translation: TranslationManager,initial?: any,callbacks?:{on_change?: (val: any) => void,on_focus?:(e:FocusEvent)=>void,on_blur?:(e:FocusEvent)=>void},parent?: HTMLElement): HTMLElement {
    const tr=()=>def.tname?translation.get(def.tname, undefined, def.name):def.name??""
    switch(def.type){
        case "linebreak":{
            return document.createElement("br");
        }
        case "separator":{
            return document.createElement("hr");
        }
        case "space":{
            const div=document.createElement("div");
            div.style.height=`${def.height??8}px`;
            return div;
        }

        case "h1":
        case "h2":
        case "h3":
        case "h4":
        case "h5":{
            const h=document.createElement(def.type);
            h.className="span-text-base";
            h.textContent=tr();
            return h;
        }
        case "button":{
            const b=document.createElement("button");
            b.className="btn-green";
            b.textContent=tr();
            b.onclick=e=>def.on_click?.(e);
            return b;
        }
        case "group":{
            const group=document.createElement("div");
            group.className="settings-group";
            if(def.name){
                const title=document.createElement("h3");
                title.className="span-text-base";
                title.textContent=tr();
                group.appendChild(title);
            }
            for(const child of def.content){
                group.appendChild(build_setting_input(child,translation,group,callbacks));
            }
            return group;
        }
    }
    if(def.make_initial)initial=def.make_initial(initial,def)
    const row=document.createElement("div");
    row.className="settings-row";
    if(!def.no_label){
        const label=document.createElement("span");
        label.className="span-text";
        label.textContent=tr();
        row.appendChild(label);
    }
    let input:HTMLElement|undefined
    let last_value:any=initial
    switch(def.type){
        case "input":{
            const e=document.createElement("input")
            e.className="text-input-green"
            e.placeholder=def.placeholder??""
            e.value=initial??def.initial??""
            if(def.limit)e.maxLength=def.limit
            e.onchange=()=>{
                const v=def.make_value?def.make_value(e.value,def,e):e.value
                def.on_set?.(v,e)
                callbacks?.on_change?.(v)
                last_value=v
            }
            e.addEventListener("focus",(e)=>callbacks?.on_focus?.(e))
            e.addEventListener("blur",(e)=>callbacks?.on_blur?.(e))
            input=e
            break
        }
        case "text":{
            const e=document.createElement("textarea")
            e.className="text-input-green"
            e.placeholder=def.placeholder??""
            e.rows=def.rows??4
            e.value=initial??def.initial??""
            e.onchange=()=>{
                const v=def.make_value?def.make_value(e.value,def,e):e.value
                def.on_set?.(v,e)
                callbacks?.on_change?.(v)
                last_value=v
            }
            e.addEventListener("focus",(e)=>callbacks?.on_focus?.(e))
            e.addEventListener("blur",(e)=>callbacks?.on_blur?.(e))
            input=e
            break
        }
        case "toggle":{
            const e=document.createElement("input")
            e.type="checkbox"
            e.className="checkbox-blue"
            e.checked=!!initial
            e.onchange=()=>{
                const v=def.make_value?def.make_value(e.checked,def,e):e.checked
                def.on_set?.(v,e)
                callbacks?.on_change?.(v)
                last_value=v
            }
            input=e
            break
        }
        case "enum":{
            const e=document.createElement("select")
            e.className="select-blue"
            for(const opt of def.options){
                const o=document.createElement("option")
                o.value=String(opt.value)
                o.textContent=opt.name
                e.appendChild(o)
            }
            if(initial!==undefined){
                e.value=String(initial)
            }
            e.onchange=()=>{
                const v=def.make_value?def.make_value(e.value,def,e):e.value
                def.on_set?.(v,e)
                callbacks?.on_change?.(v)
                last_value=v
            }
            input=e
            break
        }
        case "range":{
            const wrap=document.createElement("div")

            const slider=document.createElement("input")
            slider.type="range"
            slider.className="slider-blue"
            slider.min=String(def.min)
            slider.max=String(def.max)
            slider.step=String(def.step??1)
            slider.value=String(initial??def.min)

            const value=document.createElement("span")
            value.className="span-text"
            value.textContent=slider.value

            slider.oninput=()=>{
                const v=def.make_value?def.make_value(Number(slider.value),def,slider):Number(slider.value)
                value.textContent=v
                def.on_set?.(v,slider)
                callbacks?.on_change?.(v)
                last_value=v
            }

            wrap.append(slider,value)

            input=wrap
            break
        }
        case "color":{
            const e=document.createElement("input")
            e.type="color"
            e.className="input-color"
            e.value=initial??"#ffffff"
            e.oninput=()=>{
                const value=def.make_value?def.make_value(e.value,def,e):e.value
                def.on_set?.(value,e)
                callbacks?.on_change?.(value)
                last_value=value
            }
            input=e
            break
        }
        case "input_list":{
            if(!initial)initial=def.initial
            const wrap=document.createElement("div")
            wrap.style.display="flex"
            wrap.style.gap="8px"
            wrap.style.alignItems="center"
            const inputs:HTMLInputElement[]=[]
            const update=()=>{
                const values=inputs.map(i=>i.value)
                const value=def.make_value?def.make_value(values,def,wrap):values
                def.on_set?.(values,inputs)
                callbacks?.on_change?.(value)
            }
            const count=Math.max(def.labels?.length??0,def.placeholders?.length??0,Array.isArray(initial)?initial.length:0,1)
            for(let i=0;i<count;i++){
                const container=document.createElement("div")
                container.style.display="flex"
                container.style.alignItems="center"
                container.style.gap="4px"
                if(def.labels?.[i]){
                    const label=document.createElement("span")
                    label.className="span-text"
                    label.textContent=def.labels[i]
                    container.appendChild(label)
                }
                const input=document.createElement("input")
                input.className="text-input-green"
                if(def.placeholders?.[i]!=undefined){
                    input.placeholder=String(def.placeholders[i])
                }
                if(Array.isArray(initial)){
                    input.value=String(initial[i]??"")
                }
                input.onchange=update
                input.oninput=update
                input.addEventListener("focus",(e)=>callbacks?.on_focus?.(e))
                input.addEventListener("blur",(e)=>callbacks?.on_blur?.(e))
                inputs.push(input)
                container.appendChild(input)
                wrap.appendChild(container)
            }
            input=wrap
            break
        }
    }

    if(input){
        if(def.can_disable){
            const wrap=document.createElement("div");
            wrap.style.display="flex";
            wrap.style.alignItems="center";
            wrap.style.gap="6px";

            const enable=document.createElement("input");
            enable.type="checkbox";
            enable.checked=initial!==undefined;

            const update=()=>{
                ;(input as HTMLElement).style.opacity=enable.checked?"":"0.5";
                const controls=input!.querySelectorAll("input,textarea,select,button");
                if(controls.length===0){
                    (input as HTMLInputElement).toggleAttribute?.("disabled",!enable.checked);
                }else{
                    controls.forEach(c=>{
                        if(c!==enable)(c as HTMLInputElement).disabled=!enable.checked;
                    });
                }

                def.on_enable?.(enable.checked);
                if(enable.checked){
                    callbacks?.on_change?.(last_value);
                    def.on_set?.(last_value,input)
                }else{
                    callbacks?.on_change?.(undefined);
                    def.on_set?.(undefined,input)
                }
            };
            enable.onchange=update
            wrap.appendChild(enable)
            if(def.disable_name||def.disable_tname){
                const txt=document.createElement("span");
                txt.className="span-text";
                txt.textContent=def.disable_tname
                    ? translation.get(def.disable_tname,undefined,def.disable_name)
                    : def.disable_name??"";
                wrap.appendChild(txt);
            }
            wrap.appendChild(input);
            update();
            input=wrap;
        }
        ;(input as any).setting_parent=parent
        ;(input as any).setting_def=def
    }
    row.appendChild(input!)
    return row
}