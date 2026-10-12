import {UPGRADES,UPGRADE_TIERS,rankOf} from './Upgrades.js';
const paths={
 rounds:'M5 19V8l3-5 3 5v11Zm9 0V8l3-5 3 5v11ZM5 15h6m3 0h6',
 boot:'M7 3h8v10l6 3v4H3v-6h4Zm0 6h8m-8 4h5',
 heart:'M12 20 3 11C-1 3 8 1 12 7c4-6 13-4 9 4Z',
 reload:'M4 9a8 8 0 0 1 14-4l3 3M21 3v5h-5M20 15a8 8 0 0 1-14 4l-3-3m0 5v-5h5',
 magnet:'M4 3v10a8 8 0 0 0 16 0V3h-5v10a3 3 0 0 1-6 0V3Zm0 5h5m6 0h5',
 bomb:'M16 8 19 5l-2-2m2 2 2-2M15 9a7 7 0 1 1-10 10A7 7 0 0 1 15 9Zm-8 4 2-2',
 wrench:'M14 3a6 6 0 0 0-6 8L2 17l5 5 7-8a6 6 0 0 0 7-7l-5 4-4-4Z',
 shield:'M12 2 21 6v6c0 5-9 10-9 10S3 17 3 12V6Zm-5 9 4 4 6-7',
 pulse:'M2 12h5l3-9 4 18 3-9h5',
 pierce:'M2 12h20l-5-5m5 5-5 5M7 3v5m0 8v5m6-18v5m0 8v5',
 target:'M12 2v5m0 10v5M2 12h5m10 0h5M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 5v4m-2-2h4',
 magazine:'M7 3h11l-2 18H5ZM7 7h10M7 11h9M6 15h9',
 flame:'M12 2c2 7 8 6 8 13a8 8 0 0 1-16 0c0-3 2-6 4-8l1 6Zm0 11c-5 5-1 9 2 7 3-2 0-5-2-7Z',
 snow:'M12 2v20M3 7l18 10M3 17 21 7M8 4l4 4 4-4M8 20l4-4 4 4',
 blast:'m12 1 2 7 7-4-3 7 5 3-7 2 3 7-7-5-6 5 1-8-6-3 7-2Z',
 plates:'M4 3h16v5H4Zm0 7h16v5H4Zm0 7h16v4H4M8 3v18',
 crate:'M3 6h18v15H3ZM3 10h18M8 6V3h8v3M9 14h6m-3-3v8',
 skull:'M5 15a9 9 0 1 1 14 0v5H5ZM8 20v3m4-3v3m4-3v3M7 10h2m6 0h2m-6 5h2',
 crown:'m3 5 5 5 4-8 4 8 5-5-2 14H5ZM5 15h14',
 fist:'M5 11V7h4V4h4v2h4v2h4v8l-5 6H9l-6-7v-4Zm4-4v7m4-8v8m4-6v6',
 scope:'M3 12h18m-4-4 4 4-4 4M4 5h5V2m11 17h-5v3',
 drop:'M12 2S4 11 4 16a8 8 0 0 0 16 0c0-5-8-14-8-14Zm-4 13c-1 3 1 5 3 5',
 swords:'M3 2 18 17m-4 1 5-5m-3 5 5 4M21 2 6 17m-1-4 5 5m-2 0-5 4M3 2l1 6 4-4m13-2-1 6-4-4',
 embers:'m12 2 4 7-4 6-4-6Zm-7 11 3 5-3 4-3-4Zm14 0 3 5-3 4-3-4Z',
 bolt:'M14 2 3 14h8l-1 8L22 9h-9Z',
 crystal:'M8 2h8l5 8-9 12L3 10Zm0 0 4 8 4-8M3 10h18m-9 0v12',
 ghost:'M5 21V10a7 7 0 0 1 14 0v11l-4-3-3 3-3-3ZM8 10h2m4 0h2M1 7h2m18 7h2',
 arrow:'M2 5h7m-7 7h10m-10 7h7M13 3l9 9-9 9 3-9Z',
 medical:'M8 2h8v6h6v8h-6v6H8v-6H2V8h6ZM9 11h6m-3-3v8',
 pack:'M5 6h14l2 15H3ZM8 6V2h8v4M6 13h12v5H6m4-8h4',
 book:'M12 5C7 1 3 3 2 4v17c4-2 7-2 10 0 3-2 6-2 10 0V4c-4-2-7-2-10 1Zm0 0v16M5 8l4 1m6 0 4-1',
 wheel:'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM3 7l6 4m6 0 6-4m-9 8v7'
};
export const upgradeIcon=key=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${paths[key]}"/></svg>`;
export function renderUpgrades(sim,onChoose,onReroll){
 const $=id=>document.getElementById(id);
 $('upgrade-kicker').textContent=`WAVE ${String(sim.wave).padStart(2,'0')} CLEARED / CHOOSE ONE`;
 $('upgrade-legend').innerHTML=UPGRADE_TIERS.map(t=>`<span style="--tier:${t.color}">${t.mark} ${t.name}</span>`).join('');
 $('upgrade-choices').replaceChildren(...sim.choices.map(u=>{const b=document.createElement('button'),owned=rankOf(sim.player,u.id);b.className='upgrade-choice ranked-upgrade';b.style.setProperty('--tier',u.tier.color);
 b.innerHTML=`<span class="perk-tier">${u.tier.mark} / ${u.tier.name}</span><span class="perk-icon">${upgradeIcon(u.icon)}</span><small>${u.tag}</small><b>${u.title}</b><span class="perk-rank">${owned?`${UPGRADE_TIERS[owned-1].mark} → ${u.tier.mark} · EVOLVE`:'NEW UPGRADE · I / IV'}</span><p>${u.description}</p><span class="perk-pips" aria-hidden="true">${UPGRADE_TIERS.map((_,i)=>`<i class="${i<u.rank?'lit':''}"></i>`).join('')}</span><span class="choose">${owned?'EVOLVE UPGRADE':'TAKE UPGRADE'} ↗</span>`;
 b.onclick=()=>onChoose(u.id);return b;}));
 $('upgrade-reroll').textContent=`REROLL · ${sim.rerolls} LEFT`;$('upgrade-reroll').disabled=sim.rerolls<=0;$('upgrade-reroll').onclick=onReroll;
 const owned=UPGRADES.filter(u=>rankOf(sim.player,u.id)>0);$('upgrade-build-count').textContent=`YOUR BUILD · ${owned.length} / ${UPGRADES.length}`;
 $('upgrade-build').innerHTML=owned.length?owned.map(u=>{const rank=rankOf(sim.player,u.id),tier=UPGRADE_TIERS[rank-1];return `<li style="--tier:${tier.color}"><span>${upgradeIcon(u.icon)}</span><b>${u.title}</b><small>${tier.mark} · ${tier.name}${rank===4?' · MAX':''}</small></li>`;}).join(''):'<li class="empty-build">Your first choice starts the build.</li>';
}
