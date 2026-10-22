# Arena material follow-up review — approved with minor notes

Scope: new `three/materials.ts`, unstaged `three/environment.ts` / `three/scene.ts` changes, and `arena-materials.test.ts` after Task 1 commit `9482a4c`. Static read-only implementation review; no tests rerun, browser ports opened, UI inspection, implementation edits or commits. The controller reports 8/8 renderer/material tests passing.

## Blockers / important findings

None identified in the scoped changes.

## Ownership and late loads

- The environment has one texture owner, discovered before generic graph disposal. It detaches the shared color/bump maps before disposing them, avoiding repeated disposal through the two shared materials.
- Disposal marks the owner inactive before disposing either texture; late success/error callbacks cannot install maps or request a render. The loader's existing request can still finish, but no late map becomes attached or GPU-uploaded through this scene.
- The bump clone shares source image data while retaining separate texture color-space configuration. Color is sRGB; bump data is untagged. Material `needsUpdate` handles adding map-dependent shader features after the initial fallback frame.
- Error handling preserves the existing materials and records fallback; no failed image stalls scene readiness. The callback uses the existing demand scheduler and introduces no second render loop.

## Geometry and runtime cost

- UV rewriting occurs once during environment construction, before static batching. It adds no per-frame geometry processing and preserves shared material draw batching.
- The top-facing axis-aligned paving uses consistent arena-space X/Z sampling, avoiding repetition of a non-seamless swatch on each tile. Clamping is appropriate for that choice.
- Added runtime cost is bounded to color and bump sampling on the two selected material families, a color texture plus bump clone, and the modest column segment increase. Anisotropy is explicitly lower at low quality. Texture dimensions/file weight and actual mobile GPU cost were outside the requested source scope and remain integrated acceptance work.

## Minor notes

1. `three/environment.ts:97` computes side-face UV height as local Y + `y`, while actual mesh translation at line 105 is `y - h / 2`. Side UVs are therefore offset by half the slab thickness. This does not affect the shared top-down paving map or interaction geometry, but slabs of different heights do not sample a truly common world-Y texture field on their sides. If visible side continuity matters, include the same `-h / 2` offset. Later rotation of decorative slabs also means their UVs intentionally remain pre-rotation rather than exact world projection.
2. `arena-materials.test.ts:18,46` counts disposal of the color texture only. The source correctly disposes the bump clone, but an additional dispose listener/assertion on that clone would make the test's “shared maps exactly once” claim cover both resources. The late-callback test meaningfully checks that disposal prevents installation and render requests.

## Verdict

**Approved to continue integrated UI/browser acceptance.** No resource-lifecycle or material correctness blocker was found; the two minor notes do not block the gate. Appearance of color-derived bump detail and mapping on curved props still requires the controller's visual check. This review does not independently certify the reported test result or device performance.
