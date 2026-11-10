import { defineConfig } from "vite";
import path from "path";
import fs from "fs"
import { ConfigType } from "common/scripts/config/config.ts";
import { parseJSONC } from "../common/engine/core/math/utils.ts";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { kspr_plugin } from "../common/engine/nodejs/vite/kspr_plugin.ts";

const td=new TextDecoder()
const txt=td.decode(fs.readFileSync("../config.jsonc"))
export const config=(parseJSONC(txt) as ConfigType).vite;

export default defineConfig(() => {
    return {
        build: {
            rollupOptions: {
                chunkSizeWarningLimit: 2000,
                input: {
                    main: path.resolve(__dirname, "./index.html"),
                    //books: resolve(__dirname, "./pages/books/index.html"),
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
                                path = "scripts/core";
                                break;
                        }
                        return `${path}/[name][extname]`;
                    },
                    entryFileNames: "scripts/core/[name].js",
                    chunkFileNames: "scripts/core/[name].js",
                    manualChunks(id:string) {
                        const normalized = path.relative(__dirname,id.replaceAll("\\", "/"))
                        if(normalized.startsWith("../common")) {
                            return "common"
                        }
                        if(normalized.includes("/node_modules/")) {
                            return "vendor"
                        }
                        if(normalized.startsWith("../server")) {
                            return "server"
                        }
                    },
                },
                
            }
        },
        plugins: [
            svelte(),
            kspr_plugin(config.kspr.sheets,config.kspr.resolutions),
            /*conditionalCompile({
                defines: (
                    process.env.CONDITIONAL_COMPILE_DEFINES ?? ""
                ).split(",").filter(Boolean)
            }),*/
        ],
        css: {
            preprocessorOptions: {
                scss: {
                    api: "modern-compiler"
                }
            },
        },
        resolve: {
            alias: {
                "common": path.resolve(__dirname, "../common")
            }
        },
        server: {
            port: config.port,
            strictPort: true,
            host: "0.0.0.0",
            allowedHosts:config.allowed_hosts,
            proxy: {
                '/api': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path:string) => path.replace(/^\/api/, ''),
                },
                '/region/local': {
                    target: 'http://localhost:8080',
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path:string) => path.replace(/^\/region\/local/, ''),
                },
            },
        },
        preview: {
            port: 3000,
            strictPort: true,
            host: "0.0.0.0"
        },
    };
});
