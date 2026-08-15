return (class extends LevelPlayerScript{
    on_start(){
        this.game.modeManager.add_enemies([
            {
                "def": {
                    "ai": {
                        "kind": "advanced_legacy"
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
                                "item": "basic_pack",
                                "weight": 10
                            },
                            {
                                "item": "military_pack",
                                "weight": 1
                            },
                            {
                                "item": "tactical_pack",
                                "weight": 0.1
                            }
                        ],
                        "vest": [
                            {
                                "item": "civil_vest",
                                "weight": 10
                            },
                            {
                                "item": "military_vest",
                                "weight": 1
                            },
                            {
                                "item": "tactical_vest",
                                "weight": 0.1
                            }
                        ],
                        "helmet": [
                            {
                                "item": "bike_helmet",
                                "weight": 10
                            },
                            {
                                "item": "military_helmet",
                                "weight": 1
                            },
                            {
                                "item": "tactical_helmet",
                                "weight": 0.1
                            }
                        ],
                        "melee": [
                            {
                                "item": "fist",
                                "weight": 30
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
                                "item": "bonesaw",
                                "weight": 0.75
                            },
                            {
                                "item": "pan",
                                "weight": 0.75
                            }
                        ],
                        "gun1": [
                            {
                                "item": "model94",
                                "weight": 6
                            },
                            {
                                "item": "blr81",
                                "weight": 4
                            },
                            {
                                "item": "kar98k",
                                "weight": 1.5
                            },
                            {
                                "item": "awp",
                                "weight": 0.5
                            },
                            {
                                "item": "awm",
                                "weight": 0.1
                            }
                        ],
                        "gun2": [
                            {
                                "item": "model94",
                                "weight": 6
                            },
                            {
                                "item": "mp5",
                                "weight": 4
                            },
                            {
                                "item": "ak47",
                                "weight": 4
                            },
                            {
                                "item": "ar15",
                                "weight": 4
                            },
                            {
                                "item": "ar15",
                                "weight": 4
                            },
                            {
                                "item": "blr81",
                                "weight": 4
                            },
                            {
                                "item": "sr25",
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
                                "item": "pkp",
                                "weight": 0.1
                            },
                            {
                                "item": "awm",
                                "weight": 0.1
                            }
                        ],
                        "aitems": {
                            "556mm": 100,
                            "762mm": 100,
                            "45acp": 100,
                            "9mm": 150,
                            "22lr": 150
                        },
                        "items": [
                            [
                                {
                                    "item": "bandage",
                                    "weight": 1,
                                    "count": 5
                                }
                            ],
                            [
                                {
                                    "item": "medikit",
                                    "weight": 1
                                }
                            ],
                            [
                                {
                                    "item": "yellow_soda",
                                    "weight": 1
                                },
                                {
                                    "item": "blue_soda",
                                    "count": 2,
                                    "weight": 1
                                }
                            ]
                        ],
                        "iitems": [
                            "scope_3"
                        ]
                    },
                    "loadout":{
                        "wrapping":["aqua","shiny","aqua_blue","gradient"]
                    }
                },
                "count": 59
            },
            {
                "def": {
                    "ai": {
                        "kind": "dumb"
                    }
                },
                "count": 39
            }
        ])
    }
    on_spawn_player(player){
        player.set_preset(this.preset)
        for(const a of this.allies??[]){
            const bot = this.game.players.add_enemy(a,new JoinPacket())
            if(!bot) continue
        }
    }
    async on_before(){
        const cutscene=[]
        //if(start_with_intro)cutscene.push(...this.cutscene)
        cutscene.push(...this.make_level_intro())
        await this.show_cutscene(cutscene)

        const characters=[
            await this.level.load_character({"path": "../../characters/mark.jsonc"}),
            await this.level.load_character({"path": "../../characters/maria.jsonc"})
        ]
        const idx=await (this.character_selection(characters))
        this.preset=core.mergeDeep(this.level.player_preset??{},characters[idx])
        characters.splice(idx,1)
        this.allies=characters
    }
})