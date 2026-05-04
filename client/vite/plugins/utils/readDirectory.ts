import * as fs from "node:fs";

export default function readDirectory(root: string,current:string=""): [string,string][] {
    let results: [string,string][] = [];
    const files = fs.readdirSync(root+"/"+current);
    for (const file of files) {
        const filePath = root+"/"+current+"/"+file
        const stat = fs.statSync(filePath);

        if (stat?.isDirectory()) {
            const res = readDirectory(root,current+"/"+file);
            results = results.concat(res);
        } else results.push([filePath,current+"/"+file]);
    }

    return results;
}
