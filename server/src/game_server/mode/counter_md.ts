import { ModeManager } from "./modeManager.ts";
import { type Human } from "../objects/human.ts";
import { Player } from "../objects/player.ts";
import { CounterMapDef } from "common/scripts/definitions/maps/base.ts";
import { Team, TeamsManager } from "./teams.ts";
import { JoinnedPacket, ShopItemType, type ShopNode } from "common/scripts/packets/joinned_packet.ts";
import { v2, Vec2 } from "common/engine/core.ts";
import { DamageReason, InventoryItemType } from "common/scripts/definitions/utils.ts";
import { GunClasses, GunDef } from "common/scripts/definitions/items/guns.ts";
import { GameItem } from "common/scripts/definitions/game_defs.ts";
import { NormalCounterMD } from "common/scripts/definitions/maps/normal.ts";
import { DeadZoneConfig, DefaultDeadzone } from "../others/deadzone.ts";
interface ShopItem{
    id:string
    cost:number
    count?:number
}
export interface CounterMDSettings{
    players?:{
        limit?:number
        earns?:{
            kill?:number
            join?:number
            win?:number
            lose?:number
        }
    }
    rules?:{
        team_need_win?:number // Max Rounds = team_need_win*2 - 1 
        freeze_time?:number
        round_time?:number
    }
    deadzone?:DeadZoneConfig
    map?:CounterMapDef|string
    shop?:ShopItem[]
}
export enum CounterMDState {
    Waiting,
    FreezeTime,
    Playing,
    RoundEnd,
    MatchEnd
}
export class CounterMD extends ModeManager {
    settings: {
        players:{
            limit:number
            earns:{
                kill:number
                join:number
                win:number
                lose:number
            }
        }
        rules:{
            team_need_win:number
            freeze_time:number
            round_time:number
        }
        deadzone:DeadZoneConfig
        map:CounterMapDef
        shop:ShopItem[]
    }

    shop:ShopNode[]=[]
    state: CounterMDState = CounterMDState.Waiting

    round = 0
    max_rounds: number
    round_timer = 0

    teams = new TeamsManager()
    teamA:Team
    teamB:Team

    score = {
        A: 0,
        B: 0
    }

    constructor(settings: CounterMDSettings) {
        super()
        this.settings = {
            players:{
                limit:settings.players?.limit??10,
                earns:{
                    kill:settings.players?.earns?.kill??150,
                    join:settings.players?.earns?.join??300,
                    win:settings.players?.earns?.win??500,
                    lose:settings.players?.earns?.lose??700,
                },
            },
            /*map:settings.map?(
                typeof settings.map==="string"?Maps[settings.map]:settings.map
            ):NormalCounterMD,*/
            map:settings.map as CounterMapDef??NormalCounterMD,
            rules:{
                team_need_win:settings.rules?.team_need_win??15,
                freeze_time:settings.rules?.freeze_time??8,
                round_time:settings.rules?.round_time??120,
            },
            shop:settings.shop??[
                {id:"9mm",count:30,cost:30},
                {id:"762mm",count:30,cost:50},
                {id:"556mm",count:30,cost:50},
                {id:"12g",count:10,cost:70},
                {id:"308sub",count:5,cost:250},

                {id:"m9",cost:60},
                {id:"pfeifer_zeliska",cost:3000},

                {id:"uzi",cost:300},
                {id:"vector",cost:1150},

                {id:"mp5",cost:140},
                {id:"ak47",cost:300},
                {id:"ar15",cost:340},
                {id:"famas",cost:650},

                {id:"kar98k",cost:1100},
                {id:"awp",cost:2000},
                {id:"awms",cost:3300},

                {id:"hp18",cost:160},
                {id:"m870",cost:340},
                {id:"spas12",cost:750},

                {id:"pkp",cost:3000},

                {id:"axe",cost:300},
                {id:"sledgehammer",cost:700},

                {id:"bandage",cost:5},
                {id:"medikit",cost:60},

                {id:"yellow_soda",cost:30},
                {id:"inhaler",cost:50},
                {id:"yellow_pills",cost:110},

                {id:"blue_soda",cost:30},
                {id:"blue_potion",cost:50},
                {id:"blue_pills",cost:110},

                {id:"frag_grenade",cost:50},
                {id:"mirv_grenade",cost:150},

                {id:"basic_helmet",cost:100},
                {id:"regular_helmet",cost:400},
                {id:"military_helmet",cost:800},

                {id:"basic_vest",cost:100},
                {id:"regular_vest",cost:400},
                {id:"military_vest",cost:800},

                {id:"basic_pack",cost:100},
                {id:"regular_pack",cost:400},
                {id:"military_pack",cost:800},

                {id:"scope_2",cost:90},
                {id:"scope_3",cost:250},
                {id:"scope_4",cost:400},
                {id:"scope_5",cost:900},
                {id:"scope_6",cost:1800},
                {id:"scope_7",cost:3600},
            ],
            deadzone:settings.deadzone??DefaultDeadzone
        }
        this.max_rounds = this.settings.rules.team_need_win * 2 - 1

        this.teamA=this.teams.add_team()
        this.teamB=this.teams.add_team()
    }
    render_shop() {
        const weaponsSections: Record<string, ShopNode[]> = {}
        const itemsSections: Record<string, ShopNode[]> = {}
        const equipmentSections: Record<string, ShopNode[]> = {}

        const push = (container: Record<string, ShopNode[]>, key: string, node: ShopNode) => {
            if (!container[key]) container[key] = []
            container[key].push(node)
        }

        for (const s of this.settings.shop) {
            const def = this.game.definitions.game_items.valueString[s.id]
            if (!def) continue

            const node: ShopNode = {
                id: s.id,
                type: ShopItemType.item,
                cost: s.cost
            }

            switch (def.item_type) {
                /* ---------------- WEAPONS ---------------- */
                case InventoryItemType.gun: {
                    const gun = def as GunDef
                    let section = "misc"

                    switch (gun.class) {
                        case GunClasses.Pistol: section = "pistols"; break
                        case GunClasses.SMG: section = "smg"; break
                        case GunClasses.Assault: section = "assault"; break
                        case GunClasses.Sniper: section = "snipers"; break
                        case GunClasses.Shotgun: section = "shotguns"; break
                        case GunClasses.LMG: section = "lmg"; break
                    }

                    push(weaponsSections, section, node)
                    break
                }
                case InventoryItemType.melee:{
                    push(weaponsSections, "melee", node)
                    break
                }
                case InventoryItemType.ammo:
                    push(weaponsSections, "ammo", node)
                    break
                /* ---------------- CONSUMABLES ---------------- */
                case InventoryItemType.consumible:
                    push(itemsSections, "health", node)
                    break

                case InventoryItemType.grenade:
                    push(itemsSections, "grenades", node)
                    break

                /* ---------------- EQUIPMENT ---------------- */
                case InventoryItemType.helmet:
                    push(equipmentSections, "helmets", node)
                    break

                case InventoryItemType.vest:
                    push(equipmentSections, "vests", node)
                    break

                case InventoryItemType.backpack:
                    push(equipmentSections, "backpacks", node)
                    break

                case InventoryItemType.scope:
                    push(equipmentSections, "scopes", node)
                    break
            }
        }

        const makeSections = (obj: Record<string, ShopNode[]>) => {
            return Object.keys(obj).map(k => ({
                id: k,
                type: ShopItemType.section,
                content: obj[k]
            }))
        }

        this.shop = []

        if (Object.keys(weaponsSections).length) {
            this.shop.push({
                id: "weapons",
                type: ShopItemType.tab,
                content: makeSections(weaponsSections)
            })
        }

        if (Object.keys(itemsSections).length) {
            this.shop.push({
                id: "items",
                type: ShopItemType.tab,
                content: makeSections(itemsSections)
            })
        }

        if (Object.keys(equipmentSections).length) {
            this.shop.push({
                id: "equipments",
                type: ShopItemType.tab,
                content: makeSections(equipmentSections)
            })
        }
    }
    /* ---------------- GAME FLOW ---------------- */
    override on_start() {
        this.start_freeze_time(true)
    }
    override on_tick(dt: number): void {
        if (this.state === CounterMDState.Playing) {
            this.round_timer+=dt
            if(this.round_timer>=this.settings.rules.round_time)this.end_round(undefined)
        }
    }
    start_freeze_time(first_round:boolean=false) {
        this.state = CounterMDState.FreezeTime
        this.game.deadzone.reset()
        for (const p of Object.values(this.game.players.connected_players)) {
            if(!first_round){
                if(p.human&&!p.human.dead){
                    p.human.clear_boost()
                    p.human.health_data.health=p.human.health_data.max_health

                    p.human.net_sync.full=true

                    p.human.human_data.movement_enabled = false
                    p.human.human_data.combat_enabled = false

                    const spawn=this.get_human_spawn_position(p.human)
                    if(spawn)p.human.position=spawn
                }else if(p.human&&p.human.dead){
                    p.add_player()
                }
            }

        }
        this.game.map.soft_reset()

        this.game.add_timeout(() => {
            this.start_round()
        }, this.settings.rules.freeze_time)
    }
    start_round() {
        this.state = CounterMDState.Playing
        this.round++
        this.round_timer = 0
        this.game.deadzone.start()

        for (const p of this.game.players.living_players) {
            p.human_data.movement_enabled = true
            p.human_data.combat_enabled = true
        }
    }
    end_round(winner?: "A" | "B") {
        if (this.state !== CounterMDState.Playing) return
        this.state = CounterMDState.RoundEnd
        if (winner) {
            this.score[winner]++
        }
        if (this.score.A >= this.settings.rules.team_need_win) {
            this.finish_match("A")
            return
        }
        if (this.score.B >= this.settings.rules.team_need_win) {
            this.finish_match("B")
            return
        }
        const winner_team=winner==="A"?this.teamA:this.teamB

        for(const p of Object.values(this.game.players.connected_players)){
            if(p.human){
                const win=p.human.team_data.team_id===winner_team.id;
                (p.human as Player).status.money+=win?this.settings.players.earns.win:this.settings.players.earns.lose
            }
        }
        this.game.add_timeout(() => {
            this.start_freeze_time()
        }, 5)
    }

    finish_match(winner: "A" | "B") {
        this.state = CounterMDState.MatchEnd
        this.game.finish()
    }

    /* ---------------- PLAYER EVENTS ---------------- */
    override on_player_die(p: Player) {
        const livingA = this.teamA.get_living_humans()
        const livingB = this.teamB.get_living_humans()

        if (livingA.length === 0) {
            this.end_round("B")
        } else if (livingB.length === 0) {
            this.end_round("A")
        }

        if(p.killed_by&&p.killed_by instanceof Player){
            p.killed_by.status.money+=this.settings.players.earns.kill
        }
    }
    override on_player_connect(p: Player){
        this.assign_team(p)
        p.status.money+=this.settings.players.earns.join
        const pos=this.get_human_spawn_position(p)
        if(pos)p.position=pos
        if(this.state==CounterMDState.Playing){
            p.die({amount:0,critical:false,position:v2(0,0),reason:DamageReason.Disconnect,direction:0})
        }

        if (!this.game.started && this.can_start()) {
            this.game.add_timeout(() => {
                if(this.can_start())this.game.start()
            }, 3)
        }
    }
    override on_player_join(p: Player) {
        this.give_start_weapon(p)
        if(this.state==CounterMDState.Waiting||this.state===CounterMDState.FreezeTime){
            p.human_data.movement_enabled = false
            p.human_data.combat_enabled = false
        }
    }
    can_start(): boolean {
        return this.game.players.living_players.length >= 2
    }
    can_join(): boolean {
        return Object.keys(this.game.players.connected_players).length < this.settings.players.limit
    }
    can_down(): boolean {
        return false
    }
    is_ally(a: Human, b: Human): boolean {
        return a.team_data.team_id === b.team_data.team_id
    }

    /* ---------------- TEAM LOGIC ---------------- */
    assign_team(p: Player) {
        const aCount = this.teamA.get_living_humans().length
        const bCount = this.teamB.get_living_humans().length

        if (aCount <= bCount) {
            this.teamA.add_human(p)
        } else {
            this.teamB.add_human(p)
        }
    }

    /* ---------------- SPAWN ---------------- */
    override get_human_spawn_position(human: Human): Vec2 | undefined {
        let shb=0
        if(human.team_data.team_id===this.teamA.id){
            shb=0
        }else{
            shb=1
        }

        return this.settings.map.spawn[shb].random_point()
    }
    /* ---------------- ECONOMY ---------------- */
    give_start_weapon(p:Player){
        if(!p.inventory.weapons[1]?.def&&!p.inventory.weapons[2]?.def){
            const def=this.game.definitions.game_items.valueString["m9"] as GunDef
            p.inventory.give_item(def,1,false,true)
            if(def.ammoSpawnAmount)p.inventory.give_item(this.game.definitions.ammos.getFromString(def.ammoSpawn??def.ammoType),def.ammoSpawnAmount-(def.reload?.capacity??0),false,true);
        }
    }
    override human_buy_item(human:Human,item:GameItem){
        const i=this.settings.shop.find((v)=>v.id==item.idString)
        if(i){
            if((human as Player).status.money>=i.cost){
                (human as Player).status.money=Math.max((human as Player).status.money-i.cost,0)

                human.inventory.give_item(item,i.count??1,true,true)
                if(item.item_type===InventoryItemType.gun&&(item as GunDef).ammoSpawnAmount){
                    human.inventory.give_item(this.game.definitions.ammos.getFromString((item as GunDef).ammoSpawn??(item as GunDef).ammoType),((i.count??1)*(item as GunDef).ammoSpawnAmount!)-(item.reload?.capacity??0),true)
                }
            }
        }
    }
    /* ---------------- MAP ---------------- */
    override generate_map(): void {
        this.game.map.generate(this.settings.map)
        this.game.deadzone.set_config(this.settings.deadzone)
        this.render_shop()
    }
    override manage_joinned_packet(jp: JoinnedPacket): void {
        jp.mode.shop=this.shop
    }
}