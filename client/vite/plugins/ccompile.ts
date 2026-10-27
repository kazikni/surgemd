
import type { Plugin } from "vite";

interface ConditionalCompileOptions {
    defines?: string[];
}

export function conditionalCompile(
    options: ConditionalCompileOptions = {}
): Plugin {
    const defines = new Set(options.defines ?? []);

    return {
        name: "conditional-compile",
        apply: "build",
        enforce: "pre",

        transform(source, id) {
            const file = id.split("?")[0];

            if (
                file.includes("/node_modules/") ||
                !/\.(ts|tsx|js|jsx|mts|mjs|cts|cjs)$/.test(file)
            ) {
                return null;
            }

            const lines = source.split(/\r?\n/);
            const output: string[] = [];

            const stack: {
                parentActive: boolean;
                condition: boolean;
                inElse: boolean;
            }[] = [];

            const isActive = () =>
                stack.every(
                    frame =>
                        frame.parentActive &&
                        (frame.inElse
                            ? !frame.condition
                            : frame.condition)
                );

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                const ifMatch = line.match(
                    /^\s*\/\/\s*#if\s+(!?)defined\(\s*([A-Za-z_$][\w$]*)\s*\)\s*$/
                );

                if (ifMatch) {
                    const parentActive = isActive();
                    const [, negate, name] = ifMatch;

                    stack.push({
                        parentActive,
                        condition:
                            defines.has(name) !== (negate === "!"),
                        inElse: false
                    });

                    continue;
                }

                if (/^\s*\/\/\s*#else\s*$/.test(line)) {
                    const frame = stack[stack.length - 1];

                    if (!frame) {
                        throw new Error(
                            `${file}:${i + 1}: #else sem #if correspondente`
                        );
                    }

                    if (frame.inElse) {
                        throw new Error(
                            `${file}:${i + 1}: #else duplicado`
                        );
                    }

                    frame.inElse = true;
                    continue;
                }

                if (/^\s*\/\/\s*#endif\s*$/.test(line)) {
                    if (stack.length === 0) {
                        throw new Error(
                            `${file}:${i + 1}: #endif sem #if correspondente`
                        );
                    }

                    stack.pop();
                    continue;
                }

                if (isActive()) {
                    output.push(line);
                }
            }

            if (stack.length > 0) {
                throw new Error(
                    `${file}: existe um #if sem #endif correspondente`
                );
            }

            return {
                code: output.join("\n"),
                map: null
            };
        }
    };
}
