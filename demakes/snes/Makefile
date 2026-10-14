ifeq ($(strip $(PVSNESLIB_HOME)),)
$(error Set PVSNESLIB_HOME to PVSnesLib 4.6.0)
endif
export ROMNAME := zombie-bagarre
export ROMTITLE := ZOMBIE BAGARRE SNES
include ${PVSNESLIB_HOME}/devkitsnes/snes_rules
.PHONY: all
all: $(ROMNAME).sfc
