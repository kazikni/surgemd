import { Numeric } from "../../core/math/utils.ts";
import { type ClientGame } from "./game.ts";
export const CenterHotspot={
    x:0.5,
    y:0.5
}
export interface TweenOptions<T>{
    target: T
    to: Partial<T>
    duration: number
    ease?: (x: number) => number
    yoyo?: boolean
    infinite?: boolean
    onUpdate?: () => void
    onComplete?: () => void
}
export class Tween<T> {
    readonly game: ClientGame<any>;

    tick:number=0

    readonly target: T;
    readonly duration: number;

    startValues: Record<string, number> = {};
    endValues: Record<string, number> = {};

    readonly ease: (x: number) => number;

    yoyo: boolean;
    infinite: boolean;

    readonly onUpdate?: () => void;
    readonly onComplete?: () => void;

    constructor(
        game: ClientGame<any>,
        config: TweenOptions<T>
    ) {
        this.game = game;
        this.target = config.target;
        for (const key in config.to) {
            this.startValues[key] = config.target[key] as number;
            this.endValues[key] = config.to[key] as number;
        }

        this.duration = config.duration;
        this.ease = config.ease ?? (t => t);
        this.yoyo = config.yoyo ?? false;
        this.infinite = config.infinite ?? false;
        this.onUpdate = config.onUpdate;
        this.onComplete = config.onComplete;
    }

    update(dt:number): void {
        this.tick+=dt

        // deno-lint-ignore ban-ts-comment
        //@ts-ignore
        if(this.target.destroyed){
            this.kill();
            this.onComplete?.();
            return
        }

        const interpFactor = Numeric.clamp(this.tick / this.duration, 0, 1);
        for (const key in this.startValues) {
            const startValue = this.startValues[key];
            const endValue = this.endValues[key];

            (this.target[key as keyof T] as number) = Numeric.lerp(startValue, endValue, this.ease(interpFactor));
        }
        this.onUpdate?.();

        if (this.tick>=this.duration) {
            if (this.yoyo) {
                this.yoyo = this.infinite;
                this.tick=0;
                [this.startValues, this.endValues] = [this.endValues, this.startValues];
            } else {
                this.kill();
                this.onComplete?.();
            }
        }
    }

    kill(): void {
        this.game.remove_tween(this as unknown as Tween<unknown>);
    }
}
export function HideElement(elem:HTMLElement,opacity=false){
    elem.style.pointerEvents="none"
    elem.style.userSelect="none"
    if(opacity){
        elem.style.opacity="0"
    }else{
        elem.style.display="none"
    }
}
export function ShowElement(elem:HTMLElement,opacity=false){
    if(opacity){
        elem.style.opacity="1"
    }
    elem.style.display = ""
    elem.style.pointerEvents = ""
    elem.style.userSelect=""
}
export function ToggleElement(elem:HTMLElement){
    if(elem.style.display==="none")ShowElement(elem)
    else HideElement(elem)
}

export function ShowTab(tab:string,tabs:Record<string,HTMLElement>,opacity?:boolean){
    for(const t of Object.values(tabs)){
        HideElement(t,opacity)
    }
    if(tabs[tab]){
        ShowElement(tabs[tab],opacity)
    }
}
function escapeHtml(s: string) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function inlineFormat(s: string) {
    s = s.replace(/`([^`]+)`/g, (_, m) => `<code>${m}</code>`);
    s = s.replace(/\*\*([^*]+)\*\*/g, (_, m) => `<strong>${m}</strong>`);
    s = s.replace(/\*([^*]+)\*/g, (_, m) => `<em>${m}</em>`);
    return s;
}

// NEW ✔
function isHtml(line: string): boolean {
    return /^\s*<\/?[a-zA-Z][^>]*>/.test(line);
}

export function formatToHtml(src: string): string {
    const lines = src.split("\n")
    const out: string[] = []
    let inList = false

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (line === "") continue

        if (line === "___") {
            if (inList) {
                out.push("</ul>")
                inList = false
            }
            out.push("<hr>")
            continue
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
        if (headingMatch) {
            if (inList) {
                out.push("</ul>")
                inList = false
            }
            const level = headingMatch[1].length
            const text = inlineFormat(escapeHtml(headingMatch[2]))
            out.push(`<h${level}>${text}</h${level}>`)
            continue
        }

        if (/^\*\s+/.test(line)) {
            const item = inlineFormat(escapeHtml(line.replace(/^\*\s+/, "")))
            if (!inList) {
                out.push("<ul>")
                inList = true
            }
            out.push(`<li>${item}</li>`)
            continue
        }

        if (isHtml(line)) {
            if (inList) {
                out.push("</ul>")
                inList = false
            }
            out.push(line)
            continue
        }

        if (inList) {
            out.push("</ul>")
            inList = false
        }

        out.push(`<p>${inlineFormat(escapeHtml(line))}</p>`)
    }

    if (inList) out.push("</ul>")
    return out.join("\n")
}
function preventHandler(e: Event) {
    e.preventDefault();
}

export function enableContextMenuPrevent() {
    document.addEventListener("contextmenu", preventHandler);
    document.addEventListener("selectstart", preventHandler);
}

export function disableContextMenuPrevent() {
    document.removeEventListener("contextmenu", preventHandler);
    document.removeEventListener("selectstart", preventHandler);
}
