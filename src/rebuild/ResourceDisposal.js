// Scene nodes own their ordinary resources; caches explicitly mark shared
// resources. Camera fades also retain an original behind the visible clone.
const materialsOf=node=>[
 ...(Array.isArray(node.material)?node.material:node.material?[node.material]:[]),
 ...(node.userData?.cameraMaterials||[]).flatMap(entry=>[entry.original,entry.material]),
].filter(Boolean);
const texturesOf=material=>{
 const textures=[];
 const add=value=>{if(value?.isTexture)textures.push(value);else if(Array.isArray(value))value.forEach(add);};
 Object.values(material).forEach(add);
 for(const uniform of Object.values(material.uniforms||{}))add(uniform?.value);
 return textures;
};
export function disposeObjectResources(root,{geometries=[],textures=[],ownedTextures=[]}={}){
 const keepGeometry=new Set(geometries),keepTexture=new Set(textures),ownedTexture=new Set(ownedTextures.filter(Boolean));
 const geometrySet=new Set(),materialSet=new Set(),textureSet=new Set(),targets=new Set();
 root.traverse(node=>{
  if(node.geometry&&!node.isSprite&&!node.geometry.userData?.shared&&!keepGeometry.has(node.geometry))geometrySet.add(node.geometry);
  for(const material of materialsOf(node)){
   if(material.userData?.shared){for(const texture of texturesOf(material))keepTexture.add(texture);}
   else materialSet.add(material);
  }
  if(node.isLight&&node.shadow?.map)targets.add(node.shadow.map);
  delete node.userData?.cameraMaterials;
  delete node.userData?.cameraMaterialArray;
  delete node.userData?.cameraFaded;
 });
 // A clone may borrow a cached material's unmarked texture: discover all
 // shared originals first, before considering any of their fade clones.
 for(const material of materialSet)for(const texture of texturesOf(material)){
  if(!texture.userData?.shared&&!keepTexture.has(texture))textureSet.add(texture);
 }
 for(const texture of ownedTexture)textureSet.add(texture);
 for(const resource of geometrySet)resource.dispose();
 for(const resource of materialSet)resource.dispose();
 for(const resource of textureSet)resource.dispose();
 for(const target of targets)target.dispose();
 return {geometries:geometrySet.size,materials:materialSet.size,textures:textureSet.size};
}
