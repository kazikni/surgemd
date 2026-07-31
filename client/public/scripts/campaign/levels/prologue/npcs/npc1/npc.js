return new (class extends NPCScript{
    async run() {
        const speed=0.5

        await this.set_pathfinding(core.v2(13.2,56),speed)
        this.human.input.message="training time!"
        await this.sleep(1)
        this.human.input.interaction=true
        await this.sleep(2)

        await this.set_pathfinding(core.v2(13.2,49),speed)
        this.human.input.message="training time!"
        await this.sleep(1)
        this.human.input.interaction=true
        await this.sleep(1)

        await this.set_pathfinding(core.v2(13.2,42),speed)
        this.human.input.message="training time!"
        await this.sleep(1)
        this.human.input.interaction=true
        await this.sleep(1)

        await this.set_pathfinding(core.v2(15,50),speed)
        this.human.input.message="follow me"
        await this.set_pathfinding(core.v2(50.2,50),0.5)
        await this.sleep(3)
        this.set_random_walk(0.5)
    }
})