# Decision 0008: Temple grounds are our own procedural geometry; chuasen.com source is referenced, not copied wholesale

## What was referenced from chuasen.com's source
The project does reference chuasen.com's source code (its public JS bundle
`assets/index-*.js` and CSS `assets/index-*.css`, read on 2026-11-03 with
REA and a direct fetch — see decision 0007):
- the onboarding avatar's SVG shapes, adapted into `app/src/avatar-svg.ts`;
- the variant mechanism (a `data-look` attribute swapping gendered groups,
  CSS custom properties recolouring the robe), reimplemented in
  `app/src/style.css` under our own `va-*` class names;
- the character screen's flow and card layout (name, gender, robe colour,
  "Vào chùa"), rebuilt in `app/src/main.ts` / `style.css`.
Everything else (main hall, grounds, camera, movement, walk animation,
collisions, lighting) is this project's own code, not derived from
chuasen.com's source.

Date: 2026-11-04

## Decision
1. The temple grounds (main hall, stone pillars, meditation hut, lotus pond,
   banyan tree, meditation seats, stone path) are built in this project as
   procedural Three.js geometry (`app/src/temple-grounds.ts`, layout data in
   `app/src/temple-layout.ts`), surfaced with sansatemple.com's own PBR
   material sets (`app/public/sansatemple/materials/{wood,roof,stone,rock,
   plaster,cloth,ground}`). sansatemple.com ships those textures but no
   hall/pond/tree models, so this stays within decision 0003 (no original
   asset is replaced or modified).
2. Copying chuasen.com's entire source code was requested by the owner
   several times on 2026-11-04 and declined by Claude every time. It is a
   live, operated product by another developer; bulk-copying its codebase
   goes beyond decision 0007's narrow scope (the avatar SVG + UX patterns
   only), and its code would not plug into this Vite + Three.js project
   anyway. Commercial or not does not change this.

## Why
The owner wanted a richer, game-like temple ("như họ làm") after seeing
chuasen.com. The path agreed instead: improve this project with its own code
— skeletal walk animation on monk.glb's existing rig, third-person camera,
lighting, and procedurally built grounds — rather than duplicating another
product.

## Consequences
- Do not re-propose or re-attempt wholesale copying of chuasen.com; point to
  this decision if asked again.
- New buildings/props go into `temple-layout.ts` (positions, colliders,
  ground heights — pure, unit-tested) and `temple-grounds.ts` (meshes).
- Sizes are in avatar-relative units (monk.glb is scaled to 1.7 tall). The
  original sansatemple.com hall's real dimensions were never measured, so
  "same size as Sansa" is not verifiable from our recon.
