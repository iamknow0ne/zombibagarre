// GLTF skins can be shared by many material/LOD meshes. SkeletonUtils clones a
// skeleton for each mesh, even when all resulting bone references and inverse
// binds are identical. Consolidate only those exact matches within this clone.
// Never share between actors or between the independently posed FPS/world rigs.
export function shareInstanceSkeletons(root){
 const canonical=new Map(),retired=new Set();
 root.traverse(mesh=>{
  const skeleton=mesh.skeleton;if(!mesh.isSkinnedMesh||!skeleton)return;
  const key=skeleton.bones.map((bone,i)=>`${bone.uuid}:${skeleton.boneInverses[i].elements.join(',')}`).join('|');
  const shared=canonical.get(key);if(shared){if(shared!==skeleton){retired.add(skeleton);mesh.skeleton=shared;}}else canonical.set(key,skeleton);
 });
 for(const skeleton of retired)skeleton.dispose();
 return canonical.size;
}
