import { SignalManager } from "../../core/math/utils.ts"
import { v2, Vec2 } from "../../core/math/vec2.ts"
import { Camera2D } from "../../client/2d/camera.ts"
export enum Key {
    A = 0,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    L,
    M,
    N,
    O,
    P,
    Q,
    R,
    S,
    T,
    U,
    V,
    W,
    X,
    Y,
    Z,

    Number_0,
    Number_1,
    Number_2,
    Number_3,
    Number_4,
    Number_5,
    Number_6,
    Number_7,
    Number_8,
    Number_9,

    Enter,
    Backspace,
    Space,
    Delete,
    Tab,

    LShift,
    RShift,

    LCtrl,
    RCtrl,

    LALT,
    RALT,

    Arrow_Up,
    Arrow_Down,
    Arrow_Left,
    Arrow_Right,

    Mouse_Left,
    Mouse_Middle,
    Mouse_Right,

    Mouse_Wheel_Up,
    Mouse_Wheel_Down,

    Mouse_Option1,
    Mouse_Option2
}
export const KeyNames: Record<number, Key> = {
    65: Key.A,
    66: Key.B,
    67: Key.C,
    68: Key.D,
    69: Key.E,
    70: Key.F,
    71: Key.G,
    72: Key.H,
    73: Key.I,
    74: Key.J,
    75: Key.K,
    76: Key.L,
    77: Key.M,
    78: Key.N,
    79: Key.O,
    80: Key.P,
    81: Key.Q,
    82: Key.R,
    83: Key.S,
    84: Key.T,
    85: Key.U,
    86: Key.V,
    87: Key.W,
    88: Key.X,
    89: Key.Y,
    90: Key.Z,

    48: Key.Number_0,
    49: Key.Number_1,
    50: Key.Number_2,
    51: Key.Number_3,
    52: Key.Number_4,
    53: Key.Number_5,
    54: Key.Number_6,
    55: Key.Number_7,
    56: Key.Number_8,
    57: Key.Number_9,

    13: Key.Enter,
    8: Key.Backspace,
    32: Key.Space,
    46: Key.Delete,
    9: Key.Tab,

    16: Key.LShift,
    17: Key.LCtrl,
    18: Key.LALT,

    38: Key.Arrow_Up,
    40: Key.Arrow_Down,
    37: Key.Arrow_Left,
    39: Key.Arrow_Right,

    1000: Key.Mouse_Left,
    1001: Key.Mouse_Middle,
    1002: Key.Mouse_Right,
    1003: Key.Mouse_Option1,
    1004: Key.Mouse_Option2,

    1101: Key.Mouse_Wheel_Up,
    1102: Key.Mouse_Wheel_Down,
}
export enum GamepadButtonID {
    A = 0,
    B = 1,
    X = 2,
    Y = 3,

    L1 = 4,
    R1 = 5,
    L2 = 6,
    R2 = 7,

    Select = 8,
    Start = 9,

    L3 = 10,
    R3 = 11,

    DPAD_Up = 12,
    DPAD_Down = 13,
    DPAD_Left = 14,
    DPAD_Right = 15,

    Home = 16
}
export interface InputAction {
    keys: number[]
    buttons: number[]
}
export interface AxisData {
    up: string
    down: string
    left: string
    right: string

    old: Vec2

    gamepad: "left" | "right"
}
export enum InputEventType {
    KeyDown = "keydown",
    KeyUp = "keyup",

    ActionDown = "actiondown",
    ActionUp = "actionup",

    Axis = "axis",

    MouseMove = "mousemove"
}
export type InputKeyEvent = {
    type: InputEventType.KeyDown | InputEventType.KeyUp
    key: number
}
export type InputActionEvent = {
    type: InputEventType.ActionDown | InputEventType.ActionUp
    action: string
}
export type InputAxisEvent = {
    type: InputEventType.Axis
    action: string
    value: Vec2
}
export type InputMouseMoveEvent = {
    type: InputEventType.MouseMove
    position: Vec2
    delta: Vec2
}
export type InputEvent =InputKeyEvent|InputActionEvent|InputAxisEvent|InputMouseMoveEvent
export class InputManager {
    listener = new SignalManager()

    focus = true

    meter_size: number

    pressed = new Set<number>()
    down = new Set<number>()
    up = new Set<number>()

    gamepad_pressed = new Set<number>()
    private wheel_pressed = new Set<number>()

    actions: Record<string, InputAction> = {}

    default_actions: Record<string, InputAction> = {}

    active_actions = new Set<string>()

    axis: Record<string, AxisData> = {}

    mouse_position = v2(0, 0)
    mouse_delta = v2(0, 0)

    left_stick = v2(0, 0)
    right_stick = v2(0, 0)

    dead_zone = v2(0.15, 0.15)

    private previous_gamepads = new Map<number,{buttons: boolean[],axes: number[]}>()

    constructor(meter_size: number) {
        this.meter_size = meter_size
    }
    bind(canvas: HTMLCanvasElement,elem: HTMLElement = document.body) {
        elem.tabIndex = 1
        elem.addEventListener("keydown",this.on_key_down)
        elem.addEventListener("keyup",this.on_key_up)
        canvas.addEventListener("mousedown",this.on_mouse_down)
        elem.addEventListener("mouseup",this.on_mouse_up)
        elem.addEventListener("wheel",this.on_wheel,{passive: false})
        elem.addEventListener("pointermove",e => this.on_pointer_move(e, canvas))
    }
    private emit(event: InputEvent) {
        this.listener.emit(event.type, event)
    }
    private on_key_down = (e: KeyboardEvent) => {
        if (!this.focus) return
        const key = KeyNames[e.keyCode]
        if (key === undefined) return
        if (!this.pressed.has(key)) {
            this.down.add(key)
            this.emit({type: InputEventType.KeyDown,key})
        }
        this.pressed.add(key)
    }
    private on_key_up = (e: KeyboardEvent) => {
        const key = KeyNames[e.keyCode]
        if (key === undefined) return
        this.pressed.delete(key)
        this.up.add(key)
        this.emit({type: InputEventType.KeyUp,key})
    }
    private on_mouse_down = (e: MouseEvent) => {
        if (!this.focus) return
        const key = KeyNames[e.button + 1000]
        if (key === undefined) return
        if (!this.pressed.has(key)) {
            this.down.add(key)
            this.emit({type: InputEventType.KeyDown,key})
        }
        this.pressed.add(key)
    }
    private on_mouse_up = (e: MouseEvent) => {
        const key = KeyNames[e.button + 1000]
        if (key === undefined) return
        this.pressed.delete(key)
        this.up.add(key)
        this.emit({type: InputEventType.KeyUp,key})
    }
    private on_wheel = (e: WheelEvent) => {
        if (!this.focus) {
            return
        }
        const key=e.deltaY<0?Key.Mouse_Wheel_Up:Key.Mouse_Wheel_Down
        this.wheel_pressed.add(key)

        this.pressed.add(key)
        this.down.add(key)
        this.up.add(key)

        this.emit({
            type: InputEventType.KeyDown,
            key
        })
        this.emit({
            type: InputEventType.KeyUp,
            key
        })
    }
    private on_pointer_move(e: PointerEvent,canvas: HTMLCanvasElement) {
        if (!this.focus) return
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const old = this.mouse_position
        this.mouse_position = v2((e.clientX - rect.left) * scaleX,(e.clientY - rect.top) * scaleY)
        this.mouse_delta = v2.sub(this.mouse_position,old)
        this.emit({type: InputEventType.MouseMove,position: this.position,delta: this.mouse_delta})
    }
    get position(): Vec2 {
        return v2.dscale(this.mouse_position,this.meter_size)
    }
    camera_pos(camera: Camera2D): Vec2 {
        return v2.add(v2.scale(this.position,camera.zoom),camera.position)
    }
    private apply_dead_zone(x: number,y: number): Vec2 {
        return v2(
            Math.abs(x) < this.dead_zone.x ? 0 : x,
            Math.abs(y) < this.dead_zone.y ? 0 : y
        )
    }
    private update_gamepads() {
        const pads = navigator.getGamepads()
        for (const pad of pads) {
            if (!pad) continue
            let prev=this.previous_gamepads.get(pad.index)
            if (!prev) {
                prev = {
                    buttons: pad.buttons.map(
                        v => v.pressed
                    ),
                    axes: [...pad.axes]
                }
                this.previous_gamepads.set(pad.index,prev)
            }
            for(let i = 0;i < pad.buttons.length;i++){
                const current=pad.buttons[i].pressed
                const old=prev.buttons[i] ?? false
                if (current && !old) {
                    this.gamepad_pressed.add(i)
                } else if (!current && old) {
                    this.gamepad_pressed.delete(i)
                }
            }
            if (pad.axes.length >= 2) {
                this.left_stick=this.apply_dead_zone(pad.axes[0],pad.axes[1])
            }
            if (pad.axes.length >= 4) {
                this.right_stick=this.apply_dead_zone(pad.axes[2],pad.axes[3])
            }
            this.previous_gamepads.set(
                pad.index,
                {
                    buttons: pad.buttons.map(
                        v => v.pressed
                    ),
                    axes: [...pad.axes]
                }
            )
        }
    }
    registerAction(name: string,action: InputAction) {
        this.actions[name]=structuredClone(action)
        if (!this.default_actions[name]) {
            this.default_actions[name]=structuredClone(action)
        }
    }
    unregisterAction(name: string) {
        delete this.actions[name]
        this.active_actions.delete(name)
    }
    resetAction(name: string) {
        const def=this.default_actions[name]
        if (!def)return
        this.actions[name]=structuredClone(def)
    }
    resetAllActions() {
        this.actions = structuredClone(this.default_actions)
    }
    add_axis(id: string,up: string,down: string,left: string,right: string,gamepad:"left"|"right"="left") {
        this.axis[id] = {
            up,
            down,
            left,
            right,
            old: v2(0, 0),
            gamepad
        }
    }

    keyPress(key: number): boolean {
        return this.pressed.has(key)
    }
    keyDown(key: number): boolean {
        return this.down.has(key)
    }
    keyUp(key: number): boolean {
        return this.up.has(key)
    }
    action_pressed(action: InputAction): boolean {
        for (const k of action.keys) {
            if(this.pressed.has(k)) {
                return true
            }
        }
        for (const b of action.buttons) {
            if(this.gamepad_pressed.has(b)) {
                return true
            }
        }
        return false
    }
    action_id_pressed(id: string): boolean {
        const action = this.actions[id]
        if (!action) return false
        return this.action_pressed(action)
    }
    wait_for_action(action: string): Promise<void> {
        return new Promise((resolve) => {
            const fn = (e: InputActionEvent) => {
                if(e.type!==InputEventType.ActionDown) {
                    return
                }
                if (e.action !== action) {
                    return
                }
                this.listener.off(InputEventType.ActionDown,fn)
                resolve()
            }
            this.listener.on(InputEventType.ActionDown,fn)
        })
    }
    wait_for_any_key(): Promise<number> {
        return new Promise(resolve => {
            const fn = (e: InputKeyEvent) => {
                if (e.type !==InputEventType.KeyDown) {
                    return
                }
                this.listener.off(InputEventType.KeyDown,fn)
                resolve(e.key)
            }
            this.listener.on(InputEventType.KeyDown,fn)
        })
    }

    tick() {
        this.update_gamepads()
        for (const id in this.axis) {
            const axis = this.axis[id]
            let mov = v2(
                this.action_id_pressed(
                    axis.left
                )
                    ? -1
                    : this.action_id_pressed(
                          axis.right
                      )
                    ? 1
                    : 0,

                this.action_id_pressed(
                    axis.up
                )
                    ? -1
                    : this.action_id_pressed(
                          axis.down
                      )
                    ? 1
                    : 0
            )

            const analog =
                axis.gamepad === "left"
                    ? this.left_stick
                    : this.right_stick

            if(analog.x !== 0||analog.y !== 0){
                mov = analog
            }
            if (!v2.is(mov, axis.old)) {
                axis.old = mov
                this.emit({
                    type: InputEventType.Axis,
                    action: id,
                    value: mov
                })
            }
        }   
        for (const action in this.actions) {
            const pressed=this.action_pressed(this.actions[action])
            const active=this.active_actions.has(action)
            if (pressed&&!active){
                this.active_actions.add(action)
                this.emit({
                    type: InputEventType.ActionDown,
                    action
                })
            }else if(!pressed&&active){
                this.active_actions.delete(action)
                this.emit({
                    type: InputEventType.ActionUp,
                    action
                })
            }
        }

        for (const key of this.wheel_pressed) {
            this.pressed.delete(key)
        }
        this.wheel_pressed.clear()
        this.down.clear()
        this.up.clear()
    }

    clear() {
        this.pressed.clear()

        this.down.clear()
        this.up.clear()

        this.gamepad_pressed.clear()
        this.wheel_pressed.clear()

        this.active_actions.clear()

        this.left_stick = v2(0, 0)
        this.right_stick = v2(0, 0)
    }
    private action_equals(a: InputAction,b: InputAction): boolean {
        if(a.keys.length !== b.keys.length) {
            return false
        }
        if (a.buttons.length !==b.buttons.length) {
            return false
        }

        for(let i = 0;i < a.keys.length;i++) {
            if (a.keys[i] !== b.keys[i]) {
                return false
            }
        }
        for(let i = 0;i < a.buttons.length;i++) {
            if(a.buttons[i]!==b.buttons[i]) {
                return false
            }
        }
        return true
    }
    saveConfig(): Record<string,InputAction> {
        const out: Record<string,InputAction> = {}
        for (const k in this.actions) {
            const current=this.actions[k]
            const def=this.default_actions[k]
            if(!def) {
                out[k]=structuredClone(current)
                continue
            }
            if(!this.action_equals(current,def)){
                out[k]=structuredClone(current)
            }
        }
        return out
    }
    loadConfig(config: Record<string,InputAction>) {
        this.resetAllActions()
        for (const k in config) {
            this.actions[k]=structuredClone(config[k])
        }
    }
}