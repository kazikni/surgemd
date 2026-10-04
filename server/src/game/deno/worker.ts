import { DenoClientsManager, DenoFileManager, DenoServer } from "common/engine/deno.ts";
import { App } from "../others/game_worker.ts";

const app=new App(DenoServer,DenoClientsManager,new DenoFileManager())