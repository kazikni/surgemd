import { TranslationManager } from "common/engine/core.ts";

export async function NewMDLanguageManager(language:string,default_language:string,path:string):Promise<TranslationManager>{
    const lang=await(await fetch(`${path}/${language}.json`)).json()
    const dlang=await(await fetch(`${path}/${default_language}.json`)).json()
    const lm=new TranslationManager(lang,dlang)
    return lm
}