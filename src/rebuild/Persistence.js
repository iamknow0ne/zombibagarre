// Both entry points accept only saved records. JSON null, arrays and primitives
// are valid JSON but cannot serve as settings or a progression profile.
export function readStoredObject(storage,key,fallback={}){
 try{
  const value=JSON.parse(storage.getItem(key));
  return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback;
 }catch{return fallback;}
}

export function readSavedSettings(storage){
 const current=readStoredObject(storage,'zb-save-v1');
 if(current.format==='zombie-bagarre'&&current.version===1&&current.data?.settings&&typeof current.data.settings==='object'&&!Array.isArray(current.data.settings))return normalizeSavedSettings(current.data.settings);
 return normalizeSavedSettings(readStoredObject(storage,'zb-quarantine-settings'));
}
import {normalizeSavedSettings} from './SaveStore.js';
