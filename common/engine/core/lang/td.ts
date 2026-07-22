import { type Stream } from "../net/stream.ts"
export enum TDType{
    int,
    float,
    string,
    boolean,
    onu,
    object,
    array,
    options,
    advanced,
    any,
}
export type TDInt={
    type:TDType.int
    bytes:1|2|3|4
    unsigned?:boolean
}
export type TDFloat={
    type:TDType.float
    bytes:4|8
}
export type TDString={
    type:TDType.string
    len_bytes:1|2|3|4
}
export type TDBoolean={
    type:TDType.boolean
}
export type TDONU={
    type:TDType.onu
    content:TD
}
export type TDObjectProperty={
    name:any
    content:TD
}
export type TDObject={
    type:TDType.object
    content:TDObjectProperty[]
}
export type TDArray={
    type:TDType.array
    len_bytes:1|2|3|4
    content:TD
}
export type TDOptions={
    type:TDType.options
    options:TD[]
    get_option(val:any):number
}
export type TDAdvanced={
    type:TDType.advanced

    generate_encode(path:string):void
    generate_decode(path:string):void
    on_encode(val:any,stream:Stream):void
    on_decode(stream:Stream):any
}
export type TDAnyType={
    type:TDType.any
    bytes1?:number
    bytes2?:number
}
export type TD=TDInt|TDFloat|TDString|TDBoolean|TDONU|TDObject|TDArray|TDOptions|TDAdvanced|TDAnyType


export enum TDTokenType{
    EOF,

    Identifier,
    Number,

    LBrace,
    RBrace,

    LBracket,
    RBracket,

    Colon,
    Comma,

    Question,

    Pipe,
}
export interface TDToken{
    type:TDTokenType
    value?:string
    line:number
    column:number
}
export class TDLexer{
    private index=0
    private line=1
    private column=1

    constructor(readonly text:string){}

    private peek(offset=0){
        return this.text[this.index+offset]
    }
    private advance(){
        const c=this.text[this.index++]
        if(c=="\n"){
            this.line++
            this.column=1
        }else{
            this.column++
        }
        return c
    }
    private skipWhitespace(){
        while(true){
            const c=this.peek()
            if(c==" "||c=="\t"||c=="\r"||c=="\n"){
                this.advance()
                continue
            }
            if(c=="/"&&this.peek(1)=="/"){
                while(this.peek() && this.peek()!="\n"){
                    this.advance()
                }
                continue
            }
            break
        }
    }
    next():TDToken{
        this.skipWhitespace()
        const line=this.line
        const column=this.column
        const c=this.peek()
        if(!c){
            return{
                type:TDTokenType.EOF,
                line,
                column
            }
        }
        if(/[A-Za-z_]/.test(c)){
            let text=""
            while(/[A-Za-z0-9_]/.test(this.peek())){
                text+=this.advance()
            }
            return{
                type:TDTokenType.Identifier,
                value:text,
                line,
                column
            }
        }
        if(/[0-9]/.test(c)){
            let text=""
            while(/[0-9]/.test(this.peek())){
                text+=this.advance()
            }
            return {
                type:TDTokenType.Number,
                value:text,
                line,
                column
            }
        }
        this.advance()
        switch(c){
            case "{":
                return {type:TDTokenType.LBrace,line,column}
            case "}":
                return {type:TDTokenType.RBrace,line,column}
            case "[":
                return {type:TDTokenType.LBracket,line,column}
            case "]":
                return {type:TDTokenType.RBracket,line,column}
            case ":":
                return {type:TDTokenType.Colon,line,column}
            case ",":
                return {type:TDTokenType.Comma,line,column}
            case "?":
                return {type:TDTokenType.Question,line,column}
            case "|":
                return {type:TDTokenType.Pipe,line,column}
        }
        throw new Error(`Unexpected '${c}' (${line}:${column})`)
    }
    tokenize(){
        const tokens:TDToken[]=[]
        while(true){
            const t=this.next()
            tokens.push(t)
            if(t.type===TDTokenType.EOF){
                break
            }
        }
        return tokens
    }
}
export class TDParser{
    private index=0
    constructor(readonly ctx:TDContext,readonly tokens:TDToken[]){}

    peek(offset=0){
        return this.tokens[this.index+offset]
    }
    consume(){
        return this.tokens[this.index++]
    }
    expect(type:TDTokenType){
        const token=this.consume()
        if(token.type!==type){
            throw new Error(`Expected ${TDTokenType[type]}, got ${TDTokenType[token.type]}`)
        }
        return token
    }

    parse(current:Record<string,TD>={}):TD{
        return this.parseObject(current)
    }
    private parseObject(current:Record<string,TD>={}):TDObject{
        this.expect(TDTokenType.LBrace)
        const content:TDObjectProperty[]=[]
        while(this.peek().type!=TDTokenType.RBrace){
            const name=this.expect(TDTokenType.Identifier).value!
            this.expect(TDTokenType.Colon)
            const td=this.parseType(current)
            content.push({name,content:td})
            if(this.peek().type==TDTokenType.Comma){
                this.consume()
            }
        }
        this.expect(TDTokenType.RBrace)
        return {
            type:TDType.object,
            content
        }
    }
    private parseArray(content:TD):TD{
        this.expect(TDTokenType.LBracket)
        const len=parseInt(this.expect(TDTokenType.Number).value!)
        this.expect(TDTokenType.RBracket)
        if(len<1||len>4){
            throw new Error("Array length bytes must be 1..4")
        }
        return{
            type:TDType.array,
            len_bytes:len as 1|2|3|4,
            content
        }
    }
    private parseType(current: Record<string, TD> = {}): TD {
        let td: TD
        if (this.peek().type === TDTokenType.LBrace) {
            td = this.parseObject(current)
        } else {
            const name = this.expect(TDTokenType.Identifier).value!
            td = this.ctx.get(name, current)
        }
        while (true) {
            switch (this.peek().type) {
                case TDTokenType.Question:
                    this.consume()
                    td = {
                        type: TDType.onu,
                        content: td
                    }
                    break
                case TDTokenType.LBracket:
                    td = this.parseArray(td)
                    break
                default:
                    return td
            }
        }
    }
}
export class TDContext{
    readonly content:Record<string,TD>={}
    constructor(){
    }
    register(name:string,td:TD){
        this.content[name]=td
    }
    get(name:string,current:Record<string,TD>={}){
        const td=current[name]??this.content[name]
        if(!td){
            throw new Error(`Unknown TD '${name}'`)
        }
        return td
    }
    parse(text:string,current:Record<string,TD>={}){
        const lexer=new TDLexer(text)
        const parser=new TDParser(this,lexer.tokenize())
        return parser.parse(current)
    }
    stringify(td: TD,before="",current:Record<string,TD>={}): string {
        for(const name in current) {
            if(this.content[name]===td){
                return name
            }
        }
        for(const name in this.content) {
            if(this.content[name]===td){
                return name
            }
        }
        switch (td.type) {
            case TDType.int:
                return `${td.unsigned ? "u" : ""}int${td.bytes * 8}`
            case TDType.float:
                return `float${td.bytes * 8}`
            case TDType.string:
                return `string${td.len_bytes}`
            case TDType.boolean:
                return  "boolean"
            case TDType.any:
                return  "any"

            case TDType.onu:
                return  this.stringify(td.content,before,current)+"?"
            case TDType.object: {
                const out: string[] = []
                const old_before=before
                before=before+"    "
                out.push("{")
                for (const field of td.content) {
                    out.push(before+`${field.name}:${this.stringify(field.content,before,current)},`)
                }
                out.push(old_before+"}")
                return out.join("\n")
            }
            case TDType.array:
                return `${this.stringify(td.content,before,current)}[${td.len_bytes}]`
            case TDType.options:
                return td.options.map(x => this.stringify(x,before,current)).join("|")
            case TDType.advanced:
                return "<advanced>"
        }
    }
}

export const tdm=Object.freeze({
    extend(...objects:TDObject[]):TDObject{
        const ret:TDObject={
            type:TDType.object,
            content:[]
        }
        for(const o of objects){
            ret.content.push(...o.content)
        }
        return ret
    },

    generate_encode(td:TD,path:string):string{
        switch(td.type){
            case TDType.int:
                return td.unsigned?`stream.write_uint(${path},${td.bytes});`:`stream.write_int(${path},${td.bytes})`
            case TDType.float:
                return td.bytes===4?`stream.write_float32(${path});`:`stream.write_float64(${path});`
            case TDType.string:
                return `stream.write_string(${path},${td.len_bytes});`
            case TDType.object:{
                let code:string=""
                for(const f of td.content){
                    code+=this.generate_encode(f.content,`${path}["${f.name}"]`)
                }
                break;
            }
            case TDType.array:
                
        }
        return ""
    },

    int8:{type:TDType.int,bytes:1,unsigned:false} satisfies TD,
    int16:{type:TDType.int,bytes:2,unsigned:false} satisfies TD,
    int24:{type:TDType.int,bytes:3,unsigned:false} satisfies TD,
    int32:{type:TDType.int,bytes:4,unsigned:false} satisfies TD,

    uint8:{type:TDType.int,bytes:1,unsigned:true} satisfies TD,
    uint16:{type:TDType.int,bytes:2,unsigned:true} satisfies TD,
    uint24:{type:TDType.int,bytes:3,unsigned:true} satisfies TD,
    uint32:{type:TDType.int,bytes:4,unsigned:true} satisfies TD,

    float32:{type:TDType.float,bytes:4} satisfies TD,
    float64:{type:TDType.float,bytes:8} satisfies TD,

    string1:{type:TDType.string,len_bytes:1} satisfies TD,
    string2:{type:TDType.string,len_bytes:2} satisfies TD,
    string3:{type:TDType.string,len_bytes:3} satisfies TD,
    string4:{type:TDType.string,len_bytes:4} satisfies TD,

    boolean:{type:TDType.boolean} satisfies TD,

    any:{type:TDType.any} satisfies TD,

    // Onu Versions
    int8_onu:{type:TDType.onu,content:{type:TDType.int,bytes:1,unsigned:false}} satisfies TD,
    int16_onu:{type:TDType.onu,content:{type:TDType.int,bytes:2,unsigned:false}} satisfies TD,
    int24_onu:{type:TDType.onu,content:{type:TDType.int,bytes:3,unsigned:false}} satisfies TD,
    int32_onu:{type:TDType.onu,content:{type:TDType.int,bytes:4,unsigned:false}} satisfies TD,

    uint8_onu:{type:TDType.onu,content:{type:TDType.int,bytes:1,unsigned:true}} satisfies TD,
    uint16_onu:{type:TDType.onu,content:{type:TDType.int,bytes:2,unsigned:true}} satisfies TD,
    uint24_onu:{type:TDType.onu,content:{type:TDType.int,bytes:3,unsigned:true}} satisfies TD,
    uint32_onu:{type:TDType.onu,content:{type:TDType.int,bytes:4,unsigned:true}} satisfies TD,

    float32_onu:{type:TDType.onu,content:{type:TDType.float,bytes:4}} satisfies TD,
    float64_onu:{type:TDType.onu,content:{type:TDType.float,bytes:8}} satisfies TD,

    string1_onu:{type:TDType.onu,content:{type:TDType.string,len_bytes:1}} satisfies TD,
    string2_onu:{type:TDType.onu,content:{type:TDType.string,len_bytes:2}} satisfies TD,
    string3_onu:{type:TDType.onu,content:{type:TDType.string,len_bytes:3}} satisfies TD,
    string4_onu:{type:TDType.onu,content:{type:TDType.string,len_bytes:4}} satisfies TD,

    boolean_onu:{type:TDType.onu,content:{type:TDType.boolean}} satisfies TD,

    ctx:new TDContext(),
})

tdm.ctx.register("int8",tdm.int8)
tdm.ctx.register("int16",tdm.int16)
tdm.ctx.register("int24",tdm.int24)
tdm.ctx.register("int32",tdm.int32)

tdm.ctx.register("uint8",tdm.uint8)
tdm.ctx.register("uint16",tdm.uint16)
tdm.ctx.register("uint24",tdm.uint24)
tdm.ctx.register("uint32",tdm.uint32)

tdm.ctx.register("float32",tdm.float32)
tdm.ctx.register("float64",tdm.float64)

tdm.ctx.register("string1",tdm.string1)
tdm.ctx.register("string2",tdm.string2)
tdm.ctx.register("string3",tdm.string3)
tdm.ctx.register("string4",tdm.string4)

tdm.ctx.register("boolean",tdm.boolean)
tdm.ctx.register("any",tdm.any)

export const Vec2TD={
    type:TDType.object,
    content:[
        {name:"x",content:tdm.float32},
        {name:"y",content:tdm.float32}
    ]
} satisfies TD
export const Vec2TDONU:TDONU={type:TDType.onu,content:Vec2TD}
tdm.ctx.register("vec2",Vec2TD)
const Vec3TD={
    type:TDType.object,
    content:[
        {name:"x",content:tdm.float32},
        {name:"y",content:tdm.float32},
        {name:"z",content:tdm.float32},
    ]
} satisfies TD
export const Vec3TDONU:TDONU={type:TDType.onu,content:Vec2TD}
tdm.ctx.register("vec3",Vec3TD)
tdm.ctx.register("color",{
    type:TDType.object,
    content:[
        {name:"r",content:tdm.uint8},
        {name:"g",content:tdm.uint8},
        {name:"b",content:tdm.uint8},
        {name:"a",content:tdm.uint8},
    ]
})
export const FrameTransformTD:TDObject={
    type:TDType.object,
    content:[
        {name:"scale",content:tdm.float32_onu},
        {name:"scale2",content:Vec2TDONU},
        {name:"hotspot",content:Vec2TDONU},
        {name:"rotation",content:tdm.float32_onu},
        {name:"position",content:Vec2TDONU},
        {name:"visible",content:tdm.boolean_onu},
        {name:"zIndex",content:tdm.float32_onu},
        {name:"tint",content:tdm.uint32_onu},
        {name:"alpha",content:tdm.uint8_onu},
        {name:"layer",content:tdm.uint8_onu},
    ]
}
tdm.ctx.register("frame_transform",FrameTransformTD)
export const FrameTD:TDObject={
    type:TDType.object,
    content:[
        ...FrameTransformTD.content,
        {name:"image",content:tdm.string1_onu}
    ]
}
tdm.ctx.register("frame_def",FrameTD)