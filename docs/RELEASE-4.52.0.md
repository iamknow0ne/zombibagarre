# 4.52.0 — Leave the city, keep your expedition

15 October 2026. This release adds the persistence needed for longer regional
adventures. In a safe outdoor position, pause and choose **Save expedition &
exit**. The title screen offers **Resume expedition**, returning to a paused
world with the same route, supplies, quests, upgrades, enemies and damage.
Current and previously visited regions are retained together.

The checkpoint is device-local and one-use: save again before leaving. It is
separate from permanent character backups, bounded to 2 MB and checked for
corruption and incompatible data. Restore prepares the world before consuming
the record. Shared browser locks prevent competing tabs from both resuming it.
A changed permanent hero is detected rather than silently overwritten. There
is no automatic crash recovery, cloud sync or expedition export.

Short landscape pause menus now put Resume and Save in view immediately. On
Android, losing window focus sends the same pause/input-clear signal used by
backgrounding, covering system dialogs that do not pause the Activity. Native
packaging and art-source trees are excluded from development file watching.

## Validation

The full 655-test suite passed, followed by 21 final checkpoint/UI regressions
including one additional removal/readback failure case. Browser interaction
verified save → reload → resume, a full first combat wave, an earned upgrade,
a second save/restore preserving wave-two score/mastery, and cancellation of
replacement. Landscape 844×390 and portrait 390×844 were visually reviewed.
Production version verification passed. See [QA evidence](qa/4.52.0/README.md).

The unlocked OnePlus 7 Pro renders the game using Adreno 640/WebGL 2 and reached
combat and upgrade selection. Recurring Dolby Atmos system crash dialogs still
block reliable controls, clean performance measurements and remaining acceptance
tests. Android remains a local test APK, not an approved public mobile release.
No changes to that unrelated system app were made.

The Mac edition is ad-hoc signed, not Developer ID signed or notarized.
Spaceflight, additional regional destinations, indoor combat and full-expedition
endurance remain future milestones.
