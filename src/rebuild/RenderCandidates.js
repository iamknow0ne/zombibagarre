import {Vector3} from 'three';

// Query current world transforms once per visible piece. Repeated comparator
// queries recursively recompute parent matrices for every sort comparison.
export function nearestVisiblePieces(pieces,point){
 const position=new Vector3(),ranked=[];
 for(const mesh of pieces){if(!mesh.visible)continue;mesh.getWorldPosition(position);ranked.push({mesh,distance:position.distanceToSquared(point)});}
 ranked.sort((a,b)=>a.distance-b.distance);
 return ranked.map(entry=>entry.mesh);
}

// Only recent wounds need ordering. Keep living bar state for its trailing
// health animation, but remove absent/dead enemies just as the draw pass did.
export function activeHealthBarCandidates(enemies,bars,player,clock){
 if(!bars.size)return [];
 const alive=new Set(),candidates=[];
 for(const enemy of enemies){
  if(!(enemy.health>0))continue;alive.add(enemy.id);
  const state=bars.get(enemy.id);
  if(enemy.health>=enemy.maxHealth||!state||clock-state.hitAt>4)continue;
  candidates.push(enemy);
 }
 for(const id of bars.keys())if(!alive.has(id))bars.delete(id);
 candidates.sort((a,b)=>(a.x-player.x)**2+(a.z-player.z)**2-((b.x-player.x)**2+(b.z-player.z)**2));
 return candidates;
}
