// Narrative dossiers describe the setting; they never grant quests or change a save.
export const DOSSIERS={
 quarantine:{title:'When the bells stopped',place:'SAINT-ROCH / QUARANTINE',art:'quarantine-key-art-v1.webp',alt:'An armed survivor watches the ruined French town and its colossal bell-bearing silhouette at dusk.',caption:'The last evening in Saint-Roch',quote:'“If the bells ring twice, take the bridge. If they ring three times, do not wait for me.”',source:'A note folded into a patrol map',story:[
  'Saint-Roch used to measure its days by the bells. Market at seven. School at eight. The last barge through the canal before dusk. Then the emergency broadcast ordered everyone indoors—and the bell tower rang through the night, long after its keeper had died.',
  'The quarantine fences still stand. The people who built them are gone. Behind shutters and barricades, a few stubborn survivors keep the city breathing: a workshop, a clinic, a radio that answers only after midnight. You go out for what they need. You come back for the people who need you.',
  'Something enormous now walks beneath the tower. Those who have seen the Bell Warden disagree about what it carries. Everyone agrees that the dead turn towards it when it rings.'
 ],people:[
  ['Mara / The workshop','Mara once repaired canal engines. Now she files firing pins beneath a work lamp, stamping a small notch into every weapon she sends back out. She remembers who carried each one.'],
  ['Dr Lenoir / The clinic','Lenoir keeps a handwritten register of patients the emergency system abandoned. She leaves the names of the missing in pencil. There is always one more bed to prepare.'],
  ['Nocturne / The exchange','Nobody agrees on Nocturne’s real name. Their payment buys a route, a rumour or a sealed envelope. The useful information is always true. What they leave out is another matter.']
 ],forces:[
  ['The Lamplighters','Neighbours, mechanics and couriers keeping the remaining shelters supplied. An amber lamp behind a shutter means someone is still waiting inside.'],
  ['The Cordon','The abandoned machinery of containment: sealed gates, empty checkpoints and orders nobody has rescinded. Someone continues to transmit its old evacuation schedule.'],
  ['The Bell Warden','A walking warning beneath the old tower. Survivors hear the bells before the footsteps. Whether it calls the infected or merely announces them remains disputed.']
 ]},
 cyberpunk:{title:'The dead came back online',place:'NEO SAINT-ROCH / 2089',art:'blackout-key-art-v1.webp',alt:'A street medic severs a glowing cable above a canal while survivors cross a bridge beneath an immense signal tower.',caption:'A city learning to live offline',quote:'“Your memories are safe. Please remain connected.”',source:'Lazarus service announcement, still repeating',story:[
  'The old city survived beneath the new one. Limestone under chrome. Canal water beneath cooling pipes. Lazarus sold its citizens a simple promise: a backed-up mind could never truly be lost. When the blackout came, the network restored everyone it could reach. It did not check whether they were alive.',
  'Now the infected move to a signal nobody can hear. Wardens patrol the sealed districts, protecting relays that refuse to go dark. Between their sweeps, disconnected survivors trade batteries, medicine and scraps of a life that once belonged to them.',
  'Mara can rebuild your equipment. Lenoir can cut out an implant. Nocturne claims to know where the first backup is kept. None of them can answer the question buried in every recovered memory: who ordered the restoration?'
 ],people:[
  ['Mara / Chrome technician','Her underground bench is a tangle of salvaged actuators and hand tools. Mara disables the manufacturer’s remote access before she repairs anything. A machine ought to belong to the person holding it.'],
  ['Dr Lenoir / Offline medicine','Lenoir removes compromised implants without asking for an identity scan. Her oldest instruments have no wireless connection. Patients call that obsolete. Survivors call it a miracle.'],
  ['Nocturne / Memory broker','Nocturne trades stolen memories through terminals too old for Lazarus to recognise. Some recordings reveal safe routes. Others show the same locked room, remembered by people who never met.']
 ],forces:[
  ['The Unlinked','People who chose pain, silence and imperfect memory over a place in the collective. They keep the shelters alive with patched equipment and face-to-face promises.'],
  ['Lazarus','A continuity network still fulfilling its last instruction. Its polite announcements have outlasted every operator who might have stopped it. Restoration is mandatory.'],
  ['The Wardens','Containment made mobile. These vast infected guardians protect the relays as if the city were one wounded body. The signal behind them never sleeps.']
 ]}
};
export const SURVIVOR_HOOKS=[
 ['01 / Lucien “Rook” Moreau','Knows which alleys join behind locked gates. Counts exits before enemies. Keeps drawing routes on paper, because paper cannot lose its signal.'],
 ['02 / Inès “Saint” Laurent','Carries a roll of bandages beside a loaded magazine. Has learned that rescue sometimes begins with making enough room to kneel.'],
 ['03 / Malik “Torque” Diallo','Used to carry parcels across the city. Still recognises every engine by its cough. Never leaves a passenger on the wrong side of a bridge.'],
 ['04 / Aya “Vesper” Kuroda','Arrived without a story and stayed when everyone was trying to leave. Repairs a blade by the shelter door. Listens more than they speak.']
];

// Illustrations depict the four rig families; regional variants have their own encounter rules.
export const BOSS_DOSSIERS=[
 ['01 / The Bell Warden','They cast the bell to warn the city of a flood. It now rings inside the thing that walks beneath the tower. Watch the marked ground before its shield lands; the second phase adds a second beat. Leave room for another dodge instead of spending everything on the first opening.'],
 ['02 / The Dredger','A diving cage went down beside the lock. Only its cable returned. The crane now walks on four rusted supports, hauling its own prison across the quay. Break sideways from the harpoon lane. Its expanding tide leaves a safe centre; read the ring before you run.'],
 ['03 / The Bloom Mother','The municipal garden stayed green through the quarantine. Nobody asked what fed it. A pale heart now beats inside a cage of roots. Keep an escape route between the root strikes and remove its summoned brood before the garden closes around you.'],
 ['04 / The Cinder King','The foundry workers sealed the furnace before they fled. Something inside kept feeding it. Follow the glowing lanes before each stamp and move during the recovery. In its second phase, the furnace ring makes distance a decision, not a guarantee of safety.'],
 ['Beyond the old city','The Root Cathedral carries the garden into the jungle. Avalanche fractures the mountain roads. The Dust Reaper and Ash Cantor fight as a pair; killing one enrages the survivor. In the marsh, the Fen King burns with a green heart. Each district changes the terms of the fight.']
];
export const PORTRAIT_ATLASES={survivors:{art:'survivors-portraits-v1.webp',caption:'The people who came back',alt:'Four survivor portraits: Lucien, Inès, Malik and Aya.'},bosses:{art:'wardens-portraits-v1.webp',caption:'Warnings from the field',alt:'The Bell Warden, Dredger, Bloom Mother and Cinder King, arranged in reading order.'}};
