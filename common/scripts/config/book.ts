export interface BookPageDef{
    image?:string
    text?:string
    title?:string
}
export interface BookPage {
    html: string
}
export interface BookDef {
    width?: number
    height?: number
    background?:string
    language_default?: string
    page_break?: string
}