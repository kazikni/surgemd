return (class extends LevelPlayerScript{
    on_spawn_player(player){
        player.set_preset(this.preset)
    }
    on_start(){
        const gigi=this.game.humans.add_npc()
        this.level.load_character({
            "path":["../../characters/soldier.jsonc"],
            "position":{"x":15,"y":70},
            "name": "Gigi",
            "human":{
                "show_name":true
            },
            "group_color": 5205751,
            "loadout": {
                "hair": "hair_2",
                "hair_tint": 1122066,
                "body": "body_1",
                "body_tint": 15771967,
                "eyes": "eyes_2",
                "shirt": "red_shirt",
                "legs": "jeans_pants",
                "accessorys": [],
                "wrapping":"aqua_blue"
            }
        }).then(v=>{
            gigi.set_preset(v)
            gigi.set_script(async(s)=>{
                const speed=0.5

                await s.set_pathfinding(core.v2(13.2,56),speed)
                s.human.input.message="training time!"
                await s.sleep(1)
                s.human.input.interaction=true
                await s.sleep(2)

                await s.set_pathfinding(core.v2(13.2,49),speed)
                s.human.input.message="training time!"
                await s.sleep(1)
                s.human.input.interaction=true
                await s.sleep(1)

                await s.set_pathfinding(core.v2(13.2,42),speed)
                s.human.input.message="training time!"
                await s.sleep(1)
                s.human.input.interaction=true
                await s.sleep(1)

                await s.set_pathfinding(core.v2(15,50),speed)
                s.human.input.message="follow me"
                await s.set_pathfinding(core.v2(50.2,50),0.5)
                await s.sleep(3)
                s.set_random_walk(0.5)
            })
        })

        let npc=this.game.players.add_bot(new JoinPacket())
        npc.position=core.v2(12,51)
        /*npc=this.game.players.add_bot(new JoinPacket())
        npc.position=core.v2(10,46)
        npc=this.game.players.add_bot(new JoinPacket())
        npc.position=core.v2(12,46)*/
    }
    async on_load(){
        this.cutscene=await this.load_json("cutscenes/begin.jsonc")
    }
    async on_before(start_with_intro){
        const cutscene=[]
        if(start_with_intro)cutscene.push(...this.cutscene)
        cutscene.push(...this.make_level_intro())
        await this.show_cutscene(cutscene)
    }
    async on_begin(){
        this.preset=await this.level.load_character({
            "path":["../../characters/vinii.jsonc"],
            "position":{"x":10,"y":51},
            "boosts": [
                {"weight": 1, "def": "green_bless", "value": 1}
            ]
        })
    }
})