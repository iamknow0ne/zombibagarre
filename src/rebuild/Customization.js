export const IDENTITIES={
 scout:{name:'LUCIEN “ROOK” MOREAU',role:'The scout',story:'A night courier who knows every way out. His old patrol jacket has outlived three quarantines.',defaults:{skin:'warm',hair:'swept',hairColor:'umber',face:'angular',coat:'field',palette:'moss',headwear:'cap',accessory:'scarf',scar:'brow',facialHair:'stubble',eyes:'hazel'}},
 medic:{name:'INÈS “SAINT” LAURENT',role:'The medic',story:'The last ambulance stopped running weeks ago. Saint still makes her rounds.',defaults:{skin:'deep',hair:'braids',hairColor:'onyx',face:'soft',coat:'trench',palette:'rescue',headwear:'beret',accessory:'satchel',scar:'none',facialHair:'none',eyes:'amber'}},
 biker:{name:'MALIK “TORQUE” DIALLO',role:'The rider',story:'A mechanic with a rescue engine and nowhere left to retreat. Every patch on his jacket is a road he survived.',defaults:{skin:'bronze',hair:'crop',hairColor:'onyx',face:'broad',coat:'bomber',palette:'carbon',headwear:'none',accessory:'goggles',scar:'cheek',facialHair:'beard',eyes:'brown'}},
 ronin:{name:'AYA “VESPER” KURODA',role:'The ronin',story:'She arrived with two blades and a list of names. She crosses the city quietly, until she finds one.',defaults:{skin:'light',hair:'knot',hairColor:'onyx',face:'angular',coat:'split',palette:'indigo',headwear:'band',accessory:'scarf',scar:'eye',facialHair:'none',eyes:'gray'}}
};
const options=entries=>Object.fromEntries(entries.map(([key,label,color])=>[key,{label,...(color!==undefined?{color}:{})}]));
export const CUSTOMIZATION={
 skin:{label:'Skin tone',options:options([['porcelain','Porcelain',0xe0b99d],['light','Light',0xc99e7d],['warm','Warm',0xb98c69],['bronze','Bronze',0x9b6b4c],['deep','Deep',0x724936],['ebony','Ebony',0x51362b]])},
 face:{label:'Face structure',options:options([['angular','Angular'],['soft','Soft'],['broad','Broad']])},
 hair:{label:'Hairstyle',options:options([['crop','Close crop'],['swept','Side swept'],['braids','Braided back'],['knot','High knot'],['mohawk','Undercut crest'],['shaved','Shaved']])},
 hairColor:{label:'Hair color',options:options([['onyx','Onyx',0x202825],['umber','Umber',0x48332a],['copper','Copper',0x89523a],['silver','Silver',0xa2aaa2],['sand','Sand',0xb59b68],['oxblood','Oxblood',0x5a302f]])},
 eyes:{label:'Eye color',options:options([['brown','Brown',0x51372b],['hazel','Hazel',0x7e814a],['amber','Amber',0xae843d],['gray','Gray',0x809698],['blue','Blue',0x507d99],['green','Green',0x568063]])},
 facialHair:{label:'Facial hair',options:options([['none','Clean face'],['stubble','Stubble'],['beard','Short beard'],['moustache','Moustache']])},
 scar:{label:'Scars & markings',options:options([['none','Unmarked'],['brow','Split brow'],['cheek','Cheek scar'],['eye','Eye scar'],['paint','Ash warpaint']])},
 coat:{label:'Jacket silhouette',options:options([['field','Field jacket'],['trench','Long coat'],['bomber','Flight jacket'],['split','Split-tail coat']])},
 palette:{label:'Clothing palette',options:options([['moss','Moss & brass'],['rescue','Rescue ivory'],['carbon','Carbon & copper'],['indigo','Indigo & crimson'],['desert','Desert canvas'],['oxblood','Oxblood leather'],['arctic','Arctic slate'],['ochre','Hazard ochre']])},
 headwear:{label:'Headwear',options:options([['none','No headwear'],['cap','Patrol cap'],['beret','Beret'],['band','Headband'],['hood','Raised hood']])},
 accessory:{label:'Signature accessory',options:options([['none','Minimal'],['scarf','Scarf'],['satchel','Medic satchel'],['goggles','Pilot goggles'],['radio','Shoulder radio']])},
 hideHelmet:{label:'Armour helmet',options:options([['no','Show equipped helmet'],['yes','Hide helmet appearance']])}
};
export const PALETTES={moss:{cloth:0x576757,leather:0x493e31,trim:0xc0a775,accent:0x9d6a4b},rescue:{cloth:0xbab6a4,leather:0x625649,trim:0xd3c5a0,accent:0xa24c42},carbon:{cloth:0x2d383b,leather:0x362e2b,trim:0xb58151,accent:0x988158},indigo:{cloth:0x3e5063,leather:0x303535,trim:0xb8a181,accent:0x8c4141},desert:{cloth:0x9d8b66,leather:0x67503b,trim:0xd5c29a,accent:0x5d7973},oxblood:{cloth:0x643b36,leather:0x332d2a,trim:0xc5a278,accent:0xaaa491},arctic:{cloth:0x81949a,leather:0x394950,trim:0xd1d6c6,accent:0x6b7e69},ochre:{cloth:0xab8444,leather:0x3c413c,trim:0xd1bb89,accent:0x735b49}};
export function normalizeAppearance(raw){const result={};if(!raw||typeof raw!=='object')return result;for(const [key,def]of Object.entries(CUSTOMIZATION))if(typeof raw[key]==='string'&&Object.hasOwn(def.options,raw[key]))result[key]=raw[key];return result;}
export function resolveAppearance(skin='scout',raw={}){return {hideHelmet:'no',...(IDENTITIES[skin]||IDENTITIES.scout).defaults,...normalizeAppearance(raw)};}
export function appearanceSignature(skin,raw){return JSON.stringify([skin,normalizeAppearance(raw)]);}
