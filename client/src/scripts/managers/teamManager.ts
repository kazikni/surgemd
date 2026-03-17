import { Game } from "../others/game.ts";
export interface TeamSetting{
    code:string;
}
export class TeamManager {
    team?:TeamSetting
    game:Game
    constructor(game:Game){
        this.game=game
    }
    async make_team(){
        if(this.team) return this.team
        const response = await fetch('/api/teams/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                player:this.game.save.get_variable("sv_loadout_name"),
                code:"",
            })
        })
    }
}