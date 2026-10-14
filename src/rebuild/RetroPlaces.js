// Listed as a rumoured refuge until explored. Position is the traversable door,
// never the solid centre of its host building.
export function retroRoomPlaces(sim){
 return (sim.interiorState?.manifest||[]).filter(p=>p.template==='retro-room-v1'&&(sim.props||[]).some(b=>b.id===p.buildingId&&b.health>0)).map(p=>({...p.door,name:sim.interiorState.visited.includes(p.id)?p.name:'Rumour / a room full of old games'}));
}
