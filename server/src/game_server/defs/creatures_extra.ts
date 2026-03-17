import { Numeric, random, v2, Vec2 } from "common/engine/core.ts";
import { type Creature } from "../gameObjects/creature.ts";
import { FloorType } from "common/scripts/others/terrain.ts";

export type CreatureUFunc=(self:Creature,dt:number)=>void
export type CreatureUFuncC=(params:any,self:Creature)=>CreatureUFunc
export const CreaturesUpdates:Record<string,CreatureUFuncC>={
    friendly_1:(params:{speed:number,walk_time:number,walk_time_extension:number,only_walk:FloorType},self)=>{
        let time=params.walk_time+(params.walk_time_extension*Math.random())
        let angle_dest=random.rad()
        self.angle=angle_dest
        const speed=params?.speed??3
        const only_walk=params.only_walk??FloorType.Grass
        function dest_angle():Vec2{
            return v2.scale(v2.from_RadAngle(angle_dest),random.float(1,6))
        }
        function chooseAngle(){
            let ii=0
            while(self.game.map.terrain.get_floor_type(v2.add(self.position,dest_angle()),self.layer,FloorType.Water)!==only_walk){
                angle_dest=random.rad()
                if(ii>30){
                    break
                }
                ii++
            }
        }
        return (self:Creature,dt:number)=>{
            if(time<=0){
                angle_dest=random.rad()
                time=params.walk_time+(params.walk_time_extension*Math.random())
                chooseAngle()
            }else{
                self.angle=Numeric.lerp_rad(self.angle,angle_dest,0.01)
                if(self.game.map.terrain.get_floor_type(v2.add(self.position,dest_angle()),self.layer,FloorType.Water)!==only_walk){
                    chooseAngle()
                    self.velocity=v2.new(0,0)
                }else{
                    self.velocity=v2.scale(v2.from_RadAngle(self.angle),speed)
                }
                time-=dt
            }
        }
    }
}