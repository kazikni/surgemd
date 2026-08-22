export type CommandArgParser<T, CTX> = (ctx: CTX, raw: string) => T
export type ConsoleContext={
    console: GameConsole<any>
}
export type ConsoleCommandContext<CTX> = {
    tokens: string[]
    args: Record<string,any>
}&CTX
type CommandArg = {
    type: string
    default?: any
}
export type CommandDef<CTX=ConsoleContext> = {
    name: string
    flags?: Record<string,CommandArg>
    description?: string
    flags_orden?: string[]
    childrens?:CommandDef<CTX>[]
    execute?: (ctx: ConsoleCommandContext<CTX>) => void|Promise<any>
}

export const console_string_parser:CommandArgParser<string, any>=(_, raw) => {
    if (typeof raw !== "string") {
        throw new Error("Invalid string")
    }
    return raw.trim()
}
export const console_number_parser:CommandArgParser<number, any>=(_, raw) => {
    const n = Number(raw)

    if (Number.isNaN(n)) {
        throw new Error(`Invalid number: "${raw}"`)
    }

    if (!Number.isFinite(n)) {
        throw new Error(`Number is not finite: "${raw}"`)
    }

    return n
}
export const console_float_parser:CommandArgParser<number, any>=(_, raw) => {
    const n = Number(raw)
    if (Number.isNaN(n)) {
        throw new Error(`Invalid float: "${raw}"`)
    }
    if (!Number.isFinite(n)) {
        throw new Error(`Float is not finite: "${raw}"`)
    }
    return n
}
export const console_int_parser: CommandArgParser<number, any> = (_, raw) => {
    const n = Number(raw)
    if (Number.isNaN(n)) {
        throw new Error(`Invalid integer: "${raw}"`)
    }
    if (!Number.isFinite(n)) {
        throw new Error(`Integer is not finite: "${raw}"`)
    }
    if (!Number.isInteger(n)) {
        throw new Error(`Expected integer, got: "${raw}"`)
    }
    return n
}
export const console_boolean_parser: CommandArgParser<boolean, any> = (_, raw) => {
    return raw==="true"?true:false
}
export const console_json_parser: CommandArgParser<any, any> = (_, raw) => {
    return JSON.parse(raw)
}

export class GameConsole<CTX extends ConsoleContext = ConsoleContext> {
    commands = new Map<string, CommandDef<CTX>>()
    types: Record<string, CommandArgParser<any, CTX>> = {}
    ctx: CTX
    constructor(ctx: Partial<CTX>) {
        //@ts-ignore
        this.ctx = {
            ...ctx,
            console: this
        }
        this.register_type("string",console_string_parser)
        this.register_type("number",console_number_parser)
        this.register_type("int",console_int_parser)
        this.register_type("float",console_float_parser)
        this.register_type("boolean",console_boolean_parser)
        this.register_type("json",console_json_parser)
    }
    /* ================= REGISTER ================= */
    register(cmd: CommandDef<CTX>) {
        this.commands.set(cmd.name.toLowerCase(), cmd)
    }
    register_type<T>(name: string, parser: CommandArgParser<T, CTX>) {
        this.types[name] = parser
    }
    /* ================= RUN ================= */
    async run(tokens: string[]) {
        if (!tokens.length) return
        const name = tokens.shift()!.toLowerCase()
        const cmd = this.commands.get(name)
        if (!cmd) {
            this.error(`Unknown command: ${name}`)
            return
        }
        return await this.run_command(tokens, cmd)
    }
    private async run_command(tokens: string[],cmd: CommandDef<ConsoleCommandContext<CTX>>):Promise<any>{
        if (tokens.length&&cmd.childrens) {
            const child = cmd.childrens.find((v)=>v.name===tokens[0])
            if(child){
                tokens.shift()
                return await this.run_command(tokens, child as CommandDef<ConsoleCommandContext<CTX>>)
            }
        }
        const ctx = this.parse(tokens, cmd)
        if(cmd.execute){
            const ret=cmd.execute(ctx)
            if(ret instanceof Promise)return await ret
            return ret
        }
        return
    }
    /* ================= TOKENIZER ================= */
    tokenize(input: string): string[] {
        return input.match(/"[^"]*"|\S+/g)?.map(s => s.replace(/"/g, "")) ?? []
    }
    /* ================= ARG PARSER ================= */
    parse(tokens: string[], cmd: CommandDef<ConsoleCommandContext<CTX>>): ConsoleCommandContext<CTX> {
        const ctx:ConsoleCommandContext<CTX>={
            ...this.ctx,
            tokens:[...tokens],
            args:{}
        }
        if(cmd.flags){
            for(let i=0;i<ctx.tokens.length;i++){
                if(ctx.tokens[i].startsWith("--")){
                    const name=ctx.tokens[i].substring(2)
                    ctx.tokens.splice(i,1)
                    if(!tokens[i]){
                        console.error("Invalid Flag Value")
                        continue
                    }
                    if(!cmd.flags[name]){
                        this.error("Unknown Flag: ",name)
                        continue
                    }
                    if(!this.types[cmd.flags[name].type]){
                        this.error("Unknown Arg Type: ",cmd.flags[name].type)
                        continue
                    }
                    ctx.args[name]=this.types[cmd.flags[name].type](this.ctx,ctx.tokens[i])
                    ctx.tokens.splice(i,1)
                    i--
                }
            }
            for(const f in cmd.flags){
                if(ctx.args[f]===undefined){
                    ctx.args[f]=cmd.flags[f].default
                }
            }
            for(const f of cmd.flags_orden??[]){
                const raw = ctx.tokens[0]
                if(raw){
                    if(!this.types[cmd.flags[f].type]){
                        this.error("Unknown Arg Type: ", f)
                        continue
                    }
                    tokens.shift()
                    ctx.args[f]=raw
                }
            }
        }
        return ctx
    }

    /* ================= UTILS ================= */
    log(...args: any[]) {
        console.log(...args)
    }
    warn(...args: any[]) {
        console.warn(...args)
    }
    error(...args: any[]) {
        console.error(...args)
    }
    clear(){
        console.clear()
    }
}