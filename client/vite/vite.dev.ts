import { mergeConfig, type UserConfig } from "vite";
import common from "./vite.common.ts";

const uconfig: UserConfig = {
    server: {
        port: common.config.port,
        strictPort: true,
        host: "0.0.0.0",
        allowedHosts:common.config.allowed_hosts,
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

export default mergeConfig(uconfig, common.uconfig);
