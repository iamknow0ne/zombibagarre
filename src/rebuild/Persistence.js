// Both entry points accept only saved records. JSON null, arrays and primitives
// are valid JSON but cannot serve as settings or a progression profile.
export function readStoredObject(storage,key,fallback={}){
 try{
  const value=JSON.parse(storage.getItem(key));
  return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback;
 }catch{return fallback;}
}
