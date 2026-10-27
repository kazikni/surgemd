import cli from "../../dist/cli.js"

main(Deno.args,"../node/worker.js",new NodeFileManager(),createCanvas,DenoServer,DenoClientsManager)