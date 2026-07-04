import { svelte } from "@sveltejs/vite-plugin-svelte";
import path, { resolve } from "node:path";
import { type UserConfig } from "vite";
import { spritesheet } from "./plugins/image-spritesheet-plugin.ts";
import { AudiosLists } from "./plugins/audio_list.ts";
import { ConfigType } from "common/scripts/config/config.ts";
export const config=(require("../../config.jsonc") as ConfigType).vite;
export const uconfig: UserConfig = {
    build: {
        rollupOptions: {
            chunkSizeWarningLimit: 2000,
            input: {
                main: resolve(__dirname, "../index.html"),
                books: resolve(__dirname, "../pages/books/index.html"),
                //forum: resolve(__dirname, "../pages/forum/index.html"),
                //user: resolve(__dirname, "../pages/user/index.html"),
                //news: resolve(__dirname, "../pages/news/index.html"),
                //wiki_viewer: resolve(__dirname, "../pages/wiki/viewer/index.html"),
            },
            output: {
                assetFileNames(assetInfo) {
                    let path = "assets";
                    if(!assetInfo.names)return  `${path}/[name]-[hash][extname]`;
                    switch (assetInfo.names[0].split(".").at(-1)) {
                        case "css":
                            path = "styles";
                            break;
                        case "ttf":
                        case "woff":
                        case "woff2":
                            path = "fonts";
                    }
                    return `${path}/[name]-[hash][extname]`;
                },
                entryFileNames: "scripts/[name]-[hash].js",
                chunkFileNames: "scripts/[name]-[hash].js",
                manualChunks(id, _chunkInfo) {
                    if (id.includes("node_modules")) {
                        return "vendor";
                    }
                }
            }
        }
    },
    plugins: [
        svelte(),
        spritesheet("public",config.spritesheet.sheets,undefined,config.spritesheet.resolutions),
        AudiosLists(config.audios),
    ],
    css: {
        preprocessorOptions: {
            scss: {
                api: "modern-compiler"
            }
        }
    },
    resolve: {
        alias: {
            "common": path.resolve(__dirname, "../../common")
        }
    },
};
export default {
    uconfig,
    config
}