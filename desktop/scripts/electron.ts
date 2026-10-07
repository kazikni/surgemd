import { join } from "https://deno.land/std@0.204.0/path/mod.ts";
import { emptyDir, exists } from "https://deno.land/std@0.204.0/fs/mod.ts";

const root_path=join(import.meta.dirname!,"../../")
const base_path=join(import.meta.dirname!,"../")
const client_path=join(root_path,"client")
const dist_path=join(base_path,"dist")

Deno.chdir(base_path)

const vite = new Deno.Command("deno", {
  args: ["task", "build"],
  stdout: "inherit",
  stderr: "inherit",
  cwd:client_path
});
const viteResult = await vite.output()
if (!viteResult.success) {
  Deno.exit(1);
}

const tmpPkg = {
  name: "surgemd",
  version: "1.0.0",
  main: "electron/main.js",
  author: {
    name: "kazikni",
  },
  description: "A .io Game",
  type: "commonjs",
  build:{
    compression:"maximum",
    electronLanguages:[
      "en-US"
    ]
  }
};

async function copyDir(src: string, dest: string) {
  await Deno.mkdir(dest, { recursive: true });

  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;

    if (entry.isDirectory) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile) {
      await Deno.copyFile(srcPath, destPath);
    }
  }
}

await emptyDir(dist_path)

Deno.mkdirSync(dist_path+"/resources");
const pkgPath1 = join(base_path,"package.json");
const pkgPath2 = join(dist_path,"/resources/package.json");
await Deno.writeTextFile(pkgPath1, JSON.stringify(tmpPkg, null, 2));
await Deno.writeTextFile(pkgPath2, JSON.stringify(tmpPkg, null, 2));
await copyDir(join(client_path, "dist"), "dist/resources/main");
await copyDir(join(base_path, "electron"), "dist/resources/electron");

async function buildElectron(platform: string) {
  const args = [
    "npx",
    "@electron/packager",
    "./dist/resources",
    "surgemd",
    `--platform=${platform}`,
    "--arch=x64",
    "--out=dist",
    "--overwrite",
    "--icon=dist/resources/main/favicon.ico",
    "--app-version=1.0.0",
    "--prune=true",
    "--no-asar",
    "--ignore=node_modules",
    "--ignore=deno.lock",
    "--ignore=deno.json",
    "--ignore=package-lock.json",
    "--electron-version=31.3.0",
  ];

  const command =
    Deno.build.os === "windows"
      ? new Deno.Command("cmd", {
          args: ["/c", ...args],
          stdout: "inherit",
          stderr: "inherit",
          cwd:base_path
        })
      : new Deno.Command(args[0], {
          args: args.slice(1),
          stdout: "inherit",
          stderr: "inherit",
          cwd:base_path
        });

  const outp = await command.output();
  if (outp.code === 0) {
    console.log(`Electron package for ${platform} created successfully!`);
  } else {
    console.error(`electron-packager failed for ${platform}.`);
    Deno.exit(outp.code);
  }
}
async function cleanElectron(dir:string){
    const locales=join(dir,"locales")
    if(await exists(locales)){
        for await(const entry of Deno.readDir(locales)){
            if(entry.name!=="en-US.pak"){
                await Deno.remove(join(locales,entry.name))
            }
        }
    }

    const verify=["LICENSE","version","LICENSES.chromium.html","chrome_crashpad_handler","vk_swiftshader_icd.json"]
    for(const v of verify){
        if(await exists(join(dir,v)))Deno.remove(join(dir,v))
    }
}
await buildElectron("win32")
await cleanElectron(join(dist_path,"surgemd-linux-x64"))
await buildElectron("linux")
await cleanElectron(join(dist_path,"surgemd-linux-x64"))

await Deno.remove(pkgPath1);