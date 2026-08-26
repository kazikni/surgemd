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
                                "item": "hp18",
                                "weight": 1
                            },
                            {
                                "item": "m870",
                                "weight": 6
                            },
                            {
                                "item": "spas12",
                                "weight": 1
                            },
                            {
                                "item": "model94",
                                "weight": 1
                            },
                            {
                                "item": "kar98k",
                                "weight": 1
                            },
                            {
                                "item": "awp",
                                "weight": 0.15
                            },
                            {
                                "item": "awm",
                                "weight": 0.1
                            }
                        ],
                        "gun2": [
                            {
                                "item": "colt1873",
                                "weight": 7
                            },
                            {
                                "item": "colt1873_dual",
                                "weight": 7
                            },
                            {
                                "item": "m9",
                                "weight": 7
                            },
                            {
                                "item": "m9_dual",
                                "weight": 7
                            },
                            {
                                "item": "taurustx",
                                "weight": 7
                            },
                            {
                                "item": "taurustx_dual",
                                "weight": 7
                            },
                            {
                                "item": "mp5",
                                "weight": 7
                            },
                            {
                                "item": "ak47",
                                "weight": 7
                            },
                            {
                                "item": "ar15",
                                "weight": 7
                            },
                            {
                                "item": "famas",
                                "weight": 5
                            },
                            {
                                "item": "m1921",
                                "weight": 5
                            },
                            {
                                "item": "m4a1",
                                "weight": 4
                            },
                            {
                                "item": "vector",
                                "weight": 4
                            },
                            {
                                "item": "p90",
                                "weight": 4
                            },
                            {
                                "item": "model94",
                                "weight": 2
                            },
                            {
                                "item": "sr25",
                                "weight": 2
                            },
                            {
                                "item": "vss",
                                "weight": 2
                            },
                            {
                                "item": "rifle_cbc",
                                "weight": 2
                            },
                            {
                                "item": "kar98k",
                                "weight": 1
                            },
                            {
                                "item": "awp",
                                "weight": 0.2
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
                            "p76":20,
                            "c45": 140,
                            "c51": 140,
                            "c22": 140,
                            "l19": 20,
                            "l15": 200
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
                            "scope_2"
                        ]
                    },
                    "wrapping":["aqua","shiny","aqua_blue","gradient"]
                },
                "count": 40
            },
            {
                "def": {
                    "ai": {
                        "kind": "dumb"
                    }
                },
                "count": 59
            }
        ])
    }
    on_spawn_player(player){
        player.set_preset(this.preset)
    }
    async on_load(){
        this.cutscene=await this.load_json("cutscenes/begin.jsonc")
    }
    async on_begin(){
        this.preset=await this.level.load_character({"path": "../../characters/nick.jsonc"})
    }
    async on_before(start_with_intro){
        const cutscene=[]
        if(start_with_intro)cutscene.push(...this.cutscene)
        cutscene.push(...this.make_level_intro())
        await this.show_cutscene(cutscene)
    }
})