return (class extends LevelPlayerScript{
    async initialize_mode(){
        await this.game.auto_init({
            //"group_size":4,
            mode:"normal",
            settings:{
                map: {
                    def: "tutorial",
                    //disable_minimap:true
                }
            }
        })
    }
    on_spawn_player(player){
        player.set_preset(this.preset)
        //this.group.add_human(player)
    }
    on_start(){
        this.game.modeManager.rules.feed.enabled=false
        this.game.modeManager.rules.leader.enabled=false
        /*this.group=this.game.modeManager.create_group()

        const gigi=this.game.humans.add_npc()
        gigi.set_preset(this.characters[0])
        gigi.set_script(async(s)=>{
            const speed=0.5

            await s.set_pathfinding(v2(13.2,56),speed)
            s.human.input.message="training time!"
            await s.sleep(1)
            s.human.input.interaction=true
            await s.sleep(2)

            await s.set_pathfinding(v2(13.2,49),speed)
            s.human.input.message="training time!"
            await s.sleep(1)
            s.human.input.interaction=true
            await s.sleep(1)

            await s.set_pathfinding(v2(13.2,42),speed)
            s.human.input.message="training time!"
            await s.sleep(1)
            s.human.input.interaction=true
            await s.sleep(1)

            await s.set_pathfinding(v2(15,50),speed)
            s.human.input.message="follow me"
            await s.set_pathfinding(v2(50.2,50),0.5)
            await s.sleep(3)
            s.set_random_walk(0.5)
        })

        let bot=this.game.players.add_bot(new JoinPacket())
        bot.human.set_preset(this.characters[1])
        this.group.add_human(bot.human)

        bot=this.game.players.add_bot(new JoinPacket())
        bot.human.set_preset(this.characters[2])
        this.group.add_human(bot.human)

        bot=this.game.players.add_bot(new JoinPacket())
        bot.human.set_preset(this.characters[3])
        this.group.add_human(bot.human)*/

        this.game.modeManager.add_enemies([
            {
                "def": {
                    "ai": {
                        "kind": "dumb"
                    },
                    position:{"x":10,"y":51},
                },
            }
        ])

        /*npc=this.game.players.add_bot(new JoinPacket())
        npc.position=v2(10,46)
        npc=this.game.players.add_bot(new JoinPacket())
        npc.position=v2(12,46)*/
    }
    async on_load(){
        this.cutscene=await this.load_json("cutscenes/begin.jsonc")

        this.characters=[
            await this.level.load_character({
                path:["../../characters/soldier.jsonc"],
                position:{x:15,y:70},
                name: "Gigi",
                human:{
                    "show_name":true
                },
                group_color: 5205751,
                loadout: {
                    hair: "hair_2",
                    hair_tint: 1122066,
                    body: "body_1",
                    body_tint: 15771967,
                    eyes: "eyes_2",
                    shirt: "red_shirt",
                    legs: "blue_jeans_pants",
                    accessorys: [],
                    wrapping:"aqua_blue"
                }
            }),
            {
                name: "Roommate-1",
                position:{x:12,y:51},
                loadout: {
                    hair: "hair_2",
                    hair_tint: 1122066,
                    body: "body_1",
                    body_tint: 15771967,
                    eyes: "eyes_2",
                    shirt: "blue_shirt",
                    legs: "blue_jeans_pants",
                    accessorys: [],
                }
            },
            {
                name: "Roommate-2",
                position:{x:12,y:51},
                loadout: {
                    hair: "hair_2",
                    hair_tint: 1122066,
                    body: "body_1",
                    body_tint: 15771967,
                    eyes: "eyes_2",
                    shirt: "blue_shirt",
                    legs: "blue_jeans_pants",
                    accessorys: [],
                }
            },
            {
                name: "Roommate-3",
                position:{x:10,y:49},
                loadout: {
                    hair: "hair_2",
                    hair_tint: 1122066,
                    body: "body_1",
                    body_tint: 15771967,
                    eyes: "eyes_2",
                    shirt: "blue_shirt",
                    legs: "blue_jeans_pants",
                    accessorys: [],
                }
            }
        ]
    }
    async on_before(start_with_intro){
        const cutscene=[]
        //if(start_with_intro)cutscene.push(...this.cutscene)
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