import {BookDef, BookPage} from "common/scripts/config/book.ts"
import { formatToHtml } from "common/engine/web.ts";
import "./main.scss"
const params = new URLSearchParams(location.search);
const bookName = params.get("book")
if(!bookName){
    document.body.innerHTML = "Book not found"
    throw ""
}
async function load_book(base:string,book_elem:HTMLDivElement){
    const book:BookDef = await (await fetch(`${base}/book.json`)).json()
    const md = await fetch(`${base}/defs/en.md`).then(r => r.text())
    const pages = md.split(book.page_break??"[[page]]",).map(v => ({html: formatToHtml(v.replaceAll("${base}", base))}))
    let pageIndex = 0;
    book_elem.style.width=(book.width??1300)+"px"
    book_elem.style.height=(book.height??800)+"px"
    function renderPage(page: BookPage | undefined,element: HTMLElement){
        if (!page) {
            element.innerHTML = ""
            return
        }
        element.innerHTML = page.html
    }
    function renderInstant(){
        renderPage(pages[pageIndex],document.querySelector("#leftPage") as HTMLDivElement)
        renderPage(pages[pageIndex+1],document.querySelector("#rightPage") as HTMLDivElement)
    }
    let flipping = false;
    function nextPage(){
        if(flipping)return
        if(pageIndex + 2 >= pages.length)return
        flipping = true
        renderPage(pages[pageIndex+1],document.querySelector("#flip-front") as HTMLDivElement)
        renderPage(pages[pageIndex+2],document.querySelector("#flip-back") as HTMLDivElement)
        const flip = document.getElementById("flipPage") as HTMLDivElement
        flip.classList.add("active")
        pageIndex += 2
        renderInstant()
        setTimeout(()=>{
            flip.classList.remove("active")
            flipping = false
        },900)
    }
    function previousPage(){
        if(flipping)return
        if(pageIndex - 2 < 0)return
        renderPage(pages[pageIndex],document.querySelector("#flip-front") as HTMLDivElement)
        renderPage(pages[pageIndex-1],document.querySelector("#flip-back") as HTMLDivElement)
        flipping = true
        const flip = document.getElementById("flipPage") as HTMLDivElement
        flip.classList.add("prev")
        flip.classList.add("active")
        pageIndex -= 2
        renderInstant()
        setTimeout(()=>{
            flip.classList.remove("active")
            flip.classList.remove("prev")
            flipping = false
        },1000)
    }
    renderInstant()
    document.getElementById("next")!.onclick = ()=>{
        if(flipping)return
        if(pageIndex + 2 < pages.length){
            nextPage()
        }
    }
    document.getElementById("prev")!.onclick = ()=>{
        if(flipping)return
        previousPage()
    }
}
load_book(`/scripts/books/${bookName}`,document.querySelector(".book") as HTMLDivElement)
self.addEventListener("keydown",(e)=>{
    if(e.key === "ArrowRight"){
        document.getElementById("next")!.click()
    }
    if(e.key === "ArrowLeft"){
        document.getElementById("prev")!.click()
    }
})