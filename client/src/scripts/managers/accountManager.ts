import { ShowTab } from "common/engine/client.ts";
import { API_BASE } from "../others/config.ts";
import { type MenuManager } from "./menuManager.ts";
import { CalculatePlayerLevel, CalculatePlayerLevelProgress} from "common/scripts/others/functions.ts";
import { GameDefinition } from "common/scripts/definitions/game_defs.ts";

export class AccountManager{
    enabled:boolean
    menu!:MenuManager
    skins:string[]=["default_skin"]
    content={
        submenu:document.body.querySelector("#menu-account-submenu") as HTMLDivElement,
    }
    definitions:GameDefinition
    constructor(definitions:GameDefinition){
        this.enabled=false
        this.definitions=definitions
    }
    connected:boolean=false
    async login(name:string,password:string){
        await fetch(`${API_BASE}/login`, {
            method: "POST",
            mode:"no-cors",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, password })
        });

        this.update_account()
    }
    async registry(name:string,password:string,password_confirm:string){
        if(password!==password_confirm)return
        const res = await fetch(`${API_BASE}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, password }),
            
        });

        if (res.status === 201) {
            await fetch(`${API_BASE}/login`, {
                method: "POST",
                mode:"no-cors",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, password })
            });
            this.update_account()
            console.log("Registered successfully!");
        } else {
            const text = await res.text();
            console.log(`Registration failed: ${text}`);
        }
    }
    // deno-lint-ignore no-explicit-any
    account_status:any={}
    async update_account(){
        const res=await fetch(`${API_BASE}/get-your-status`,{
            credentials: "include",
        })
        this.account_status=await res.json()
        if(!this.account_status.user){
            this.no_logged()
            console.log("not-logged")
            return
        }
        this.logged()

        if(this.connected){
            console.log("Logged As:",this.account_status.user.name,this.account_status)
            this.set_account_status(this.account_status)
        }
    }
    // deno-lint-ignore no-explicit-any
    set_account_status(status:any){
        const badge=this.definitions.badges.getFromNumber(0)
        const dd=document.body.querySelector("#account-sm-status") as HTMLDivElement
            dd.innerHTML=`
<span class="span" style="text-align:center; align-content:center;" id="coin-status-span">
    <img class="span-large-icon" src="./img/game/main/loadout/badges/${badge.idString}.svg"> ${status.user.name}
</span>
<div id="level-status-container">
    <p class="span-medium">Level: ${CalculatePlayerLevel(status.user.xp)}</p>
    <div id="level-bar-container">
        <div id="level-bar-content" style='width: ${Math.floor(CalculatePlayerLevelProgress(status.user.xp)*100)}%;'>
    </div>
</div>
<br>
<div id="status-container-info">
    <span class="span" id="coin-status-span">
        Coins: ${status.user.coins}<img class="span-large-icon" src="./img/menu/icons/coin.svg">
    </span>
    <span class="span" id="kills-status-span">
        Kills: ${status.user.kills}<img class="span-large-icon" src="./img/menu/icons/kills.svg">
    </span>
    <span class="span" id="wins-status-span">
        Wins: ${status.user.wins}<img class="span-large-icon" src="./img/menu/icons/win.svg">
    </span>
    <span class="span" id="special-wins-status-span">
        Special Wins: ${status.user.special_wins}<img class="span-large-icon" src="./img/menu/icons/special_win.svg">
    </span>
    <span class="span" id="games-status-span">
        Games Played: ${status.user.games_total}<img class="span-large-icon" src="./img/menu/icons/game.svg">
    </span>
</div>
`
    }
    menu_tabs:Record<string,Record<string,HTMLElement>>={}
    setupTabButtons(buttons:Record<string,HTMLButtonElement>,menu_tabs:Record<string,HTMLDivElement>) {
        const btns=Object.keys(buttons)
        ShowTab(btns[0], menu_tabs)
        for (const btnName of btns) {
            const btn = buttons[btnName]
            btn.addEventListener("click", () => ShowTab(btnName, menu_tabs))
        }
    }
    enable(menu:MenuManager){
        this.menu=menu
        this.update_account()
    }
    deenabled(menu:MenuManager){
        
    }
    async logout(){
        if(this.connected){
            const res=await fetch(`${API_BASE}/logout`, {
                method: "POST",
                mode:"no-cors",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                //body: JSON.stringify({})
            });
            this.connected=false
            this.update_account()
        }
    }
    no_logged(){
        this.connected=false
        this.content.submenu.innerHTML=`
<kl-md-submenu-content>
    <kl-md-menu-options id="account-options">
        <button class="btn-green" id="btn-account-login">Login</button>
        <button class="btn-green" id="btn-account-register">Register</button>
    </kl-md-menu-options>
    <kl-md-extra id="account-sm-extra">
        <div class="background-menu-md background-menu-ss background-menu" id="account-sm-login">
        <span class="span">Login</span>
        <input class="text-input" id="input-login-name" placeholder="Username">
        <input class="text-input" id="input-login-password" type="password" placeholder="Password">
        <button class="btn-green" id="btn-login">Login</button>
        </div>
        <div class="background-menu-md background-menu-ss background-menu" id="account-sm-register">
        <span class="span">Registry</span>
        <input class="text-input" id="input-register-name" placeholder="Username">
        <input class="text-input" id="input-register-password" type="password" placeholder="Password">
        <input class="text-input" id="input-register-confirm-password" type="password" placeholder="Confirm Password">
        <button class="btn-green" id="btn-register">Registry</button>
        </div>
    </kl-md-extra>
    <button class="btn-red close-btn submenu-close-btn" play-sound="button_click">X</button>
</kl-md-submenu-content>
`
        this.menu.reload_close_btn()
        this.setupTabButtons(
            {
                "login":document.body.querySelector("#btn-account-login") as HTMLButtonElement,
                "register":document.body.querySelector("#btn-account-register") as HTMLButtonElement,
            },
            {
                "login":document.body.querySelector("#account-sm-login") as HTMLDivElement,
                "register":document.body.querySelector("#account-sm-register") as HTMLDivElement,
            }
        )
        
        const inputs:Record<string,HTMLInputElement>={
            "login-name":document.body.querySelector("#input-login-name") as HTMLInputElement,
            "login-password":document.body.querySelector("#input-login-password") as HTMLInputElement,

            "register-name":document.body.querySelector("#input-register-name") as HTMLInputElement,
            "register-password":document.body.querySelector("#input-register-password") as HTMLInputElement,
            "register-confirm-password":document.body.querySelector("#input-register-confirm-password") as HTMLInputElement,
        }
        let btn=document.body.querySelector("#btn-login") as HTMLButtonElement
        btn.onclick=(_e)=>this.login(inputs["login-name"].value,inputs["login-password"].value)

        btn=document.body.querySelector("#btn-register") as HTMLButtonElement
        btn.onclick=(_e)=>this.registry(inputs["register-name"].value,inputs["register-password"].value,inputs["register-confirm-password"].value)
    }
    logged(){
        this.connected=true

                this.content.submenu.innerHTML=`
<kl-md-submenu-content>
    <kl-md-menu-options id="account-options">
        <button class="btn-green" id="btn-account-status">Status</button>
        <button class="btn-green" id="btn-account-others">Others</button>
    </kl-md-menu-options>
    <kl-md-extra id="account-sm-extra">
        <div class="background-menu-md background-menu-ss background-menu" id="account-sm-status">
        </div>
        <div class="background-menu-md background-menu-ss background-menu" id="account-sm-others">
            <button class="btn-green" id="btn-logout">Logout</button>
        </div>
    </kl-md-extra>
    <button class="btn-red close-btn submenu-close-btn" play-sound="button_click">X</button>
</kl-md-submenu-content>
`
        this.menu.reload_close_btn()
        this.setupTabButtons(
            {
                "status":document.body.querySelector("#btn-account-status") as HTMLButtonElement,
                "others":document.body.querySelector("#btn-account-others") as HTMLButtonElement,
            },
            {
                "status":document.body.querySelector("#account-sm-status") as HTMLDivElement,
                "others":document.body.querySelector("#account-sm-others") as HTMLDivElement,
            }
        )

        let btn=document.body.querySelector("#btn-logout") as HTMLButtonElement
        btn.onclick=(_e)=>this.logout()
    }
}