import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function readGLB(bytes){
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error('Invalid GLB');
 const jsonSize=bytes.readUInt32LE(12);if(bytes.readUInt32LE(16)!==0x4e4f534a||bytes.readUInt32LE(24+jsonSize)!==0x004e4942)throw new Error('Expected JSON and BIN chunks');
 return{json:JSON.parse(bytes.subarray(20,20+jsonSize)),bin:bytes.subarray(28+jsonSize)};
}
// Lossless packing only: no re-encoding images, no mesh simplification and no
// removal of bones/animation. The authored candidate remains untouched.
export function packRuntime(bytes){
 const{json,bin}=readGLB(bytes);
 if(json.buffers.length!==1||json.extensionsUsed?.length)throw new Error('Review buffer/extension remapping before packing a different asset');
 const views=[],chunks=[],viewMap=[],dedup=new Map();let length=0;
 for(const source of json.bufferViews){
  const content=bin.subarray(source.byteOffset||0,(source.byteOffset||0)+source.byteLength);
  const{byteOffset,buffer,...shape}=source,key=JSON.stringify(shape)+hash(content);
  let index=dedup.get(key);if(index===undefined){index=views.length;dedup.set(key,index);const aligned=Math.ceil(length/4)*4;if(aligned>length)chunks.push(Buffer.alloc(aligned-length));length=aligned;
   views.push({...source,buffer:0,byteOffset:length});chunks.push(content);length+=content.length;}
  viewMap.push(index);
 }
 for(const accessor of json.accessors||[]){if(accessor.bufferView!==undefined)accessor.bufferView=viewMap[accessor.bufferView];if(accessor.sparse){accessor.sparse.indices.bufferView=viewMap[accessor.sparse.indices.bufferView];accessor.sparse.values.bufferView=viewMap[accessor.sparse.values.bufferView];}}
 const images=[],imageMap=[],seenImages=new Map();for(const source of json.images||[]){const image={...source,bufferView:viewMap[source.bufferView]},key=JSON.stringify([image.bufferView,image.mimeType]);let index=seenImages.get(key);if(index===undefined){index=images.length;seenImages.set(key,index);images.push(image);}imageMap.push(index);}
 for(const texture of json.textures||[])if(texture.source!==undefined)texture.source=imageMap[texture.source];
 json.bufferViews=views;json.images=images;json.buffers=[{byteLength:length}];
 const raw=Buffer.from(JSON.stringify(json)),text=Buffer.alloc(Math.ceil(raw.length/4)*4,0x20);raw.copy(text);const binary=Buffer.concat([...chunks,Buffer.alloc(Math.ceil(length/4)*4-length)]);
 const result=Buffer.alloc(28+text.length+binary.length);result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);result.writeUInt32LE(text.length,12);result.writeUInt32LE(0x4e4f534a,16);text.copy(result,20);result.writeUInt32LE(binary.length,20+text.length);result.writeUInt32LE(0x004e4942,24+text.length);binary.copy(result,28+text.length);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 for(const [input,output]of [['rook-prototype-v7.glb','rook-runtime-v7.glb'],['rook-cast-v7.glb','rook-cast-runtime-v7.glb']]){
 const source=new URL('../../assets/characters/'+input,import.meta.url),destination=new URL('../../assets/characters/'+output,import.meta.url),bytes=await readFile(source),packed=packRuntime(bytes);
 let existing;try{existing=await readFile(destination);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!existing?.equals(packed))await writeFile(destination,packed);
 console.log(`Rook lossless runtime: ${bytes.length} → ${packed.length} bytes; SHA-256 ${hash(packed)}`);
 }
}
