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
class SMDEMenu extends HTMLElement {
    constructor(){
        super()
        this._connected=false
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
    connectedCallback(){
        this._connected=true
        this.rebuild()
    }
    rebuild(){
        this.onclick=()=>{
            setTimeout(()=>this.remove(),100)
        }
    }
    /**
     * 
     * @param {string} text 
     * @param {(event:MouseEvent)=>void} onclick 
     */
    add_option(text,onclick=(_e)=>{}){
        const node=document.createElement("smde-option")
        node.innerText=text
        node.addEventListener("click",onclick)
        this.appendChild(node)
    }
    /**
     * 
     * @param {string} text
     * @param {Menu} menu
     * @param {(event:MouseEvent)=>void} onclick
     */
    add_submenu(text, menu){
        const option = document.createElement("smde-option-submenu")
        const label = document.createElement("div")
        label.textContent = text
        option.appendChild(label)
        option.appendChild(menu)
        this.appendChild(option)
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
    connectedCallback(){
        this.content=document.createElement("div")
        this.content.innerHTML=this.innerHTML
        this.innerHTML=""
        this.appendChild(this.content)
        const top=document.createElement("div")
        top.className="smde-window-top"
        this.top=top
        this.appendChild(top)
        this.set_size(600,600)
        
        this.mouse_down_listener=(e)=>{
            if(!this.movable) return
            this.moving=true
            this.dragOffset.x = e.clientX - this.offsetLeft
            this.dragOffset.y = e.clientY - this.offsetTop
        }
        this.mouse_up_listener=(e)=>{
            this.moving=false
        }
        this.mouse_move_listener=(e)=>{
            if(!this.moving) return
            this.style.left = (e.clientX - this.dragOffset.x) + "px"
            this.style.top  = (e.clientY - this.dragOffset.y) + "px"
        }

        top.addEventListener("mousedown",this.mouse_down_listener)
        document.addEventListener("mouseup",this.mouse_up_listener)
        document.addEventListener("mousemove",this.mouse_move_listener)

        this.add_close_button()
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
customElements.define("smde-joystick", SMDEJoystick);
customElements.define('tabs-container', TabsContainer)
customElements.define("smde-menu", SMDEMenu)
customElements.define("smde-option-submenu", SMDEOptionSubMenu)
customElements.define("smde-window", SMDEWindow)