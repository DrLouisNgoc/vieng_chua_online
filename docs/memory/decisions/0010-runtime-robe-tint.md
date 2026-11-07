# Decision 0010: The monk's robe may be tinted at runtime

Date: 2026-11-07
Amends (does not replace) decision 0003.

## Decision
The owner chose (Milestone 6 interview, 2026-11-07) that every visitor's
3D avatar shows the robe colour picked on the "Vào chùa" screen. The robe
mesh of monk.glb gets a cloned material whose colour is set at runtime.
The asset file itself is never modified, re-exported or recoloured on disk.

## Why
Other visitors must be told apart in the scene; the owner picked "Màu áo
trên nhân vật 3D" over keeping the original look only.

## Consequences
- Supersedes the Milestone 4 ruling "avatar picker customises only the 2D
  SVG preview" for the robe colour (gender still has no 3D effect).
- The visitor's own avatar is tinted too, so it matches what others see.
