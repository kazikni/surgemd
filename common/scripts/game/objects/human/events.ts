import { humanoid_events } from "./humanoid.ts";

export const human_events={
    update_modifiers:humanoid_events.last+1,
    tick_physics:humanoid_events.last+2,
    knocked:humanoid_events.last+3,
    help_up:humanoid_events.last+4,
    die:humanoid_events.last+5,
    revive:humanoid_events.last+6,
    state_changed:humanoid_events.last+7,
    damaged:humanoid_events.last+8,
    use_hand:humanoid_events.last+9,
    tick_input:humanoid_events.last+10,
    modify_damage:humanoid_events.last+11,
    interact:humanoid_events.last+12,
    animation:humanoid_events.last+13,
    hand_changed:humanoid_events.last+14,
    message:humanoid_events.last+15,
    side_effect:humanoid_events.last+16,
    last:humanoid_events.last+17,
}