// Run-local mastery is earned from actual enemy damage, never empty shots or scenery.
export const MASTERY_THRESHOLDS=[0,1000,3500,8000];
export const TIER_NAMES=['FIELD','MODIFIED','ELITE','SIGNATURE'];
export const TIER_MARKS=['I','II','III','IV'];
export const WEAPON_FINISHES={
 carbine:{body:0x43574c,trim:0xc2b28a,steel:0x83938b,accent:0xffd28a,signature:'VANGUARD',feature:'Armour-piercing ammunition',mods:['Muzzle brake / tighter grouping','Penetrator barrel / +1 penetration','Vanguard receiver / +2 penetration']},
 shotgun:{body:0x573a2d,trim:0xc89b64,steel:0x888d83,accent:0xffae65,signature:'DOORBREAKER',feature:'Eight-pellet incendiary breach',mods:['Heat shield / +1 pellet','Breaching crown / +2 pellets','Dragon shells / burning impacts']},
 smg:{body:0x314b58,trim:0xbdc2ba,steel:0x6f8998,accent:0xb5e7ff,signature:'RICOCHET',feature:'Rounds deflect from hard surfaces',mods:['Compensator / faster handling','Angled armour ricochets','Twin-port receiver / reinforced rounds']},
 revolver:{body:0x452e28,trim:0xd6b173,steel:0xa7aaa0,accent:0xffce78,signature:'VERDICT',feature:'Every fourth round detonates',mods:['Heavy cylinder / tuned action','Ported barrel / penetrator rounds','Verdict chambers / explosive fourth shot']},
 marksman:{body:0x63706a,trim:0xcbd3c4,steel:0x91aaa7,accent:0xd4fff0,signature:'HORIZON',feature:'Penetrating rounds with terminal burst',mods:['Precision optic / stabilised bolt','Rail shroud / deeper penetration','Horizon core / terminal airburst']},
 flame:{body:0x713d2c,trim:0xcc9956,steel:0x6b7870,accent:0xff883e,signature:'HELLFIRE',feature:'Longer blue-core jet and fire pools',mods:['Pressure regulator / longer jet','Dual tanks / sustained ignition','Ceramic nozzle / fire pools']},
 launcher:{body:0x596146,trim:0xd0b67a,steel:0x7e8974,accent:0xffc478,signature:'AFTERSHOCK',feature:'Three delayed secondary charges',mods:['Reinforced tube / larger blast','Rotary drum / heavy ordnance','Aftershock warhead / secondary charges']},
 arc:{body:0x2d5357,trim:0xca9a64,steel:0x91b0aa,accent:0x8ff2ef,signature:'TEMPEST',feature:'Seven-target electrical cascade',mods:['Copper capacitors / +1 chain','Split electrodes / +2 chains','Tempest cage / +3 chains']},
 katana:{body:0x253a38,trim:0xc6aa6b,steel:0xdbe3d9,accent:0xb3ece0,signature:'MOONFALL',feature:'Finisher releases a cutting wave',mods:['Braided grip / faster recovery','Damascus edge / wider reach','Moonfall steel / finisher shockwave']},
 dual:{body:0x54342f,trim:0xd8ac7b,steel:0xd4dacf,accent:0xffb991,signature:'ECLIPSE',feature:'Paired finisher releases a crosscut',mods:['Balanced guards / faster recovery','Serrated spines / wider reach','Eclipse pair / finisher crosscut']}
};
Object.assign(WEAPON_FINISHES,{
 axe:{body:0x59362b,trim:0xb68b54,steel:0x9dabaa,accent:0xffb879,signature:'HEADSMAN',feature:'Finishing cleave releases a wide cutting wave',mods:['Wrapped haft / faster recovery','Reinforced beard / extended edge','Headsman crest / execution wave']},
 spear:{body:0x334b55,trim:0xc9ae70,steel:0xc6ddda,accent:0x9fe4e6,signature:'STARLANCE',feature:'Finisher sends a piercing lance wave',mods:['Counterweight / faster thrust','Leaf blade / longer reach','Starlance core / piercing wave']},
 hammer:{body:0x494a43,trim:0xba9364,steel:0x899594,accent:0xffd09b,signature:'FAULTLINE',feature:'Finisher sends a stunning ground shockwave',mods:['Leather grip / faster recovery','Steel cheeks / extended reach','Faultline head / ground shockwave']}
});
export function weaponTier(player,key){const xp=player?.mastery?.[key]||0;return xp>=8000?3:xp>=3500?2:xp>=1000?1:0;}
export function masteryProgress(player,key){const xp=Math.max(0,player?.mastery?.[key]||0),tier=weaponTier(player,key),next=MASTERY_THRESHOLDS[tier+1];return{xp,tier,next,progress:next?(xp-MASTERY_THRESHOLDS[tier])/(next-MASTERY_THRESHOLDS[tier]):1};}
export function addMastery(player,key,amount){if(!WEAPON_FINISHES[key]||!Number.isFinite(amount)||amount<=0)return[];player.mastery??={};const before=weaponTier(player,key);player.mastery[key]=Math.min(8000,(player.mastery[key]||0)+amount);return Array.from({length:weaponTier(player,key)-before},(_,i)=>before+i+1);}
export function evolutionStats(base,key,tier=0){
 const t=Math.max(0,Math.min(3,tier)),w={...base,tier};w.damage*=1+t*.16;w.reload*=1-t*.045;w.magazine=Math.round(base.magazine*(1+t*.08));
 if(key==='carbine'){w.spread*=1-t*.15;w.pierce=t>=2?t-1:0;}
 if(key==='shotgun'){w.pellets+=Math.min(t,2);if(t===3)w.burn=1.8;}
 if(key==='smg'){w.interval*=1-t*.045;w.ricochet=t>=2?1:0;}
 if(key==='revolver'){w.pierce=t>=2?1:0;}
 if(key==='marksman'){w.pierce+=t;w.range+=t*2;}
 if(key==='flame'){w.range+=t*.65;w.burn+=t*.6;}
 if(key==='launcher')w.explosive+=t*.35;
 if(key==='arc')w.chain+=t;
 if(base.melee){w.range+=t*.12;w.interval*=1-t*.04;}
 return w;
}
