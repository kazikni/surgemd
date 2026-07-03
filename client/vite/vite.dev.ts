import { mergeConfig, type UserConfig } from "vite";
import common from "./vite.common.ts";

const uconfig: UserConfig = {
    server: {
        port: common.config.port,
        strictPort: true,
        host: "0.0.0.0",
        allowedHosts:common.config.allowed_hosts
    },
    preview: {
        port: 3000,
        strictPort: true,
        host: "0.0.0.0"
    },
};

export default mergeConfig(uconfig, common.uconfig);
