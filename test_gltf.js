const fs=require('fs');
const data=fs.readFileSync('c:/Users/user/Desktop/UNI/3ºano/2sem/icg/TheWhisperingMaze/assets/grass/various_forest_assets_pack.glb');
let json=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12))); 
json.nodes.forEach((n,i)=>{ 
    if(n.mesh !== undefined) {
        let m = json.meshes[n.mesh];
        let mat = json.materials[m.primitives[0].material];
        console.log("Node " + n.name + ": Mat = " + (mat ? mat.name : 'none'));
    }
});
