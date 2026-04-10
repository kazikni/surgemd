import { InputActionType } from "common/scripts/packets/input_packet.ts";
import { TabApp, TabManager } from "../managers/tabManager.ts";

export class DebugTabApp extends TabApp {

    constructor(tab: TabManager) {
        super("Debug", "/img/menu/gui/tab/icons/debug.svg", tab)
    }

    override on_run(): void {
        this.element!.classList.add("tab-debug-app")

        this.element!.innerHTML = `
        <div class="debug-container">
            <h2>Debug Tools</h2>

            <div class="debug-section search-section">
                <label>Item ID</label>
                <input class="text-input" id="debug-item-id" placeholder="Search item...">
                <div class="search-results" id="debug-search-results"></div>
            </div>

            <div class="debug-section">
                <label>Item Count</label>
                <input class="text-input" id="debug-item-count" value="1" type="number">
            </div>

            <div class="debug-actions">
                <button class="btn-blue" id="debug-give-item">Give Item</button>
                <button class="btn-blue" id="debug-spawn-item">Spawn Item</button>
            </div>

            <div class="debug-info">
                <div id="debug-stats"></div>
            </div>
        </div>
        `

        const idInput = this.element!.querySelector("#debug-item-id") as HTMLInputElement
        const countInput = this.element!.querySelector("#debug-item-count") as HTMLInputElement
        const resultsBox = this.element!.querySelector("#debug-search-results") as HTMLDivElement
        const giveBtn = this.element!.querySelector("#debug-give-item") as HTMLButtonElement
        const spawnBtn = this.element!.querySelector("#debug-spawn-item") as HTMLButtonElement

        const allItems = Object.keys(this.tab.game.definitions.game_items.keysString)

        let selectedIndex = -1
        let filtered: string[] = []

        const renderResults = () => {
            resultsBox.innerHTML = ""

            if (!filtered.length) {
                resultsBox.style.display = "none"
                return
            }

            resultsBox.style.display = "block"

            filtered.slice(0, 20).forEach((item, i) => {
                const div = document.createElement("div")
                div.className = "search-item" + (i === selectedIndex ? " active" : "")
                div.innerText = item

                div.onclick = () => {
                    idInput.value = item
                    resultsBox.style.display = "none"
                }

                resultsBox.appendChild(div)
            })
        }

        idInput.addEventListener("input", () => {
            const value = idInput.value.toLowerCase()

            if (!value) {
                filtered = []
                renderResults()
                return
            }

            const starts = allItems.filter(k => k.startsWith(value))
            const contains = allItems.filter(k => k.includes(value) && !k.startsWith(value))

            filtered = [...starts, ...contains]
            selectedIndex = -1
            renderResults()
        })

        idInput.addEventListener("keydown", (e) => {
            if (!filtered.length) return

            if (e.key === "ArrowDown") {
                selectedIndex = (selectedIndex + 1) % filtered.length
                renderResults()
                e.preventDefault()
            }

            if (e.key === "ArrowUp") {
                selectedIndex = (selectedIndex - 1 + filtered.length) % filtered.length
                renderResults()
                e.preventDefault()
            }

            if (e.key === "Enter" && selectedIndex >= 0) {
                idInput.value = filtered[selectedIndex]
                resultsBox.style.display = "none"
            }
        })

        const disableAct = () => this.tab.game.can_act = false
        const enableAct = () => this.tab.game.can_act = true

        idInput.onfocus = disableAct
        idInput.onblur = () => {
            setTimeout(() => resultsBox.style.display = "none", 100)
            enableAct()
        }

        countInput.onfocus = disableAct
        countInput.onblur = enableAct

        giveBtn.onclick = () => {
            this.tab.game.input.actions.push({
                type: InputActionType.debug_give,
                item: idInput.value,
                count: parseInt(countInput.value) || 1
            })
        }

        spawnBtn.onclick = () => {
            this.tab.game.input.actions.push({
                type: InputActionType.debug_spawn,
                item: idInput.value,
                count: parseInt(countInput.value) || 1
            })
        }
    }

    override on_tick(dt: number): void {
        const stats = this.element!.querySelector("#debug-stats") as HTMLDivElement
        if (!stats) return

        stats.innerHTML = `
            FPS: ${Math.floor(1 / this.tab.game.delta_time)}<br>
            Ping: ${this.tab.game.client?.ping ?? 0}<br>
            X: ${this.tab.game.active_entity?.position.x}<br>
            Y: ${this.tab.game.active_entity?.position.y}<br>
            Profilers ${Object.values(this.tab.game.clock.profiler.data)}
        `
    }

    override on_stop(): void {}
}