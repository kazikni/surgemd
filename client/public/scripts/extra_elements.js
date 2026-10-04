class TabsContainer extends HTMLElement{
    constructor() {
        super();
        
    }
    connectedCallback() {
        const headerPosition = this.getAttribute('header-position') || 'top';
        this.classList.add(headerPosition);
        self.requestAnimationFrame(()=>{
            const d=document.createElement("div")
            d.innerHTML=this.innerHTML
            d.classList.add("tabs-content")
            this.innerHTML=""
            this.appendChild(d)
            this.tabs = this.querySelectorAll('tab');
            this.tabButtons = [];
            const tabsHeader = document.createElement("div")
            tabsHeader.classList.add("tabs-header")
            this.tabs.forEach((tab, index) => {
                const button = document.createElement('button');
                button.textContent = tab.getAttribute('text');
                button.classList.add('tab-button');
                if (index === 0) {
                    button.classList.add('tab-active');
                    tab.classList.add('tab-active');
                }
                button.addEventListener('click', () => {
                    this.switchTab(index);
                });
                tabsHeader.appendChild(button);
                this.tabButtons.push(button);
            });
            this.appendChild(tabsHeader)
        })
    }
    switchTab(index) {
        this.tabs.forEach((tab, i) => {
            tab.classList.toggle('tab-active', i === index);
        });
        this.tabButtons.forEach((button, i) => {
            button.classList.toggle('tab-active', i === index);
        });
    }
}
class SMDEConsole extends HTMLElement{
    constructor(){
        super()
    }
    connectedCallback(){
        this.innerHTML=`
            <div class="output"></div>
            <input type="text" class="input"></input>
        `

        this.output=this.querySelector(".output")
        this.input=this.querySelector(".input")

        this.input.addEventListener("keydown",e=>{
            if(e.key!=="Enter")return
            e.preventDefault()
            const value=this.input.value
            this.input.value=""
            const p=this.dispatchEvent(new CustomEvent("enter",{detail:value,cancelable:true}))
            if(p)this.log("> "+value)
        })
    }

    clear(){
        this.output.innerHTML=""
    }

    log(...args){
        const line=document.createElement("div")
        line.textContent=args.map(x=>{
            if(typeof x==="string")return x
            try{return JSON.stringify(x,null,2)}
            catch{return String(x)}
        }).join(" ")
        this.output.append(line)
        this.output.scrollTop=this.output.scrollHeight
    }

    insert({index,html}){
        const content=this.output.innerHTML
        this.output.innerHTML=content.slice(0,index)+html+content.slice(index)
    }
}

customElements.define("smde-console",SMDEConsole)
class SMDEMenu extends HTMLElement {
    constructor(){
        super()
        this._connected=false
        this.hover=false
    }
    get innerHTML(){
        return super.innerHTML
    }
    set innerHTML(val){
        super.innerHTML=val
        if(this._connected){
            this.rebuild()
        }
    }

    set_hover(hover){
        this.hover=hover
        if(this.parent_menu){
            this.parent_menu.set_hover(hover)
        }
    }
    close(){
        if(this.parent_menu){
            return this.parent_menu.close()
        }
        const event = new CustomEvent("close",{
            bubbles: true,
            cancelable: true
        })
        const canClose = this.dispatchEvent(event)
        if(canClose)this.remove()
    }
    connectedCallback(){
        this._connected=true
        this.rebuild()
        this.addEventListener("mouseenter",(e)=>this.set_hover(true))
        this.addEventListener("mouseleave",(e)=>this.set_hover(false))
    }
    rebuild(){
    }
    /**
     * 
     * @param {string} text 
     * @param {(event:MouseEvent)=>void} onclick 
     */
    add_option(text,onclick=(_e)=>{}){
        const node=document.createElement("smde-option")
        node.innerText=text
        node.addEventListener("click",(e)=>{
            onclick(e)
            this.close()
        })
        this.appendChild(node)
        return node
    }
    /**
     * 
     * @param {string} text
     * @param {Menu} menu
     * @param {(event:MouseEvent)=>void} onclick
     */
    add_submenu(text, menu){
        menu.parent_menu=this
        const option = document.createElement("smde-option-submenu")
        const label = document.createElement("div")
        label.textContent = text
        option.appendChild(label)
        option.appendChild(menu)
        this.appendChild(option)
        return option
    }
}
class SMDEOptionSubMenu extends HTMLElement{
    constructor(){
        super()
    }
    connectedCallback(){
    }
}
class SMDEJoystick extends HTMLElement {
    constructor() {
        super();
        this.knob = document.createElement("div");
        this.knob.className = "knob";
        this.active = false;
        this.center = { x: 0, y: 0 };
        this.value = { x: 0, y: 0 };
        this.pointerId = null;
    }

    connectedCallback() {
        this.style.position = "relative";
        if (!this.contains(this.knob)) this.appendChild(this.knob);

        const start = (e) => {
            e.preventDefault();
            const isTouch = e.type === "touchstart";
            const point = isTouch ? e.changedTouches[0] : e;
            this.pointerId = isTouch ? point.identifier : point.pointerId ?? "mouse";

            const rect = this.getBoundingClientRect();
            this.center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            };
            this.active = true;
            move(e);

            document.addEventListener(isTouch ? "touchmove" : "pointermove", move, { passive: false });
            document.addEventListener(isTouch ? "touchend" : "pointerup", end);
        };

        const move = (e) => {
            if (!this.active) return;
            const isTouch = e.type === "touchmove";
            const points = isTouch ? e.changedTouches : [e];
            const point = [...points].find(p =>
                (isTouch ? p.identifier : p.pointerId ?? "mouse") === this.pointerId
            );
            if (!point) return;

            const dx = point.clientX - this.center.x;
            const dy = point.clientY - this.center.y;
            const max = this.offsetWidth / 2;
            const dist = Math.min(Math.sqrt(dx * dx + dy * dy), max);
            const angle = Math.atan2(dy, dx);
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;

            this.value.x = x / max;
            this.value.y = y / max;
            this.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

            this.dispatchEvent(new CustomEvent("joystickmove", {
                detail: { x: this.value.x, y: this.value.y }
            }));
        };

        const end = (e) => {
            const isTouch = e.type === "touchend";
            const points = isTouch ? e.changedTouches : [e];
            const point = [...points].find(p =>
                (isTouch ? p.identifier : p.pointerId ?? "mouse") === this.pointerId
            );
            if (!point) return;

            this.active = false;
            this.pointerId = null;
            this.value = { x: 0, y: 0 };
            this.knob.style.transform = "translate(-50%, -50%)";
            this.dispatchEvent(new Event("joystickend"));

            document.removeEventListener(isTouch ? "touchmove" : "pointermove", move);
            document.removeEventListener(isTouch ? "touchend" : "pointerup", end);
        };

        this.addEventListener("touchstart", start, { passive: false });
        this.addEventListener("pointerdown", start);
        
        this.knob.style.position = "absolute";
        this.knob.style.top = "50%";
        this.knob.style.left = "50%";
        this.knob.style.transform = "translate(-50%, -50%)";
    }
}
class SMDEWindow extends HTMLElement{
    get movable(){
        return this._movable||this.dataset.movable
    }
    set movable(val){
        this._movable=val
    }
    get innerHTML(){
        return this.content?this.content.innerHTML:super.innerHTML
    }
    set innerHTML(val){
        if(!this.content){
            super.innerHTML=val
            return
        }
        this.content.innerHTML=val
    }
    constructor(){
        super()
        this.content=null
        this._movable=true
        this.moving=false
        this.dragOffset={x:0,y:0}
    }
    appendChild(n){
        if(!this.content){
            super.appendChild(n)
            return
        }
        this.content.appendChild(n)
    }
    connectedCallback(){
        const content=document.createElement("div")
        content.innerHTML=this.innerHTML
        content.className="smde-window-content"
        content.style.height=`calc(100% - 30px)`
        this.innerHTML=""

        this.top=document.createElement("div")
        this.top.className="smde-window-top"
        this.appendChild(this.top)

        this.set_size(600,600)
        
        this.mouse_down_listener=(e)=>{
            if(!this.movable) return
            this.moving=true
            this.dragOffset.x=e.clientX-this.offsetLeft
            this.dragOffset.y=e.clientY-this.offsetTop
        }
        this.mouse_up_listener=(e)=>{
            this.moving=false
        }
        this.mouse_move_listener=(e)=>{
            if(!this.moving)return
            this.style.left=(e.clientX-this.dragOffset.x)+"px"
            this.style.top=(e.clientY-this.dragOffset.y)+"px"
        }

        this.top.addEventListener("mousedown",this.mouse_down_listener)
        document.addEventListener("mouseup",this.mouse_up_listener)
        document.addEventListener("mousemove",this.mouse_move_listener)

        this.add_close_button()

        this.appendChild(content)
        this.content=content
    }
    add_close_button(){
        this.close_button=document.createElement("button")
        this.close_button.classList="smde-window-close-btn"
        this.close_button.innerText="X"
        this.close_button.onclick=()=>{
            const event = new CustomEvent("close",{
                bubbles: true,
                cancelable: true
            })
            const canClose = this.dispatchEvent(event)
            if(canClose)this.remove()
        }
        this.top.appendChild(this.close_button)
    }
    add_title(){
        this.title=document.createElement("span")
        this.tille.class="smde-window-title"
        this.top.appendChild(this.title)
    }
    disconnectedCallback() {
        document.removeEventListener("mouseup",this.mouse_up_listener)
        document.removeEventListener("mousemove",this.mouse_move_listener)
    }
    set_size(width,height){
        this.style.width=width+"px"
        this.style.height=height+"px"
    }
    set_top(val){
        this.top.innerHTML=val
    }
    set_title(val){
        if(!this.title)this.add_title()
        this.tilte.innerHTML=val
    }
}
class SMDETree extends HTMLElement{
    constructor(){
        super()
        this.items=[]
        this.parent_arrow=null
    }
    add_option(text, elem, onclick, index) {
        return this.insert_item({
            text,
            elem,
            onclick,
            tree: undefined
        }, index)
    }
    add_subtree(text, tree = new SMDETree(), onclick, index) {
        return this.insert_item({
            text,
            tree,
            onclick
        }, index)
    }

    create_item(item){
        const container=document.createElement("div")
        container.className="smde-tree-node"

        const row=document.createElement("div")
        row.className="smde-tree-row"

        const arrow=document.createElement("span")
        arrow.className="smde-tree-arrow"
        arrow.textContent=item.tree?"▸":""

        const label=document.createElement("button")
        label.className="smde-tree-item"
        label.textContent=item.text
        label.onclick=e=>item.onclick?.(e)

        const children=document.createElement("div")
        children.className="smde-tree-children"

        if(item.tree){
            children.appendChild(item.tree)
            item.tree.parent_arrow=arrow
        }

        arrow.onclick=e=>{
            e.stopPropagation()

            if(!item.tree?.items.length)return

            const open=children.classList.toggle("open")
            arrow.textContent=open?"▾":"▸"
        }

        row.appendChild(arrow)
        row.appendChild(label)

        container.appendChild(row)
        container.appendChild(children)

        return container
    }

    refresh(){
        if(this.parent_arrow){
            this.parent_arrow.textContent=this.items.length?"▸":""
        }
    }
    insert_item(item, index) {
        const node = this.create_item(item)
        if (index === undefined || index >= this.items.length) {
            this.items.push(item)
            this.appendChild(node)
        } else {
            index = Math.max(0, index)
            this.items.splice(index, 0, item)
            this.insertBefore(node, this.children[index])
        }
        this.refresh()
        return node
    }

    clear(){
        this.items.length=0
        this.innerHTML=""
        this.refresh()
    }
}

customElements.define("smde-joystick", SMDEJoystick);
customElements.define('tabs-container', TabsContainer)
customElements.define("smde-menu", SMDEMenu)
customElements.define("smde-option-submenu", SMDEOptionSubMenu)
customElements.define("smde-window", SMDEWindow)
customElements.define("smde-tree",SMDETree)