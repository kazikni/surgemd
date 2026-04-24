import { rect, Rect } from "../math/geometry.ts";
import { v2, Vec2 } from "../math/vec2.ts";
import { NetStream } from "../net/stream.ts";

export type XMLNode = {
    tag: string
    attrs: Record<string, string>
    children: (XMLNode | string)[]
}

function attrsToString(attrs?: Record<string,string>) {
    if (!attrs) return ""
    return Object.entries(attrs)
        .map(([k,v]) => `${k}="${v}"`)
        .join(" ")
}

export const kxml = Object.freeze({
    el(tag: string, attrs?: Record<string,string>, children?: (XMLNode|string)[]): XMLNode {
        return { tag, attrs:attrs??{}, children:children??[] }
    },
    append:{
        attrs(node: XMLNode, ...attrsList: Record<string,string>[]) {
            node.attrs={
                ...(node.attrs || {}),
                ...Object.assign({}, ...attrsList)
            }
        },
        childs(root: XMLNode, ...children:(XMLNode|string)[]) {
            for(const c of children){
                root.children.push(c)
            }
        },
    },
    add:{
        attrs(root: XMLNode, ...attrsList: Record<string,string>[]):XMLNode{
            return {
                tag:root.tag,
                attrs:{
                    ...(root.attrs || {}),
                    ...Object.assign({}, ...attrsList)
                },
                children:root.children
            }
        },
        childs(root: XMLNode, ...children:(XMLNode|string)[]) {
            return {
                tag:root.tag,
                attrs:root.attrs,
                children:[root.children,...children]
            }
        },
    },
    encode(node: XMLNode|string, stream: NetStream): NetStream {
        if (typeof node === "string") {
            stream.writeUint8(2)
            stream.writeString(node, 2)
            return stream
        }

        stream.writeUint8(1)
        stream.writeString(node.tag, 1)

        const keys = Object.keys(node.attrs)
        stream.writeUint8(keys.length)
        for (const k of keys) {
            stream.writeString(k, 1)
            stream.writeString(node.attrs[k], 2)
        }

        stream.writeUint16(node.children.length)
        for (const c of node.children) {
            this.encode(c, stream)
        }
        return stream
    },
    decode(stream: NetStream): XMLNode | string {
        const type = stream.readUint8()
        if (type === 2) {
            return stream.readString(2)
        }

        const tag = stream.readString(1)
        const attrCount = stream.readUint8()
        const attrs: Record<string,string> = {}

        for (let i = 0; i < attrCount; i++) {
            const k = stream.readString(1)
            const v = stream.readString(2)
            attrs[k] = v
        }

        const childCount = stream.readUint16()
        const children: (XMLNode|string)[] = []

        for (let i = 0; i < childCount; i++) {
            children.push(this.decode(stream))
        }

        return {
            tag,
            attrs,
            children
        }
    },
    parse(xml: string): XMLNode {
        let i = 0
        function skipWhitespace() {
            while (/\s/.test(xml[i])) i++
        }
        function parseAttrs(): Record<string,string> {
            const attrs: Record<string,string> = {}
            while (true) {
                skipWhitespace()
                if (xml[i] === ">" || xml[i] === "/") break
                let name = ""
                while (/[^\s=]/.test(xml[i])) {
                    name += xml[i++]
                }
                skipWhitespace()
                i++
                skipWhitespace()
                const quote = xml[i++]
                let value = ""
                while (xml[i] !== quote) {
                    value += xml[i++]
                }
                i++
                attrs[name] = value
            }
            return attrs
        }
        function parseNode(): XMLNode {
            skipWhitespace()

            if (xml[i] !== "<") {
                let text = ""
                while (xml[i] !== "<") {
                    text += xml[i++]
                }
                return text.trim() as any
            }
            i++
            let tag = ""
            while (/[^\s>/]/.test(xml[i])) {
                tag += xml[i++]
            }
            const attrs = parseAttrs()
            if (xml[i] === "/") {
                i += 2
                return { tag, attrs, children: [] }
            }
            i++
            const children: (XMLNode|string)[] = []

            while(true) {
                skipWhitespace()
                if (xml[i] === "<" && xml[i+1] === "/") {
                    i += 2
                    while (xml[i] !== ">") i++
                    i++
                    break
                }

                const child = parseNode()
                if (typeof child === "string") {
                    if (child > 0) children.push(child)
                } else {
                    children.push(child)
                }
            }

            return { tag, attrs, children }
        }

        return parseNode()
    },
    stringify(node: XMLNode): string {
        const attrs = attrsToString(node.attrs)
        const children = node.children
            ? node.children.map(c => typeof c === "string" ? c : kxml.stringify(c)).join("")
            : ""

        return `<${node.tag}${attrs ? " " + attrs : ""}>${children}</${node.tag}>`
    },
    clone(node: XMLNode): XMLNode {
        return {
            tag: node.tag,
            attrs: node.attrs ? { ...node.attrs } : {},
            children: node.children?.map(c =>
                typeof c === "string" ? c : kxml.clone(c)
            )
        }
    },
    get_node_by_tag(root:XMLNode,tag:string):XMLNode|undefined{
        for(const n of root.children??[]){
            if(typeof n!=="string"&&n.tag===tag)return n
        }
        return undefined
    },
    get_node_by_id(root:XMLNode,id:string):XMLNode|undefined{
        for(const n of root.children??[]){
            if(typeof n!=="string"&&n.attrs[id]===id)return n
        }
        return undefined
    },
    get_node_by_tag_deep(root:XMLNode,tag:string):XMLNode|undefined{
        for(const n of root.children??[]){
            if(typeof n!=="string"&&n.tag===tag)return n
        }
        return undefined
    },
    query_selector(root:XMLNode,item:string):XMLNode|undefined{
        if(item.startsWith("#")){
            const id=item.substring(1)
            for(const node of root.children??[]){
                if(typeof node!=="string"){
                    if(node.attrs[id]===id)return node
                    const ret=this.query_selector(root,item)
                    if(ret!==undefined)return ret
                }
            }
        }else{
            for(const node of root.children??[]){
                if(typeof node!=="string"){
                    if(node.tag===item)return node
                    const ret=this.query_selector(root,item)
                    if(ret!==undefined)return ret
                }
            }
        }
    },
    svg:Object.freeze({
        create:{
            main(rect:Rect):XMLNode{
                const width = rect.max.x - rect.min.x
                const height = rect.max.y - rect.min.y
                return {
                    tag:"svg",
                    attrs:{
                        viewBox: `${rect.min.x} ${rect.min.y} ${width} ${height}`,
                        width: String(width),
                        height: String(height),
                        xmlns: "http://www.w3.org/2000/svg",
                    },
                    children:[]
                }
            },
            pattern(id: string,size:Vec2,children: XMLNode[],extraAttrs: Record<string,string> = {}): XMLNode {
                return {
                    tag: "pattern",
                    attrs: {
                        id,
                        patternUnits: "userSpaceOnUse",
                        width: String(size.x),
                        height: String(size.y),
                        ...extraAttrs
                    },
                    children
                }
            },
            g(children: XMLNode[] = [], attrs: Record<string,string> = {}): XMLNode {
                return { tag: "g", attrs, children }
            },
            rect(rect:Rect, attrs:Record<string,string>={}): XMLNode {
                return {
                    tag: "rect",
                    attrs: {
                        x: String(rect.min.x),
                        y: String(rect.min.y),
                        width: String(rect.min.x+rect.max.x),
                        height: String(rect.min.y+rect.max.y),
                        ...attrs
                    },
                    children:[]
                }
            },
            path(d:string, attrs:Record<string,string>={}): XMLNode {
                return {
                    tag: "path",
                    attrs: {
                        d,
                        ...attrs
                    },
                    children:[]
                }
            },
            polygon(points: Vec2[], attrs:Record<string,string>={}): XMLNode {
                return {
                    tag: "polygon",
                    attrs: {
                        points: points.map(p => `${p.x},${p.y}`).join(" "),
                        ...attrs
                    },
                    children:[]
                }
            },
            defs(items:XMLNode[]=[],id:string="defs1"):XMLNode{
                return {
                    tag: "defs",
                    attrs: {
                        id,
                    },
                    children: items
                }
            },
            walls(points:Vec2[],width:number,close:boolean=false){
                const pts = points
                const half = width / 2

                if (pts.length < 2) {
                    return kxml.svg.create.g([])
                }

                const left: Vec2[] = []
                const right: Vec2[] = []

                const count = pts.length

                const getPoint = (i: number) => {
                    return pts[Math.max(0, Math.min(i, count - 1))]
                }

                for (let i = 0; i < count; i++) {
                    const isStart = i === 0
                    const isEnd = i === count - 1

                    const pPrev = getPoint(i - 1)
                    const p = getPoint(i)
                    const pNext = getPoint(i + 1)

                    const dir1 = v2.normalizeSafe(v2.sub(p, pPrev))
                    const dir2 = v2.normalizeSafe(v2.sub(pNext, p))

                    const n1 = v2(-dir1.y, dir1.x)
                    const n2 = v2(-dir2.y, dir2.x)

                    let offset: Vec2

                    if (isStart || isEnd) {
                        const dir = isStart ? dir2 : dir1
                        const normal = v2(-dir.y, dir.x)
                        offset = v2.scale(normal, half)
                    } else {
                        const miter = v2.add(n1, n2)
                        const miterLen = v2.len(miter)

                        if (miterLen < 0.0001) {
                            offset = v2.scale(n1, half)
                        } else {
                            const miterNorm = v2.scale(miter, 1 / miterLen)
                            const dot = v2.dot(miterNorm, n2)

                            if (Math.abs(dot) < 0.999) {
                                const length = half / (dot || 0.0001)
                                offset = v2.scale(miterNorm, length)
                            } else {
                                offset = v2.scale(n1, half)
                            }
                        }
                    }

                    left.push(v2.add(p, offset))
                    right.push(v2.sub(p, offset))
                }

                let d = ""
                for (let i = 0; i < left.length; i++) {
                    const p = left[i]
                    d += (i === 0 ? "M" : "L") + ` ${p.x} ${p.y} `
                }
                for (let i = right.length - 1; i >= 0; i--) {
                    const p = right[i]
                    d += `L ${p.x} ${p.y} `
                }

                d += "Z"

                return kxml.svg.create.path(d)
            },
            grid_floor(color: string,size: Vec2,stroke: Record<string,string>,rows: number = 3,colums: number = 2,invert: boolean = false): XMLNode {
                const children: XMLNode[] = []

                children.push(
                    kxml.svg.create.rect(
                        rect.new(v2.zero, size),
                        kxml.svg.fill.color(color)
                    )
                )
                const rowH = size.y / rows
                const colW = size.x / colums
                if (!invert) {
                    for (let i = 0; i <= rows; i++) {
                        const y = i * rowH
                        children.push(
                            kxml.svg.create.path(
                                `M 0 ${y} H ${size.x}`,
                                stroke
                            )
                        )
                    }
                    for (let row = 0; row < rows; row++) {
                        const y0 = row * rowH
                        const y1 = y0 + rowH
                        const offset = (row % 3) * (colW / 3)
                        for (let c = 0; c <= colums; c++) {
                            const x = c * colW + offset
                            if (x < 0 || x > size.x) continue
                            children.push(
                                kxml.svg.create.path(
                                    `M ${x} ${y0} V ${y1}`,
                                    stroke
                                )
                            )
                        }
                    }
                }
                return kxml.svg.create.g(children)
            }
        },
        transform:{
            translate(pos:Vec2): string {
                return `translate(${pos.x}, ${pos.y})`
            },
        },
        fill:{
            color(color:string): Record<string,string> {
                return {fill:color}
            },
            pattern(id:string,rect?: Rect): Record<string,string> {
                const attrs: Record<string,string> = {
                    fill: `url(#${id})`
                }
                if (rect) {
                    const w = rect.max.x - rect.min.x
                    const h = rect.max.y - rect.min.y
                    attrs["patternTransform"] = `scale(${w}, ${h})`
                }
                return attrs
            }
        },
        stroke:{
            color(color: string, width = 1, extra: Record<string,string> = {}): Record<string,string> {
                return {
                    stroke: color,
                    "stroke-width": String(width),
                    "stroke-linejoin": "miter",
                    "stroke-linecap": "butt",
                    ...extra
                }
            },
        },
    })
})