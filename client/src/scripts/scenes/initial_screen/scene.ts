import { Scene } from "common/engine/core.ts"
import { type Application } from "../../main/app.ts"

export class InitialScreenScene extends Scene {
    declare app: Application;

    video_source:string
    constructor(video_source:string){
        super()
        this.video_source=video_source
    }

    elem: HTMLDivElement = document.createElement("div")
    video: HTMLVideoElement = document.createElement("video")
    source: HTMLSourceElement = document.createElement("source")

    private finished = false
    private finishPromise?: Promise<void>
    private finishResolve?: () => void

    override on_init(): void {
        this.elem.id = "initial-screen"
        this.video.id = "intro-video"

        this.video.autoplay = true
        this.video.playsInline = true
        this.video.preload = "auto"
        this.video.controls = false
        this.video.removeAttribute("controls");
        this.video.disablePictureInPicture = true;
        this.video.setAttribute("controlslist", "nofullscreen nodownload noplaybackrate");
        this.video.setAttribute("disablepictureinpicture", "");
        this.video.setAttribute("playsinline", "");
        this.video.setAttribute("webkit-playsinline", "");

        this.source.src = this.video_source
        this.source.type = "video/mp4"

        this.video.appendChild(this.source)
        this.elem.appendChild(this.video)

        this.video.addEventListener("ended", this.finish)
        this.video.addEventListener("error", this.finish)
    }

    private onKeyDown: (event: KeyboardEvent) => void = () => {};

    private finish = (): void => {
        if (this.finished) return;

        this.finished = true;
        this.finishResolve?.();
    };

    async show(): Promise<void> {
        this.finished = false;

        this.finishPromise = new Promise<void>((resolve) => {
            this.finishResolve = resolve;
        });

        this.video.currentTime = 0;
        this.elem.style.opacity = "0";

        this.app.scene = this;

        if (!this.elem.isConnected) {
            document.body.appendChild(this.elem);
        }

        requestAnimationFrame(() => {
            this.elem.style.opacity = "1";
        });

        try {
            await this.video.play();
        } catch {
        }

        await this.finishPromise;

        this.elem.style.opacity = "0";

        await new Promise<void>((resolve) => {
            setTimeout(resolve, 250);
        });

        this.video.pause();
    }

    override on_set(): void {
        if (!this.elem.isConnected) {
            document.body.appendChild(this.elem);
        }
    }

    override on_unset(): void {
        this.finish()

        this.video.pause()
        this.video.removeEventListener("ended", this.finish)
        this.video.removeEventListener("error", this.finish)

        this.elem.remove()
    }
}
