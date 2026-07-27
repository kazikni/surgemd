import { TabApp, TabManager } from "../managers/deviceManager.ts";
import { ShopItemType, ShopNode } from "common/scripts/packets/joinned_packet.ts";
import { InputActionType } from "common/scripts/packets/input_packet.ts";

export class ShopTabApp extends TabApp {
    private shopData: ShopNode[] = []
    private currentTab?: ShopNode&{type:ShopItemType.tab}
    private currentSection?: ShopNode&{type:ShopItemType.section}

    old_money:number=-1

    buy_item?:ShopNode
    constructor(tab: TabManager) {
        super("Shop", "/assets/img/menu/gui/tab/icons/shop.svg", tab)
    }

    set_shop(data: ShopNode[]) {
        this.shopData = data
        if(this.element)this.renderTabs()
    }

    override on_run(): void {
        this.element!.classList.add("tab-shop-app")

        this.element!.innerHTML = `
        <div class="shop-root">
            <div class="shop-tabs-row">
                <div class="shop-tabs"></div>
                <div class="shop-money">
                    $<span id="shop-money-value">0</span>
                </div>
            </div>
            <div class="shop-body">
                <div class="shop-sections"></div>
                <div class="shop-items"></div>
                <div class="shop-preview"></div>
            </div>
        </div>
        `

        this.renderTabs()
    }

    private renderTabs() {
        const tabContainer = this.element!.querySelector(".shop-tabs")!
        tabContainer.innerHTML = ""

        this.shopData.forEach(tab => {
            if (tab.type !== ShopItemType.tab) return

            const div = document.createElement("div")
            div.className = "shop-tab"
            div.innerText = tab.name ?? tab.id

            div.onclick = () => {
                this.currentTab = tab
                this.renderSections()
            }

            tabContainer.appendChild(div)
        })

        if (this.shopData.length) {
            this.currentTab = this.shopData[0] as ShopNode&{type:ShopItemType.tab}
            this.renderSections()
        }
    }

    private renderSections() {
        const secContainer = this.element!.querySelector(".shop-sections")!
        secContainer.innerHTML = ""

        if (!this.currentTab || !("content" in this.currentTab)) return

        this.currentTab.content.forEach(section => {
            if (section.type !== ShopItemType.section) return

            const div = document.createElement("div")
            div.className = "shop-section"
            div.innerHTML = `
                ${section.icon ? `<img src="${section.icon}">` : ""}
                <span>${section.name ?? section.id}</span>
            `

            div.onclick = () => {
                this.currentSection = section
                this.renderItems()
            }

            secContainer.appendChild(div)
        })

        if (this.currentTab.content.length) {
            this.currentSection = this.currentTab.content[0] as (ShopNode&{type:ShopItemType.section})
            this.renderItems()
        }
    }

    private renderItems() {
        const itemContainer = this.element!.querySelector(".shop-items")!
        itemContainer.innerHTML = ""

        if (!this.currentSection || !("content" in this.currentSection)) return

        this.currentSection.content.forEach(node => {
            if (node.type !== ShopItemType.item&&node.type!==ShopItemType.clicable) return

            let icon:string|undefined
            let name:string|undefined

            if(node.type===ShopItemType.item){
                const def=this.tab.game.definitions.game_items.valueString[node.id]
                icon=this.game.resources.get_frame(def.idString).src
                name=this.game.language.get(def.idString)
            }
            const div = document.createElement("div")
            div.className = "shop-item-card"
            div.innerHTML = `
            
            <div class="shop-item-icon">
                ${icon ? `<img src="${icon}">` : ""}
            </div>

            <div class="shop-item-name">
                ${name ?? node.id}
            </div>
            <div class="shop-item-cost">
                $${
                    // deno-lint-ignore ban-ts-comment
                    // @ts-ignore
                    node.cost ?? 0
                }
            </div>`

            div.onclick = () => {
                this.renderPreview(node)
                //node.on_click?.(this, node)
            }

            itemContainer.appendChild(div)
        })
        this.updateItemAffordability()
    }

    private renderPreview(node: ShopNode) {
        const preview = this.element!.querySelector(".shop-preview")!
        let icon:string|undefined
        let name:string|undefined
        if(node.type===ShopItemType.item){
            const def=this.tab.game.definitions.game_items.valueString[node.id]
            icon=this.game.resources.get_frame(def.idString).src
            name=this.game.language.get(def.idString)
        }
        if(node.icon)icon=node.icon
        if(node.name)name=this.game.language.get(node.name)
        
        preview.innerHTML = `
        <div class="shop-preview-content">
            <h3>${name ?? node.id}</h3>

            <div class="preview-image">
                ${icon ? `<img src="${icon}">` : ""}
            </div>

            <div class="shop-preview-cost">
                $${
                    // deno-lint-ignore ban-ts-comment
                    // @ts-ignore
                    node.cost ?? 0
                }
            </div>

            <button class="btn-green shop-buy-btn">BUY</button>
        </div>`

        const btn=preview.querySelector(".shop-buy-btn") as HTMLButtonElement
        btn.onclick=(e)=>{
            this.buy_item=node
        }
    }

    override on_stop(): void {}
    override on_tick(dt: number): void {
        const money = this.game.ui.money

        if(this.buy_item){
            this.game.input.actions.push({
                type:InputActionType.buy_on_shop,
                item_id:this.tab.game.definitions.game_items.keysString[this.buy_item.id]
            })
            this.buy_item=undefined
        }
        if (money === this.old_money||!this.element) return

        const el = this.element!.querySelector("#shop-money-value") as HTMLSpanElement
        const container = this.element!.querySelector(".shop-money") as HTMLDivElement

        if (!el || !container) return

        const old = this.old_money
        el.innerText = money.toString()

        if (old !== -1) {
            container.classList.remove("flash-up", "flash-down")

            if (money > old) {
                container.classList.add("flash-up")
            } else if (money < old) {
                container.classList.add("flash-down")
            }
        }

        this.old_money = money

        this.updateItemAffordability()
    }
    private updateItemAffordability() {
        const money = this.game.ui.money ?? 0
        const cards = this.element!.querySelectorAll(".shop-item-card")

        cards.forEach(card => {
            const costEl = card.querySelector(".shop-item-cost")
            if (!costEl) return

            const cost = parseInt(costEl.textContent?.replace("$", "") ?? "0")

            if (cost > money) {
                card.classList.add("disabled")
            } else {
                card.classList.remove("disabled")
            }
        })
    }
}