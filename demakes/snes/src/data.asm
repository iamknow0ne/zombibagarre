.include "hdr.asm"
.section ".rodata1" superfree
world_tiles:
.incbin "assets/world.pic"
world_tiles_end:
world_palette:
.incbin "assets/world.pal"
world_map:
.incbin "assets/world.map"
font_tiles:
.incbin "assets/font.pic"
font_palette:
.incbin "assets/font.pal"
actor_tiles:
.incbin "assets/actors.pic"
actor_tiles_end:
actor_palette:
.incbin "assets/actors.pal"
shot_sound:
.incbin "assets/shot.brr"
shot_sound_end:
.ends
