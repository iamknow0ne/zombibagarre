# The Last Checkpoint — first playable SNES slice

The room is a quiet refuge in Saint-Roch: repaired CRT sets, dusty cartridge
shelves, a sofa and a handwritten promise that somebody will fix the other
consoles. The hero can sit out the apocalypse for a few minutes. The first
cartridge is an original SNES homebrew, not a JavaScript game styled as a ROM.

## Presentation contract

Game screen / one dominant object. Charcoal CRT casing, warm ivory labels,
faded amber power light and restrained phosphor green status. Existing game
condensed headings, monospace cartridge labels, 8/12/20px spacing, 4px controls,
14px outer TV casing. No scanline overlay obscuring pixels or decorative shake.
One persistent Return to room control, short keyboard/controller legend and
explicit prototype label. At phone sizes the screen and emulator touch controls
own the space; secondary instructions collapse. Focus indicators and minimum
44px targets. Loading, error and power-off states must all retain an exit.

## Progression

Hero level 3 unlocks the SNES cartridge permanently through existing saved XP.
Testing/sandbox mode bypasses this lock. The room itself is accessible sooner,
so its console explains the requirement. Future consoles are exhibits labelled
as not yet available; no fake launch buttons or unlock promises.

## Runtime boundary

EmulatorJS 4.2.3 runs in a lazily created same-origin iframe. Only our original
ROM is loaded. Modern simulation, rendering, input and audio stop while playing;
closing removes the iframe and restores the same interior session and hero.
The emulator has no native IPC privilege. Files are self-hosted for Pages and
packaged Mac offline use. No external ROM service or commercial BIOS.

This first cartridge is an arcade survival prototype, not the completed SNES
campaign. Physical SNES hardware, flash cartridges and physical mobile/controller
behavior require separate validation. Save states belong to the cartridge;
they cannot grant modern-game XP or alter the hero save.
