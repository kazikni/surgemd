import { GroupMemberState } from "common/scripts/packets/update_packet.ts";
import { TabApp, type TabManager } from "../managers/deviceManager.ts";
import { Boosts } from "common/scripts/definitions/player/boosts.ts";

export class MatchTabApp extends TabApp {
    alive: number = 0
    total: number = 0

    group: Record<number, GroupMemberState> = {}
    private groupCache = new Map<number, {
        root: HTMLDivElement
        hpFill: HTMLDivElement
        boostFill: HTMLDivElement
        last: GroupMemberState
    }>()

    constructor(tab: TabManager) {
        super("Match", "/assets/img/menu/gui/tab/icons/match.svg", tab)
    }

    override on_run(): void {
        this.element!.classList.add("tab-match-app")

        this.element!.innerHTML = `
        <div class="match-root">
            <div class="match-header">
                <div class="match-title">MATCH STATUS</div>
            </div>

            <div class="match-stats">
                <div class="stat-box">
                    <span class="label">Alive</span>
                    <span class="value" id="match-alive">0</span>
                </div>

                <div class="stat-box">
                    <span class="label">Total</span>
                    <span class="value" id="match-total">0</span>
                </div>
            </div>

            <div class="match-group">
                <div class="group-title">TEAM</div>
                <div class="group-list"></div>
            </div>
        </div>
        `
    }

    set_players(alive: number, total: number) {
        this.alive = alive
        this.total = total
        this.updateStats()
    }

    set_group(group: Record<number, GroupMemberState>) {
        this.group = group
        this.renderGroup()
    }

    private updateStats() {
        if (!this.element) return

        const aliveEl = this.element.querySelector("#match-alive")
        const totalEl = this.element.querySelector("#match-total")

        if (aliveEl) aliveEl.textContent = this.alive.toString()
        if (totalEl) totalEl.textContent = this.total.toString()
    }

    private renderGroup() {
        if (!this.element) return
        const container = this.element.querySelector(".group-list")!
        const used = new Set<number>()
        for (const [idStr, member] of Object.entries(this.group)) {
            const id = idStr as unknown as number
            const nameData = this.tab.game.ui.players_name[id]
            if (!nameData) continue
            used.add(id)
            let cached = this.groupCache.get(id)
            const hp = Math.floor(Math.max(0, Math.min(100, member.health * 100)))
            const boost = Math.floor(Math.max(0, Math.min(100, member.boost * 100)))
            if (!cached) {
                const root = document.createElement("div")
                root.className = "group-member"
                root.innerHTML = `
                    <div class="member-header">
                        <span class="member-id">${nameData.full}</span>
                    </div>
                    <div class="bars">
                        <div class="boost-bar">
                            <div class="fill"></div>
                        </div>
                        <div class="hp-bar">
                            <div class="fill"></div>
                        </div>
                    </div>
                `
                const hpFill = root.querySelector(".hp-bar .fill") as HTMLDivElement
                const boostFill = root.querySelector(".boost-bar .fill") as HTMLDivElement
                container.appendChild(root)
                cached = {
                    root,
                    hpFill,
                    boostFill,
                    last: { ...member }
                }
                this.groupCache.set(id, cached)
            }
            if (
                cached.last.health !== member.health ||
                cached.last.boost !== member.boost ||
                cached.last.boost_type !== member.boost_type
            ) {
                cached.hpFill.style.width = `${hp}%`
                cached.boostFill.style.width = `${boost}%`
                cached.boostFill.style.background = Boosts[member.boost_type].color

                cached.last = { ...member }
            }
        }
        for (const [id, cached] of this.groupCache) {
            if (!used.has(id)) {
                cached.root.remove()
                this.groupCache.delete(id)
            }
        }
    }

    override on_tick(_dt: number): void {
        // futuro: sync automático com game state
    }

    override on_stop(): void {}
}