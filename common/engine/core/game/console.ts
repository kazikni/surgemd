export type CommandArgParser<T, CTX> = (ctx: CTX, raw: string) => T
export type ConsoleContext = {
    console: GameConsole<any>
}
type CommandArg = {
    name: string
    type: string
    optional?: boolean
}
type CommandDef<CTX extends ConsoleContext> = {
    name: string
    description?: string
    args: CommandArg[]
    execute: (ctx: CTX, args: Record<string,any>) => void | Promise<void>
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
export abstract class GameConsole<CTX extends ConsoleContext = ConsoleContext> {
    commands = new Map<string, CommandDef<CTX>>()
    types: Record<string, CommandArgParser<any, CTX>> = {}
    ctx: CTX
    constructor(ctx: CTX) {
        this.ctx = {
            ...ctx,
            console: this
        }
        this.register_type("string",console_string_parser)
        this.register_type("number",console_number_parser)
        this.register_type("int",console_int_parser)
        this.register_type("float",console_float_parser)
    }
    /* ================= REGISTER ================= */
    register(cmd: CommandDef<CTX>) {
        this.commands.set(cmd.name.toLowerCase(), cmd)
    }
    register_type<T>(name: string, parser: CommandArgParser<T, CTX>) {
        this.types[name] = parser
    }
    /* ================= RUN ================= */
    async run(input: string) {
        const tokens = this.tokenize(input)
        if (!tokens.length) return
        const name = tokens.shift()!.toLowerCase()
        const cmd = this.commands.get(name)
        if (!cmd) {
            this.error(`Unknown command: ${name}`)
            return
        }
        const args = this.parse_args(tokens, cmd)

        await cmd.execute(this.ctx, args)
    }
    /* ================= TOKENIZER ================= */
    tokenize(input: string): string[] {
        return input.match(/"[^"]*"|\S+/g)?.map(s => s.replace(/"/g, "")) ?? []
    }
    /* ================= ARG PARSER ================= */
    parse_args(tokens: string[], cmd: CommandDef<CTX>): Record<string, any> {
        const result: Record<string, any> = {}

        cmd.args.forEach((arg, i) => {
            const raw = tokens[i]

            if (!raw) {
                if (!arg.optional) {
                    throw new Error(`Missing arg: ${arg.name}`)
                }
                return
            }

            const parser = this.types[arg.type]

            if (!parser) {
                throw new Error(`Unknown type: ${arg.type}`)
            }

            result[arg.name] = parser(this.ctx, raw)
        })

        return result
    }
    /* ================= UTILS ================= */
    log(...args: any[]) {
        console.log("[Console]", ...args)
    }
    warn(...args: any[]) {
        console.warn("[Console]", ...args)
    }
    error(...args: any[]) {
        console.error("[Console]", ...args)
    }
    clear(){
        console.clear()
    }
}