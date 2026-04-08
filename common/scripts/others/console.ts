import { ConsoleContext, GameConsole } from "../../engine/core.ts";

export class MDConsole<CTX extends ConsoleContext> extends GameConsole<CTX>{
    constructor(ctx:CTX){
        super(ctx)
    }
}