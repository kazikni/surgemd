return {
    src:[
        {type:"script",sources:["<smde>/api.js"],output:"scripts/smde"},
        {type:"styles",sources:["scripts/styles"],output:"scripts/index"},
        {type:"public",path:"<smde>/engine/styles.css",output:"scripts/styles/smde.css"},

        {type:"public",path:"public",output:""},
        {type:"script",sources:["scripts/core","scripts/plugin"],output:"scripts/editor"},
        {type:"script",sources:["<smde>/engine/core","<smde>/engine/web"],output:"scripts/engine",minify:false},
    ],
    plugins:[smde.plugins.load_plugin("electron")],
    electron:{
        dev_tools:true
    }
}