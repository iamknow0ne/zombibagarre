import * as T from 'three';
import {DETAILED_GEOMETRY_KEYS} from './DetailedAppearance.js';
import {resolveAppearance,PALETTES,CUSTOMIZATION,IDENTITIES} from './Customization.js';

export const DETAILED_IDENTITIES={scout:'rook-v7',medic:'saint-v1',biker:'torque-v1',ronin:'vesper-v1'};
const COLOR_KEYS=new Set(['skin','hairColor','palette','hideHelmet']);
export function detailedIdentityCompatible(skin,appearance){
 if(!DETAILED_IDENTITIES[skin])return false;
 const actual=resolveAppearance(skin,appearance),authored=resolveAppearance(skin);
 return Object.keys(authored).every(key=>COLOR_KEYS.has(key)||DETAILED_GEOMETRY_KEYS.has(key)||actual[key]===authored[key]);
}
// Tint only explicitly changed colors; never replace a person's authored face,
// garment silhouette or hair with a mismatched generic identity.
export function tintDetailedIdentity(content,skin,appearance){
 const selected=resolveAppearance(skin,appearance),base=IDENTITIES[skin]?.defaults;
 if(!base)return;
 const relativeTint=(material,next,original)=>{const a=new T.Color(next),b=new T.Color(original);material.color.multiply(new T.Color(a.r/Math.max(.01,b.r),a.g/Math.max(.01,b.g),a.b/Math.max(.01,b.b)));};
 const references={};content.traverse(mesh=>{for(const m of [].concat(mesh.material||[])){const role=m.name?.startsWith('Field jacket /')?'cloth':m.name?.startsWith('Leather /')?'leather':m.name?.startsWith('Hardware /')?'trim':m.name?.startsWith('Scarf /')?'accent':null;if(role&&!references[role]&&m.color)references[role]=m.color.clone();}});
 const visited=new Set();
 content.traverse(mesh=>{if(!mesh.isMesh)return;for(const m of [].concat(mesh.material||[])){
  if(visited.has(m)||!m.color)continue;visited.add(m);
  const name=m.name;
  if(selected.skin!==base.skin&&name.startsWith('Skin /'))relativeTint(m,CUSTOMIZATION.skin.options[selected.skin].color,CUSTOMIZATION.skin.options[base.skin].color);
  if(selected.hairColor!==base.hairColor&&(name.startsWith('Hair /')||name.startsWith('Facehair /')))relativeTint(m,CUSTOMIZATION.hairColor.options[selected.hairColor].color,CUSTOMIZATION.hairColor.options[base.hairColor].color);
  // Eye whites share an atlas with irises, so keep those whites neutral. A
  // dedicated iris material can be tinted without recoloring the whole eye.
  if(selected.eyes!==base.eyes&&/iris/i.test(name))relativeTint(m,CUSTOMIZATION.eyes.options[selected.eyes].color,CUSTOMIZATION.eyes.options[base.eyes].color);
  if(selected.palette!==base.palette){const role=/^(Field jacket|Cloth|Coat) \//.test(name)?'cloth':name.startsWith('Leather /')?'leather':name.startsWith('Hardware /')?'trim':name.startsWith('Scarf /')?'accent':null;if(role)relativeTint(m,PALETTES[selected.palette][role],references[role]||PALETTES[base.palette][role]);}
 }});
}

// Selection is based on screen-space height, not world distance: the isometric
// camera stays far away even for a close portrait. Hysteresis prevents flicker.
export function characterDetailLevel(camera,position,viewportHeight,previous=0){
 if(!camera||!Number.isFinite(viewportHeight)||viewportHeight<=0)return 0;
 let pixels;
 if(camera.isOrthographicCamera)pixels=1.9*viewportHeight*camera.zoom/(camera.top-camera.bottom);
 else if(camera.isPerspectiveCamera){const e=camera.matrixWorldInverse.elements,x=position.x,y=position.y,z=position.z,depth=-(e[2]*x+e[6]*y+e[10]*z+e[14]);pixels=depth<=.01?Infinity:1.9*viewportHeight*camera.projectionMatrix.elements[5]/(2*depth);}
 else return 0;
 return previous===1?(pixels>125?0:1):(pixels<95?1:0);
}
