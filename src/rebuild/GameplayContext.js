// Location capabilities shared by the frame loop, input, and render cadence.
export const activeGameplay=state=>['playing','extracting','interior'].includes(state);
export const exteriorGameplay=state=>['playing','extracting'].includes(state);
