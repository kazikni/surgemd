return (class extends LevelPlayerScript{
    on_spawn_player(player){
        const pos=this.game.modeManager.get_human_spawn_position(player)
        if(pos)player.position=pos
        player.set_preset(this.preset)
    }
    async on_load(){
        await this.send_message_event({type:OnlineMessageType.Load,assets:{"gameplay_music":"/assets/sounds/musics/online/game_fall_music_1.mp3"}})
        this.background=await this.load_json("../../backgrounds/city_river_bloodmoon.json")
    }
    async on_begin(){
        this.preset=await this.level.load_character({
            "path": "../../characters/vinii.jsonc",
            "boosts": [
                {"weight": 1, "def": "green_bless", "value": 1}
            ],
            "inventory": {
                "hand": 1,
                "team": 0,
                "backpack": [{"item": "tactical_pack","weight": 1}],
                "vest": [{"item": "elite_vest","weight": 1,"droppable": false}],
                "helmet": [{"item": "lastman_helmet","weight": 1,"droppable": false}],
                "melee": [
                    {"item": "bonesaw","weight": 1},
                    {"item": "pan","weight": 1}
                ],
                "gun1": [
                    {"item": "spas12","weight": 1},
                    {"item": "m870","weight": 1},
                    {"item": "awm","weight": 0.5},
                    {"item": "awp","weight": 0.5}
                ],
                "gun2": [
                    {"item": "pkp","weight": 30},
                    {"item": "m249","weight": 27},
                    {"item": "xm556","weight": 25}
                ],
                "items": [
                    [{"item": "bandage", "count": 15, "weight": 1}],
                    [{"item": "medikit", "count": 4, "weight": 1}],
                    [{"item": "frag_grenade", "count": 12, "weight": 1}],
                    [{"item": "mirv_grenade", "count": 10, "weight": 1}],
                    [{"item": "molotov", "count": 5, "weight": 1}],
                    [{"item": "yellow_flare","count": 6,"weight": 1}],
                    [{"item": "red_flare","count": 1,"weight": 1}]
                ],
                "aitems":{
                    "12g":80,
                    "556mm":320,
                    "762mm":320,
                    "9mm":400,
                    "22lr":400,
                    "45acp":320,
                    "308sub":40
                },
                "iitems": [
                    "scope_2",
                    "scope_3",
                    "scope_4"
                ],
                "accessorys": [
                    [
                        {"item": "rip_ammo", "weight": 1, "droppable": false},
                        {"item": "hp_bullets", "weight": 1,"droppable": false}
                    ]
                ]
            }
        })
        this.game.set_rain(1)
    }
    async on_before(){
        const cutscene=[]
        cutscene.push({
            type:HistoryCommandType.SetMusic,
            music:"gameplay_music",
        },{
            type:HistoryCommandType.SetBackground,
            background:this.background,
            timescale:70
        })
        cutscene.push(...this.make_level_intro())
        await this.show_cutscene(cutscene)
    }
    on_start(){
        this.game.deadzone.jump_stages(4)
        this.game.modeManager.add_enemies([
            {
                "def": {
                    "ai": {
                        "kind": "dumb"
                    },
                    "boosts": [
                        {"weight": 7,"def": "adrenaline","value": 0},
                        {"weight": 1,"def": "adrenaline","value": 1},
                        {"weight": 1,"def": "shield","value": 1}
                    ],
                    "inventory": {
                        "infinity_ammo": true,
                        "hand": 1,
                        "backpack": [
                            {
                                "item": "",
                                "weight": 28
                            },
                            {
                                "item": "basic_pack",
                                "weight": 20
                            },
                            {
                                "item": "military_pack",
                                "weight": 15,
                                "drop_chance": 0.3
                            },
                            {
                                "item": "tactical_pack",
                                "weight": 10,
                                "drop_chance": 0.5
                            }
                        ],
                        "vest": [
                            {
                                "item": "",
                                "weight": 28
                            },
                            {
                                "item": "civil_vest",
                                "weight": 20,
                                "drop_chance": 0.3
                            },
                            {
                                "item": "military_vest",
                                "weight": 15,
                                "drop_chance": 0.5
                            },
                            {
                                "item": "tactical_vest",
                                "weight": 10,
                                "drop_chance": 0.75
                            }
                        ],
                        "helmet": [
                            {
                                "item": "",
                                "weight": 28
                            },
                            {
                                "item": "bike_helmet",
                                "weight": 20,
                                "drop_chance": 0.5
                            },
                            {
                                "item": "military_helmet",
                                "weight": 15,
                                "drop_chance": 0.3
                            },
                            {
                                "item": "tactical_helmet",
                                "weight": 10,
                                "drop_chance": 0.75
                            }
                        ],
                        "melee": [
                            {
                                "item": "fist",
                                "weight": 30
                            },
                            {
                                "item": "survival_knife",
                                "weight": 15
                            },
                            {
                                "item": "shovel",
                                "weight": 10
                            },
                            {
                                "item": "axe",
                                "weight": 5
                            },
                            {
                                "item": "crowbar",
                                "weight": 4
                            },
                            {
                                "item": "katana",
                                "weight": 1
                            },
                            {
                                "item": "sledgehammer",
                                "weight": 0.75
                            },
                            {
                                "item": "pan",
                                "weight": 0.75
                            }
                        ],
                        "gun1": [
                            {
                                "item": "m9",
                                "weight": 20
                            },
                            {
                                "item": "m9_dual",
                                "weight": 15
                            },
                            {
                                "item": "taurustx",
                                "weight": 20
                            },
                            {
                                "item": "taurustx_dual",
                                "weight": 15
                            },
                            {
                                "item": "ak47",
                                "weight": 10
                            },
                            {
                                "item": "hp18",
                                "weight": 8
                            },
                            {
                                "item": "m870",
                                "weight": 5
                            },
                            {
                                "item": "spas12",
                                "weight": 1
                            },
                            {
                                "item": "kar98k",
                                "weight": 1
                            },
                            {
                                "item": "awp",
                                "weight": 0.5
                            },
                            {
                                "item": "m2_2",
                                "weight": 0.5
                            },
                            {
                                "item": "pkp",
                                "weight": 0.1
                            },
                            {
                                "item": "awm",
                                "weight": 0.1
                            }
                        ],
                        "aitems": {
                            "12g": 15,
                            "556mm": 100,
                            "762mm": 100,
                            "45acp": 100,
                            "9mm": 100,
                            "22lr": 100
                        }
                    },
                    "team":1
                },
                "count": 12
            },
            {
                "def": {
                    "ai": {
                        "kind": "advanced_legacy"
                    },
                    "boosts": [
                        {"weight": 1,"def": "adrenaline","value": 0},
                        {"weight": 1,"def": "adrenaline","value": 1},
                        {"weight": 1,"def": "shield","value": 1}
                    ],
                    "inventory": {
                        "infinity_ammo": true,
                        "hand": 1,
                        "backpack": [
                            {"item": "basic_pack","weight": 15},
                            {"item": "military_pack","weight": 10},
                            {"item": "tactical_pack","weight": 5}
                        ],
                        "vest": [
                            {"item": "civil_vest","weight": 15},
                            {"item": "military_vest","weight": 10},
                            {"item": "tactical_vest","weight": 5}
                        ],
                        "helmet": [
                            {"item": "bike_helmet","weight": 15},
                            {"item": "military_helmet","weight": 10},
                            {"item": "tactical_helmet","weight": 5}
                        ],
                        "melee": [
                            {
                                "item": "fist",
                                "weight": 11
                            },
                            {
                                "item": "survival_knife",
                                "weight": 10
                            },
                            {
                                "item": "shovel",
                                "weight": 10
                            },
                            {
                                "item": "axe",
                                "weight": 5
                            },
                            {
                                "item": "crowbar",
                                "weight": 5
                            },
                            {
                                "item": "katana",
                                "weight": 1
                            },
                            {
                                "item": "sledgehammer",
                                "weight": 0.75
                            },
                            {
                                "item": "pan",
                                "weight": 0.75
                            },
                            {
                                "item": "bonesaw",
                                "weight": 0.25
                            }
                        ],
                        "gun1": [
                            {"item": "m870","weight": 5},
                            {"item": "hp18","weight": 5},
                            {"item": "model94","weight": 3},
                            {"item": "blr81","weight": 3},
                            {"item": "spas12","weight": 1.5},
                            {"item": "kar98k","weight": 1.5},
                            {"item": "awp","weight": 0.5},
                            {"item": "awm","weight": 0.1}
                        ],
                        "gun2": [
                            {"item": "m9_dual", "weight": 10},
                            {"item": "taurustx_dual","weight": 10},
                            {"item": "mp5","weight": 7},
                            {"item": "ak47","weight": 7},
                            {"item": "ar15","weight": 7},
                            {"item": "colt1873_dual","weight": 6},
                            {"item": "desert_eagle","weight": 6},
                            {"item": "m1921","weight": 5},
                            {"item": "famas","weight": 5},
                            {"item": "kar98k","weight": 1},
                            {"item": "awp","weight": 0.5},
                            {"item": "desert_eagle_dual","weight": 0.5},
                            {"item": "pkp","weight": 0.1}
                        ],
                        "aitems": {
                            "12g": 30,
                            "556mm": 160,
                            "762mm": 160,
                            "45acp": 160,
                            "9mm": 200,
                            "22lr": 200
                        }
                    },
                    "loadout":{
                        "wrapping":["aqua","shiny","aqua_blue","gradient"]
                    },
                    "team":1
                },
                "count": 24
            },
            {
                "def": {
                    "name": "Gigi",
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
                    },
                    "ai": {
                        "kind": "advanced_legacy"
                    },
                    "boosts": [
                        {"weight": 1,"def": "adrenaline","value": 1},
                        {"weight": 1,"def": "shield","value": 1}
                    ],
                    "inventory": {
                        "infinity_ammo": true,
                        "hand": 1,
                        "backpack": [{"item": "tactical_pack","weight": 1}],
                        "vest": [{"item": "tactical_vest","weight": 1}],
                        "helmet": [{"item": "medic_helmet","weight": 1}],
                        "melee": [{"item": "bonesaw","weight": 3},{"item": "pan","weight": 1}],
                        "gun1": [
                            {"item": "m870","weight": 5},
                            {"item": "spas12","weight": 1.5},
                            {"item": "kar98k","weight": 1.5},
                            {"item": "awp","weight": 0.5},
                            {"item": "awm","weight": 0.1}
                        ],
                        "gun2": [
                            {"item": "kar98k","weight": 1},
                            {"item": "awp","weight": 0.5},
                            {"item": "awm","weight": 0.1}
                        ],
                        "aitems": {
                            "12g": 80,
                            "556mm": 320,
                            "762mm": 320,
                            "45acp": 320,
                            "9mm": 400,
                            "22lr": 400
                        }
                    },
                    "team":1
                },
                "count": 1
            }
        ])
    }
})