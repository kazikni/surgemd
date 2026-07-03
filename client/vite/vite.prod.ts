import { mergeConfig, type UserConfig } from "vite"
import common from "./vite.common.ts"
const config: UserConfig = {
    server: {
        port: common.config.port,
        strictPort: true,
        host: "0.0.0.0"

    },
    preview: {
        port: common.config.port,
        strictPort: true,
        host: "0.0.0.0"
    },
};

export default mergeConfig(common.uconfig, config);
