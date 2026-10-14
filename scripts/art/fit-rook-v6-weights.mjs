// Actual exported garment-to-coat attachment measurements. This does not test
// visual likeness, fabric collision or physical cloth simulation.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRookMotionStudy,ROOK_MOTION_MODES} from '../../dev/RookMotionStudy.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
async function fit(){
 const bytes=await readFile(resolve(root,'assets/characters/rook-prototype-v6.glb'));
 const provenance=JSON.parse(await readFile(resolve(root,'assets/source/rook/rook-v6-surface-bindings.json'),'utf8'));
 if(!globalThis.ProgressEvent)globalThis.ProgressEvent=class{constructor(type,init){Object.assign(this,{type},init);}};
 const loader=new GLTFLoader();loader.register(parser=>{parser.loadImageSource=async()=>new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);return{name:'ROOK_GARMENT_IMAGE_PLACEHOLDER'};});
 const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const skins=[];scene.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});scene.updateMatrixWorld(true);for(const s of skins)s.skeleton.update();
 const v=new T.Vector3(),scale=100000,key=(x,y,z)=>`${x},${y},${z}`,maps=new Map();
 for(const skin of skins){const points=[],buckets=new Map();for(let i=0;i<skin.geometry.attributes.position.count;i++){skin.getVertexPosition(i,v).applyMatrix4(skin.matrixWorld);points.push(v.clone());const k=key(...v.toArray().map(x=>Math.round(x*scale)));if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(i);}maps.set(skin.material.name,{skin,points,buckets});}
 function match(material,point){const map=maps.get(material),[x,y,z]=point.map(x=>Math.round(x*scale));let index=-1,best=1e-10;v.fromArray(point);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)for(const i of map.buckets.get(key(x+dx,y+dy,z+dz))||[]){const d=map.points[i].distanceToSquared(v);if(d<best){index=i;best=d;}}if(index<0)throw Error(`Export has no ${material} vertex at ${point}.`);return{skin:map.skin,index};}
 const refs=new Map(),refKey=r=>`${r.skin.uuid}:${r.index}`,reference=r=>{const k=refKey(r);if(!refs.has(k))refs.set(k,{...r,p:new T.Vector3()});return refs.get(k);};
 const records=provenance.vertices.map(p=>({...p,detail:reference(match(p.material,p.p)),source:p.triangle.map(p=>reference(match('Field jacket / moss canvas',p)))}));
 const refresh=()=>{scene.updateMatrixWorld(true);for(const s of skins)s.skeleton.update();for(const r of refs.values())r.skin.getVertexPosition(r.index,r.p).applyMatrix4(r.skin.matrixWorld);};
 const support=new T.Vector3(),distance=r=>{support.set(0,0,0);r.source.forEach((p,i)=>support.addScaledVector(p.p,r.bary[i]));return r.detail.p.distanceTo(support);};
 refresh();for(const r of records)r.restDistance=distance(r);

 const q=new T.Quaternion(),n=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),m=new T.Matrix4();
 for(const r of records){const ids=new Set();for(const ref of [r.detail,...r.source]){const ix=ref.skin.geometry.attributes.skinIndex,w=ref.skin.geometry.attributes.skinWeight;for(let k=0;k<4;k++)if(w.getComponent(ref.index,k)>1e-6)ids.add(ix.getComponent(ref.index,k));}r.ids=[...ids];r.gram=Array.from({length:r.ids.length},()=>Array(r.ids.length).fill(0));r.point=r.detail.p.clone();support.set(0,0,0);r.source.forEach((p,i)=>support.addScaledVector(p.p,r.bary[i]));r.offset=r.point.clone().sub(support);r.normal=a.subVectors(r.source[1].p,r.source[0].p).cross(b.subVectors(r.source[2].p,r.source[0].p)).normalize().clone();}
 const motion=createRookMotionStudy(scene);
 function accumulate(){refresh();for(const r of records){support.set(0,0,0);r.source.forEach((p,i)=>support.addScaledVector(p.p,r.bary[i]));n.subVectors(r.source[1].p,r.source[0].p).cross(b.subVectors(r.source[2].p,r.source[0].p)).normalize();q.setFromUnitVectors(r.normal,n);const target=support.clone().add(r.offset.clone().applyQuaternion(q));const errors=r.ids.map(id=>{const skin=r.detail.skin;m.multiplyMatrices(skin.skeleton.bones[id].matrixWorld,skin.skeleton.boneInverses[id]);return r.point.clone().applyMatrix4(m).sub(target);});for(let i=0;i<r.ids.length;i++)for(let j=0;j<r.ids.length;j++)r.gram[i][j]+=errors[i].dot(errors[j]);}}
 for(const id of ['rifle','fire','reload','slash','reverse','thrust','dodge']){const mode=ROOK_MOTION_MODES.find(m=>m.id===id);for(let frame=0;frame<=8;frame++){motion.pose(id,mode.duration*frame/8);accumulate();}}
 motion.reset();accumulate();
 function solve(matrix,rhs){const rows=matrix.map((r,i)=>[...r,rhs[i]]),count=rows.length;for(let col=0;col<count;col++){let pivot=col;for(let i=col+1;i<count;i++)if(Math.abs(rows[i][col])>Math.abs(rows[pivot][col]))pivot=i;if(Math.abs(rows[pivot][col])<1e-13)return null;[rows[col],rows[pivot]]=[rows[pivot],rows[col]];const d=rows[col][col];for(let j=col;j<=count;j++)rows[col][j]/=d;for(let i=0;i<count;i++)if(i!==col){const factor=rows[i][col];for(let j=col;j<=count;j++)rows[i][j]-=factor*rows[col][j];}}return rows.map(r=>r[count]);}
 function combinations(n,k,start=0,chosen=[],out=[]){if(!k){out.push([...chosen]);return out;}for(let i=start;i<=n-k;i++){chosen.push(i);combinations(n,k-1,i+1,chosen,out);chosen.pop();}return out;}
 let fitted=[];
 for(const r of records){let best=Infinity,bestWeights;for(let count=1;count<=Math.min(4,r.ids.length);count++)for(const indices of combinations(r.ids.length,count)){const gram=indices.map(i=>indices.map(j=>r.gram[i][j]+(i===j?1e-8:0)));const matrix=gram.map(row=>[...row,1]);matrix.push([...indices.map(()=>1),0]);const weights=solve(matrix,[...indices.map(()=>0),1]);if(!weights||weights.slice(0,count).some(x=>x<-.000001))continue;const score=indices.reduce((sum,i,u)=>sum+indices.reduce((s,j,v)=>s+weights[u]*weights[v]*r.gram[i][j],0),0);if(score<best){best=score;bestWeights=Object.fromEntries(indices.map((i,j)=>[r.detail.skin.skeleton.bones[r.ids[i]].name,Math.max(0,weights[j])]));}}if(!bestWeights)throw Error('No nonnegative fit.');fitted.push({material:r.material,p:r.p,weights:bestWeights});}
 await writeFile(resolve(root,'assets/source/rook/rook-v6-fitted-weights.json'),JSON.stringify({scope:'Nonnegative four-bone fit to barycentric coat support in seven existing motion studies. Original coat weights and all rig bones remain untouched. Independent intermediate and isolated shoulder samples are audited separately.',vertices:fitted}));console.log('Fitted',fitted.length,'garment vertex bindings.');
}
await fit();
