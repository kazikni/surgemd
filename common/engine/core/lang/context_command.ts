import { type Model2D } from "../definition/models.ts";
import { ColorM, type Color } from "../math/color.ts";
import { v2, type Vec2 } from "../math/vec2.ts";

export enum RenderCMDType {
    SetStyle,
    FillModel,
    StrokeModel,
    Fill,
    Stroke,
    Rect,
    Circle,
    Grid,
    BeginPath,
    MoveTo,
    LineTo,
    ClosePath,
    Save,
    Restore,
    Translate,
    Rotate,
    Scale
}

export type RenderCMD_SetStyle = {
    type: RenderCMDType.SetStyle
    fill_color?: Color
    stroke_color?: Color
    stroke_width?: number
}

export type RenderCMD_FillModel = {
    type: RenderCMDType.FillModel
    model: Model2D
}

export type RenderCMD_StrokeModel = {
    type: RenderCMDType.StrokeModel
    model: Model2D
}

export type RenderCMD_Transform = {
    type: RenderCMDType.Translate
    x: number
    y: number
} | {
    type: RenderCMDType.Rotate
    rad: number
} | {
    type: RenderCMDType.Scale
    x: number
    y: number
}

export type RenderCMD =
    | RenderCMD_SetStyle
    | RenderCMD_FillModel
    | RenderCMD_StrokeModel
    | RenderCMD_Transform
    | { type: RenderCMDType.Rect,min:Vec2,max:Vec2 }
    | { type: RenderCMDType.Circle,center:Vec2,radius:number,segments?:number }
    | { type: RenderCMDType.Grid,begin:Vec2,end:Vec2,size:number,offset?:Vec2 }
    | { type: RenderCMDType.MoveTo; position: Vec2 }
    | { type: RenderCMDType.LineTo; position: Vec2 }
    | { type: RenderCMDType.BeginPath|RenderCMDType.ClosePath|RenderCMDType.Save|RenderCMDType.Restore|RenderCMDType.Fill|RenderCMDType.Stroke }

export type SMRF={
    commands:RenderCMD[]
}

export const smrf={
    parse(txt:string):SMRF{
        const lines=txt.replaceAll("\r","").split(/[;\n]+/)
        const ret:SMRF={commands:[]}

        const num=(tokens:string[],i:number)=>{
            const n=Number(tokens[i])
            if(tokens[i]===undefined||!Number.isFinite(n))throw new Error(`Invalid number: ${tokens[i]}`)
            return n
        }

        for(const line of lines){
            const tokens=line.match(/"[^"]*"|'[^']*'|\S+/g)?.map(s=>s.replace(/^["']|["']$/g,""))??[]
            if(!tokens.length)continue

            const cmd=tokens[0].toLowerCase()
            const n=(i:number)=>num(tokens,i)
            const vec=(i:number)=>v2(n(i),n(i+1))

            switch(cmd){
                case "rect":
                case "mr":
                    ret.commands.push({
                        type:RenderCMDType.Rect,
                        min:vec(1),
                        max:vec(3)
                    })
                    break
                case "grid":
                    ret.commands.push({
                        type:RenderCMDType.Grid,
                        size:n(1),
                        begin:vec(2),
                        end:vec(4)
                    })
                    break

                case "circle":
                case "mc":
                    ret.commands.push({
                        type:RenderCMDType.Circle,
                        center:vec(1),
                        radius:n(3),
                        segments:tokens.length>4?n(4):undefined
                    })
                    break

                case "style":
                case "setstyle": 
                case "ss": {
                    const style:RenderCMD_SetStyle={
                        type:RenderCMDType.SetStyle
                    }

                    for(let i=1;i<tokens.length;i++){
                        const key=tokens[i].toLowerCase()
                        switch(key){
                            case "fill":
                            case "fill_color":
                            case "f":
                                style.fill_color=ColorM.hex(tokens[++i])
                                break
                            case "stroke":
                            case "stroke_color":
                            case "s":
                                style.stroke_color=ColorM.hex(tokens[++i])
                                break
                            case "stroke_width":
                            case "line_width":
                            case "sw":
                            case "lw":
                                style.stroke_width=n(++i)
                        }
                    }

                    ret.commands.push(style)
                    break
                }

                /*case "fillmodel":
                    ret.commands.push({
                        type:RenderCMDType.FillModel,
                        model:model2d.
                    })
                    break

                case "strokemodel":
                    ret.commands.push({
                        type:RenderCMDType.StrokeModel,
                        model:model2d[tokens[1]]
                    })
                    break*/

                case "beginpath":
                case "bp":
                    ret.commands.push({type:RenderCMDType.BeginPath})
                    break

                case "fill":
                case "f":
                    ret.commands.push({type:RenderCMDType.Fill})
                    break

                case "stroke":
                case "s":
                    ret.commands.push({type:RenderCMDType.Stroke})
                    break

                case "moveto":
                case "mt":
                    ret.commands.push({
                        type:RenderCMDType.MoveTo,
                        position:vec(1)
                    })
                    break

                case "lineto":
                case "lt":
                    ret.commands.push({
                        type:RenderCMDType.LineTo,
                        position:vec(1)
                    })
                    break

                case "closepath":
                case "cp":
                    ret.commands.push({type:RenderCMDType.ClosePath})
                    break

                case "save":
                    ret.commands.push({type:RenderCMDType.Save})
                    break

                case "restore":
                    ret.commands.push({type:RenderCMDType.Restore})
                    break

                case "translate":
                case "tr":
                    ret.commands.push({
                        type:RenderCMDType.Translate,
                        x:n(1),
                        y:n(2)
                    })
                    break

                case "rotate":
                case "ro":
                    ret.commands.push({
                        type:RenderCMDType.Rotate,
                        rad:n(1)
                    })
                    break

                case "scale":
                case "sc":
                    ret.commands.push({
                        type:RenderCMDType.Scale,
                        x:n(1),
                        y:tokens.length>2?n(2):n(1)
                    })
                    break

                default:
                    throw new Error(`Unknown render command: ${tokens[0]}`)
            }
        }

        return ret
    }
}
