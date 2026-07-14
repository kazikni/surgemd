import { Crosshair, CrosshairBase } from "../managers/crosshairManager.ts";

export const DefaultCrosshair:Crosshair={
    code:'<svg width="64" height="64" viewBox="0 0 16.933 16.933" xmlns="http://www.w3.org/2000/svg"><path fill="%FILL%" stroke="%STROKE%" stroke-width="%WIDTH%" d="M 7.9378605,4.23325 V 7.936827 H 4.23325 V 8.9951395 H 7.9378605 V 12.69975 H 8.996173 V 8.9951395 H 12.69975 V 7.936827 H 8.996173 V 4.23325 Z"/></svg>',
    color:"#ffffff",
    cursor:"crosshair",
    size:1,
    stroke:0.5,
    stroke_color:"#66666f",
    dynamic:false,
}

export const AimCrosshair:Crosshair={
    code:'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 16.933 16.933"><path d="M7.693.215v1.471A6.829 6.829 0 0 0 1.69 7.693H.215V9.24h1.471a6.829 6.829 0 0 0 6.007 6.003v1.475H9.24v-1.47a6.829 6.829 0 0 0 6.003-6.008h1.475V7.693h-1.47A6.829 6.829 0 0 0 9.24 1.69V.215zm0 2.745v1.897H9.24V2.96a5.567 5.567 0 0 1 4.734 4.733h-1.897V9.24h1.896a5.567 5.567 0 0 1-4.733 4.734v-1.897H7.693v1.896A5.567 5.567 0 0 1 2.96 9.24h1.897V7.693H2.96A5.567 5.567 0 0 1 7.693 2.96z" fill="%FILL%" stroke="%STROKE%" stroke-width="%WIDTH%" stroke-linecap="square"/></svg>',
    color:"#ffffff",
    cursor:"crosshair",
    size:1,
    stroke:0.5,
    stroke_color:"#66666f",
    dynamic:false,
}

export function generateAnimatedCross_Engine(
    def: Crosshair,
    spread: number,
    rotation: number,
    pulse: number
): string {
    const sizeMul = Math.max(def.size, 1)
    const arm = 10 * sizeMul
    const thick = Math.max(def.stroke + def.size * 2, 1)
    const gap = thick + spread

    const total = arm * 2 + gap * 2
    const c = total / 2
    const rotDeg = rotation * 57.2958
    const ringR = thick * (1 + pulse * 2)

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}">
  <g transform="rotate(${rotDeg} ${c} ${c})"
     fill="${def.color}"
     stroke="${def.stroke_color}"
     stroke-width="${def.stroke}"
     stroke-linecap="square">

    <rect x="${c - thick/2}" y="${c - gap - arm}" width="${thick}" height="${arm}" />
    <rect x="${c - thick/2}" y="${c + gap}" width="${thick}" height="${arm}" />

    <rect x="${c - gap - arm}" y="${c - thick/2}" width="${arm}" height="${thick}" />
    <rect x="${c + gap}" y="${c - thick/2}" width="${arm}" height="${thick}" />

    <circle cx="${c}" cy="${c}" r="${thick/2}" />

    <circle cx="${c}" cy="${c}" r="${ringR}" fill="none" opacity="${0.25 + pulse*0.75}" />
  </g>
</svg>`

    return `url('data:image/svg+xml,${encodeURIComponent(svg)}') ${c} ${c}, crosshair`
}
export class AnimatedCrosshair extends CrosshairBase {
    private time = 0
    private rotation = 0
    private pulse = 0

    constructor(
        elem: HTMLElement,
        private def: Crosshair
    ) {
        super(elem)
    }

    override tick(dt: number) {
        this.time += dt

        if (this.def.rotate) {
            this.rotation += dt * (this.def.rotateSpeed ?? 2)
        }

        if (this.def.pulse) {
            this.pulse = (Math.sin(this.time * (this.def.pulseSpeed ?? 6)) + 1) * 0.5
            this.dirty = true
        }
        this.dirty = true
    }

    protected build(): string {
        return generateAnimatedCross_Engine(
            this.def,
            this.spread,
            this.rotation,
            this.pulse
        )
    }
}

export const AnimatedCrosshairDef:Crosshair={
    color: "#ffffff",
    size: 1,
    stroke: 1,
    stroke_color: "#66666f",
    code: "",
    cursor: "crosshair",
    dynamic: true,

    rotate: true,
    rotateSpeed: 1.8,

    pulse: true,
    pulseSpeed: 5,
}