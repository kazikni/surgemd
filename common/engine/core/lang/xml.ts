import { rect, Rect } from "../math/geometry.ts";
import { v2, Vec2 } from "../math/vec2.ts";
import { Stream } from "../net/stream.ts";

export type XMLNode = {
    parent?:XMLNode
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
    ENTITIES:{amp:"&",lt:"<",gt:">",quot:'"',apos:"'"} as Record<string,string>,
    _escape_text(s:string):string{
        return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    },
    _escape_attr(s:string):string{
        return this._escape_text(s).replace(/"/g,"&quot;")
    },
    _unescape_xml(s:string):string{
        return s.replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g,(m,e:string)=>{
            if(e[0]==="#"){
                const code=e[1]==="x"||e[1]==="X"?parseInt(e.slice(2),16):parseInt(e.slice(1),10)
                return Number.isNaN(code)||code>0x10FFFF?m:String.fromCodePoint(code)
            }
            return this.ENTITIES[e]??m
        })
    },

    el(tag: string, attrs?: Record<string,string>, children?: (XMLNode|string)[],text?:string): XMLNode {
        return { tag, attrs:attrs??{}, children:children??[]}
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
                if(typeof c!=="string")c.parent=root
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
        childs(root:XMLNode,...children:(XMLNode|string)[]):XMLNode{
            return {...root,children:[...root.children,...children]}
        },
    },

    encode(node: XMLNode|string, stream: Stream): Stream {
        if (typeof node === "string") {
            stream.write_uint8(2)
            stream.write_string(node, 2)
            return stream
        }

        stream.write_uint8(1)
        stream.write_string(node.tag, 1)

        const keys = Object.keys(node.attrs)
        stream.write_uint8(keys.length)
        for (const k of keys) {
            stream.write_string(k, 1)
            stream.write_string(node.attrs[k], 2)
        }

        stream.write_uint16(node.children.length)
        for (const c of node.children) {
            this.encode(c, stream)
        }
        return stream
    },
    decode(stream: Stream): XMLNode | string {
        const type = stream.read_uint8()
        if (type === 2) {
            return stream.read_string(2)
        }

        const tag = stream.read_string(1)
        const attrCount = stream.read_uint8()
        const attrs: Record<string,string> = {}

        for (let i = 0; i < attrCount; i++) {
            const k = stream.read_string(1)
            const v = stream.read_string(2)
            attrs[k] = v
        }

        const childCount = stream.read_uint16()
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

    parse(xml:string):XMLNode{
        let i=0
        const fail=(msg:string):never=>{
            const line=xml.slice(0,i).split("\n").length
            throw new Error(`kxml.parse: ${msg} (line ${line}, pos ${i})`)
        }
        const is_space=(c:string)=>c===" "||c==="\n"||c==="\t"||c==="\r"
        const skip_ws=()=>{while(i<xml.length&&is_space(xml[i]))i++}
        const starts=(s:string)=>xml.startsWith(s,i)
        const skip_until=(end:string)=>{
            const at=xml.indexOf(end,i)
            if(at<0)fail(`unterminated, expected "${end}"`)
            i=at+end.length
        }
        // comentários, <?xml ?> e <!DOCTYPE>
        const skip_misc=():boolean=>{
            if(starts("<!--")){i+=4;skip_until("-->");return true}
            if(starts("<?")){i+=2;skip_until("?>");return true}
            if(starts("<!DOCTYPE")){skip_until(">");return true}
            return false
        }
        const read_name=():string=>{
            const start=i
            while(i<xml.length&&!is_space(xml[i])&&xml[i]!==">"&&xml[i]!=="/"&&xml[i]!=="=")i++
            if(i===start)fail("expected a name")
            return xml.slice(start,i)
        }
        const parse_attrs=():Record<string,string>=>{
            const attrs:Record<string,string>={}
            while(true){
                skip_ws()
                if(i>=xml.length)fail("unexpected end inside tag")
                if(xml[i]===">"||xml[i]==="/")break
                const name=read_name()
                skip_ws()
                if(xml[i]==="="){
                    i++
                    skip_ws()
                    const quote=xml[i]
                    if(quote!=='"'&&quote!=="'")fail("expected quote around attribute value")
                    i++
                    const end=xml.indexOf(quote,i)
                    if(end<0)fail("unterminated attribute value")
                    attrs[name]=this._unescape_xml(xml.slice(i,end))
                    i=end+1
                }else{
                    attrs[name]="" // atributo sem valor
                }
            }
            return attrs
        }
        const parse_element=():XMLNode=>{
            i++ // <
            const tag=read_name()
            const attrs=parse_attrs()

            if(xml[i]==="/"){ // <tag />
                i++
                if(xml[i]!==">")fail("expected '>'")
                i++
                return {tag,attrs,children:[]}
            }
            i++ // >

            const children:(XMLNode|string)[]=[]
            let text=""
            const flush=()=>{
                const t=text.trim()
                if(t)children.push(t)
                text=""
            }

            while(true){
                if(i>=xml.length)fail(`unclosed <${tag}>`)

                if(xml[i]!=="<"){
                    const end=xml.indexOf("<",i)
                    const stop=end<0?xml.length:end
                    text+=this._unescape_xml(xml.slice(i,stop))
                    i=stop
                    continue
                }
                if(starts("</")){
                    i+=2
                    const name=read_name()
                    if(name!==tag)fail(`expected </${tag}> but found </${name}>`)
                    skip_ws()
                    if(xml[i]!==">")fail("expected '>'")
                    i++
                    flush()
                    return {tag,attrs,children}
                }
                if(starts("<![CDATA[")){
                    i+=9
                    const at=xml.indexOf("]]>",i)
                    if(at<0)fail("unterminated CDATA")
                    text+=xml.slice(i,at)
                    i=at+3
                    continue
                }
                if(skip_misc())continue

                flush()
                children.push(parse_element())
            }
        }

        while(true){skip_ws();if(!skip_misc())break}
        if(xml[i]!=="<")fail("expected root element")
        const root=parse_element()
        while(true){skip_ws();if(!skip_misc())break}
        if(i<xml.length)fail("unexpected content after root element")
        return root
    },

    stringify(node:XMLNode,mini:boolean=true,indent:string="  ",depth:number=0):string{
        const attrs=attrsToString(node.attrs)
        const open=`<${node.tag}${attrs?" "+attrs:""}`
        const children=node.children??[]

        if(children.length===0)return mini?`${open}/>`:`${open}/>`

        const render=(c:XMLNode|string,d:number)=>typeof c==="string"?this._escape_text(c):this.stringify(c,mini,indent,d)

        if(mini)return `${open}>${children.map(c=>render(c,0)).join("")}</${node.tag}>`

        if(children.every(c=>typeof c==="string")){
            return `${open}>${children.map(c=>render(c,0)).join("")}</${node.tag}>`
        }

        const pad=indent.repeat(depth+1)
        const lines=children.map(c=>pad+render(c,depth+1))
        return `${open}>\n${lines.join("\n")}\n${indent.repeat(depth)}</${node.tag}>`
    },

    clone(node: XMLNode): XMLNode {
        return {
            tag: node.tag,
            attrs: node.attrs ? { ...node.attrs } : {},
            children: node.children?.map(c =>
                typeof c === "string" ? c : kxml.clone(c)
            ),
        }
    },
    get_node_by_tag(root:XMLNode,tag:string):XMLNode|undefined{
        for(const n of root.children??[]){
            if(typeof n!=="string"&&n.tag===tag)return n
        }
        return undefined
    },
    get_node_by_attr(root:XMLNode,attr:string,value:string):XMLNode|undefined{
        for(const n of root.children??[]){
            if(typeof n!=="string"&&n.attrs[attr]===value)return n
        }
        return undefined
    },
    
    query_selector_attr(root:XMLNode,attr:string,value:string):XMLNode|undefined{
        for(const node of root.children??[]){
            if(typeof node==="string")continue
            if(node.attrs[attr]===value)return node
            const found=kxml.query_selector_attr(node,attr,value)
            if(found)return found
        }
        return undefined
    },
    query_selector(root:XMLNode,item:string):XMLNode|undefined{
        const by_id=item.startsWith("#")
        const key=by_id?item.substring(1):item
        for(const node of root.children??[]){
            if(typeof node==="string")continue
            if(by_id?node.attrs.id===key:node.tag===key)return node
            const found=kxml.query_selector(node,item)
            if(found)return found
        }
        return undefined
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
                        width: String(rect.max.x-rect.min.x),
                        height: String(rect.max.y-rect.min.y),
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