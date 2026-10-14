// Actual exported garment-to-coat attachment measurements. This does not test
// visual likeness, fabric collision or physical cloth simulation.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRookMotionStudy,ROOK_MOTION_MODES} from '../../dev/RookMotionStudy.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
export async function auditRookV6Garment({rigidSeams=false}={}){
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
 const outerNormals=[];
 for(const part of new Set(records.map(r=>r.part))){if(/seam thread|sleeve cuff/.test(part))continue;const group=records.filter(r=>r.part===part),outer=group.slice(0,group.length/2),dots=[];for(const r of outer){const base=new T.Vector3().fromArray(r.triangle[0]),normal=new T.Vector3().fromArray(r.triangle[1]).sub(base).cross(new T.Vector3().fromArray(r.triangle[2]).sub(base)).normalize(),actual=new T.Vector3().fromBufferAttribute(r.detail.skin.geometry.attributes.normal,r.detail.index).transformDirection(r.detail.skin.matrixWorld);dots.push(normal.dot(actual));}outerNormals.push({part,vertices:outer.length,minOutwardDot:Math.min(...dots),meanOutwardDot:dots.reduce((a,b)=>a+b)/dots.length});}
 const refresh=()=>{scene.updateMatrixWorld(true);for(const s of skins)s.skeleton.update();for(const r of refs.values())r.skin.getVertexPosition(r.index,r.p).applyMatrix4(r.skin.matrixWorld);};
 const support=new T.Vector3(),distance=r=>{support.set(0,0,0);r.source.forEach((p,i)=>support.addScaledVector(p.p,r.bary[i]));return r.detail.p.distanceTo(support);};
 refresh();for(const r of records)r.restDistance=distance(r);
 if(rigidSeams){const skin=maps.get('Canvas / seam thread').skin,joint=skin.skeleton.bones.findIndex(b=>b.name==='spine02');if(joint<0)throw Error('Missing negative-control bone.');for(let i=0;i<skin.geometry.attributes.position.count;i++){skin.geometry.attributes.skinIndex.setXYZW(i,joint,0,0,0);skin.geometry.attributes.skinWeight.setXYZW(i,1,0,0,0);}}
 const motion=createRookMotionStudy(scene),samples=[],parts=new Map();
 function measure(label){refresh();let max=0,sum=0;for(const r of records){const drift=Math.abs(distance(r)-r.restDistance);max=Math.max(max,drift);sum+=drift;if(!parts.has(r.part))parts.set(r.part,{vertices:records.filter(x=>x.part===r.part).length,maxDrift:0,total:0,count:0,worstSample:''});const p=parts.get(r.part);if(drift>p.maxDrift){p.maxDrift=drift;p.worstSample=label;p.worstPosition=r.p;}p.total+=drift;p.count++;}samples.push({pose:label,maxDrift:max,meanDrift:sum/records.length});}
 for(const id of ['rifle','fire','reload','slash','reverse','thrust','dodge']){const mode=ROOK_MOTION_MODES.find(m=>m.id===id);if(!mode)throw Error(`Missing ${id} sample.`);for(let frame=0;frame<=16;frame++){const time=mode.duration*frame/16;motion.pose(id,time);measure(`${id}:${time.toFixed(3)}`);}}
 // Isolated shoulder raise beyond the supplied combat samples.
 motion.reset();for(const [name,angle]of [['upperarm01L',1.0],['upperarm01R',-1.0]]){const bone=scene.getObjectByName(name),parentQ=bone.parent.getWorldQuaternion(new T.Quaternion()),delta=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),angle);bone.quaternion.premultiply(parentQ.clone().invert().multiply(delta).multiply(parentQ));}measure('both-shoulders-raised');const raisedWristHeights=['wristL','wristR'].map(name=>scene.getObjectByName(name).getWorldPosition(new T.Vector3()).y);motion.reset();
 const report={scope:'Distance change between actual deformed garment vertices and their original barycentric coat support; not cloth collision, visual approval or raster decode.',rigidSeamsNegativeControl:rigidSeams,raisedWristHeights,outerNormals,vertices:records.length,frames:samples.length,maxDrift:Math.max(...samples.map(s=>s.maxDrift)),meanDrift:samples.reduce((s,x)=>s+x.meanDrift,0)/samples.length,parts:[...parts].map(([part,p])=>({part,vertices:p.vertices,maxDrift:p.maxDrift,meanDrift:p.total/p.count,worstSample:p.worstSample,worstPosition:p.worstPosition})),samples};
 for(const s of skins){s.geometry.dispose();s.skeleton.dispose();for(const t of Object.values(s.material))if(t?.isTexture)t.dispose();s.material.dispose();}return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await auditRookV6Garment(),null,2));
