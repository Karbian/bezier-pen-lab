# Classroom launch review — 5 September 2026

## Baseline and release state

This review uses upstream `main` at
[`cc898793f68e37bf2421bb896b291975cd007c3d`](https://github.com/Karbian/bezier-pen-lab/commit/cc898793f68e37bf2421bb896b291975cd007c3d).
Its parent published the production build on 3 September 2026; the latest commit
refreshed the branch-hosted assets. The matching
[GitHub Pages deployment succeeded](https://github.com/Karbian/bezier-pen-lab/actions/runs/33805422340).
The initial failed deployment is historical, followed by the successful production
refresh; it is not evidence of a current deployment failure.

The connected GitHub review found no open issues or pull requests at the start of
this work. The source, configuration, and public files used for this patch were
verified against the upstream Git blob hashes. Live interaction in a browser and
physical-device testing were not performed in this review.

| Area | Current repository contents |
| --- | --- |
| Application | React + TypeScript + Vite in `src/`; static output, relative asset URLs, no server backend. |
| Learning path | Four practice stages, then the five-layer Eco Summit logo and 11-part Homer Head challenge. |
| Drawing | Corner/curve anchors, linked or independent handles, editing, undo/redo, delete, close/finish, hints, and feedback. |
| Student work | Device-local progress and paths; assembled SVG and personalized SVG evidence downloads. |
| Publishing | `.github/workflows/deploy-pages.yml` builds source changes on `main` and commits production assets to the root; Pages publishes that root. |
| Documentation | Existing setup/deployment README, now extended with tablet directions and this review. |

The patch extends this application. Challenge geometry, scoring, progression,
saved-data format, export implementation, dependencies, and deployment workflow
are preserved. Generated root assets are refreshed by the established workflow
when an approved source change reaches `main`.

## Selected improvement: drawing without modifier keys

| Student difficulty | Prepared change |
| --- | --- |
| Shift is required for constrained handle directions. | Visible **Snap angles (45°)** toggle; the keyboard shortcut continues to work. |
| Alt/Option is required to adjust just one handle. | Visible **Independent handles** toggle, usable with the snap toggle. New smooth points still create a pair; students then edit either existing handle. |
| Toolbar actions can disappear into horizontal scrolling or lose their labels on small screens. | Wrapping toolbar, persistent labels, and controls at least 44 CSS pixels high. Canvas anchors and handles retain their original sizes for precision on dense paths. |
| Pointer coordinates ignore empty margins inside the SVG element. | Transform each pointer position using the SVG's current screen matrix. Ignore initial presses outside the actual drawing bounds or when a transform is unavailable. |
| Another finger can replace an ongoing drag. | One pointer owns the drawing gesture; secondary presses are ignored. Ownership is released on pointer up, cancellation, or lost capture. This is not full hardware palm rejection. |
| Instructions describe only mouse/keyboard actions. | Practice instructions and the coach now explain touch controls. |

Both toggles start off and reset on reload. Selecting an exercise does not reset
them. Keeping the choices visible avoids adding another saved-state format.

## Verification performed

- Nine automated regression tests passed for mirrored/free handles, independent
  editing of either side, snapping in all quadrants, combined modes, returning to
  default behavior, portrait letterboxing, transformed/scrolled coordinates,
  invalid transforms, and primary-pointer ownership.
- TypeScript and the Vite production build passed using the installed dependencies.
- The patch has no whitespace errors and introduces no dependency changes.

These checks exercise the shared input functions and compilation. They do not
prove touchscreen event delivery, visible layout, pointer cancellation behavior,
or downloads in a particular browser.

## Device checks before merging for classroom use

Use a classroom tablet in portrait and landscape, with its actual browser. Test a
finger and, if used in class, the stylus. Repeat the keyboard checks on a laptop.

| Check | Expected result |
| --- | --- |
| Tap off-center locations on the guide before and after scrolling/rotation. | The anchor appears under the touch; empty margins do not create anchors. |
| Drag a new smooth point with Snap angles on, then off. | Directions constrain to 45° steps, then move freely. |
| Drag each existing handle with Independent handles on. | The opposite handle stays fixed. Both controls together also work. |
| Turn Independent handles off and drag a handle again. | Its opposite mirrors the movement. |
| Put a second finger on the canvas during a stroke, then interrupt a gesture. | The first drag is not replaced; a new stroke works after cancellation or release. |
| Use Undo, Redo, Delete, Close path, and Finish stroke. | Controls stay readable and reachable; existing operations still work. |
| On a laptop, leave toggles off and use Shift and Alt/Option. | Existing temporary keyboard modifiers still work. |
| Attempt the small Homer pupil paths and closely spaced handles. | Precision is usable with the actual classroom input device; record if a stylus or further editing aid is needed. |
| Refresh after creating unfinished work and completing a part. | Existing paths and progress return; toggles reset to Off. |
| Download a completed assembled SVG and evidence sheet. | Files open, paths have no `NaN`/`undefined`, student details are correct, and the school's submission flow accepts the files. |

## Other gaps to address before wider student rollout

1. **Saving failures can interrupt work.** The storage-writing effect calls
   `localStorage.setItem` without handling exceptions. A full or blocked store
   can raise an unhandled error. The current interface offers no project
   backup/restore file. Prioritize failure handling and recoverable saving next.
2. **Evidence can omit the student's reflection.** The exporter silently limits
   the reflection to 220 characters while the entry field accepts more. Preserve
   the full response or state and enforce a visible limit; verify long names and
   reflection layout in the exported file.
3. **Evidence requires completed progression.** Downloads are enabled only after
   every part in a build passes the existing thresholds. Decide how students who
   need more time will show unfinished work; the current exports do not cover
   that case. This is a classroom-policy decision, not a changed grading rule.
4. **Device and accessibility coverage remains incomplete.** The drawing canvas
   uses pointer gestures; existing keyboard shortcuts do not provide a fully
   keyboard-operated drawing alternative. Touch precision and browser download
   behavior require the device checks above.

## Concrete release path

1. Review the focused source patch and run its tests/build.
2. Complete the tablet/laptop checks above, especially dense paths, interrupted
   gestures, saved-work recovery, and evidence downloads.
3. Merge when the checks are acceptable. Verify that the existing asset-refresh
   workflow and the resulting Pages deployment both succeed for the new version.
4. Open the refreshed student site and run one short drawing-and-download check
   before sharing it in Schoology. Publish the tablet directions with the link.

This work prepares a draft change. It does not merge or deploy it.
