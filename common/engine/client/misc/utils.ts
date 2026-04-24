import { Random1,random } from "../../core/math/random.ts";
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
export function HideElement(elem: HTMLElement, useOpacity = false) {
    elem.style.pointerEvents = "none"
    elem.style.userSelect = "none"

    if (useOpacity) {
        elem.style.opacity = "0"
        elem.style.visibility = "hidden"
    } else {
        elem.style.display = "none"
        elem.style.visibility = "hidden"
    }
}
export function ShowElement(elem: HTMLElement, useOpacity = false) {
    if (useOpacity) {
        elem.style.display = "" 
        elem.style.visibility = "visible"
        requestAnimationFrame(() => {
            elem.style.opacity = "1"
        })
    } else {
        elem.style.display = ""
        elem.style.visibility = "visible"
    }

    elem.style.pointerEvents = ""
    elem.style.userSelect = ""
}
export function ToggleElement(elem: HTMLElement, useOpacity = false) {
    if (useOpacity) {
        if (elem.style.opacity === "0" || elem.style.visibility === "hidden") {
            ShowElement(elem, true)
        } else {
            HideElement(elem, true)
        }
    } else {
        if (elem.style.display === "none") {
            ShowElement(elem)
        } else {
            HideElement(elem)
        }
    }
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
export async function typewriter(element: HTMLElement,html: string,delay:Random1,on_type?: (char: string) => void): Promise<void> {

    element.innerHTML = ""

    const template = document.createElement("div")
    template.innerHTML = html

    // clona estrutura direto
    const clone = template.cloneNode(true) as HTMLElement
    element.append(...Array.from(clone.childNodes))

    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT
    )

    const originalWalker = document.createTreeWalker(
        template,
        NodeFilter.SHOW_TEXT
    )

    let currentNode: Node | null
    let originalNode: Node | null

    while (
        (currentNode = walker.nextNode()) &&
        (originalNode = originalWalker.nextNode())
    ) {
        const fullText = originalNode.textContent ?? ""
        let current = ""

        for (let i = 0; i < fullText.length; i++) {
            const char = fullText[i]
            current += char
            currentNode.textContent = current

            on_type?.(char)

            await new Promise(r => setTimeout(r, random.random1(delay)))
        }
    }
}
export class ImageBuffer {
    cache = new Map<string, HTMLImageElement>()
    loading = new Set<string>()

    lastUsed = new Map<string, number>()
    tick = 0
    max = 6

    async load(src:string){
        this.tick++
        if(this.cache.has(src)){
            this.lastUsed.set(src,this.tick)
            return this.cache.get(src)!
        }
        if(this.loading.has(src)){
            return new Promise(res=>{
                const check=()=>{
                    if(this.cache.has(src)){
                        this.lastUsed.set(src,this.tick)
                        res(this.cache.get(src)!)
                    }
                    else requestAnimationFrame(check)
                }
                check()
            })
        }
        this.loading.add(src)
        const img = new Image()
        img.src = src
        await img.decode().catch(()=>{})
        this.cache.set(src,img)
        this.lastUsed.set(src,this.tick)
        this.loading.delete(src)
        this.cleanup()
        return img
    }
    preload(src: string) {
        this.load(src)
    }
    cleanup() {
        if (this.cache.size <= this.max) return

        const entries = [...this.lastUsed.entries()].filter(([key]) => this.cache.has(key))

        entries.sort((a,b)=>a[1]-b[1])
        const toRemove = this.cache.size - this.max
        for (let i = 0; i < Math.min(toRemove, entries.length); i++) {
            const key = entries[i][0]

            this.cache.delete(key)
            this.lastUsed.delete(key)
        }
    }
    clear() {
        this.cache.clear()
        this.loading.clear()
        this.lastUsed.clear()
        this.tick = 0
    }
}