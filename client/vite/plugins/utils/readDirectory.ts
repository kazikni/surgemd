import * as fs from "node:fs";
import path from "node:path";
export default function readDirectory(root: string,current:string=""): [string,string][] {
    let results: [string,string][]=[]
    const files = fs.readdirSync(path.join(root,current))
    for (const file of files) {
        const filePath = path.join(root,current,file)
        const stat = fs.statSync(filePath);

        if (stat?.isDirectory()) {
            const res = readDirectory(root,path.join(current,file));
            results = results.concat(res);
        } else results.push([filePath,path.join(current,file)]);
    }

    return results;
}
