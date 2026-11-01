# Visualizer Lifecycle Audit v1

## Scope

Audited the pinned Run #13 visualizer lifecycle implementation:

- `APP/visualizer-manager.js`
- `APP/renderer.js`
- `APP/sonnet-adapter.js`
- `APP/tempera-adapter.js`
- `APP/lumiere-adapter.js`
- `APP/partita-adapter.js`
- `APP/bravais.js`

This is a source audit only. No engine implementation, visual effect, animation, or UI was changed.

## Current ownership

`renderer.js` owns the user-facing style transition:
- `glEnter(name)` selects an engine through `VisualizerManager.switchTo(name, { reuse: true })`.
- `glLeave()` invalidates pending style callbacks.
- `glHide()` asks the manager to hide active engines immediately, then schedules a full manager destroy after 15 seconds if no engine has been re-entered.
- The stage mode class selects the existing engine host and keeps the legacy lyric stage hidden.

`VisualizerManager` owns cross-engine serialization:
- Registers Sonnet, Tempera, Lumiere, and Partita.
- A normal switch tears down all live/active adapters, waits two animation frames when anything was destroyed, then mounts the requested adapter.
- The reuse fast path is available only to non-lazy adapters (currently Sonnet and Tempera).
- `hide()` pauses/hides live adapters without destroying them.
- `destroy()` uses the same serialized request queue.
- Playback time and lyric data are forwarded to every registered adapter; each adapter is expected to ignore drive calls while inactive and cache lyric data where needed.

## Per-adapter lifecycle behavior

| Adapter | Initialization | Show / hide | Destroy |
|---|---|---|---|
| Sonnet | `init` registers host and audio listeners; does not create WebGL | `show` restores or creates runtime; `hide` stops ticker and aborts an in-flight create | Stops governor, aborts creation, destroys runtime, clears host |
| Tempera | `init` registers host/options only | `show` resumes or creates runtime; `hide` pauses and stops test clock | Increments generation to invalidate pending creation, stops test clock, destroys runtime |
| Lumiere | Lazy; `init` loads engine if needed and creates runtime | `show` reactivates and syncs pause; `hide` deactivates and pauses | Invalidates loader/create tokens, aborts signal, destroys runtime |
| Partita | Lazy; `init` creates a React root in its host | `show` activates and renders; `hide` deactivates and hides host | Unmounts React root, clears host and lyric cache |

## Findings and risks

1. **The lifecycle boundary exists, but its protocol is not uniform.** Sonnet and Tempera use register-only `init`; Lumiere creates its runtime from `init`; Partita creates a React root from `init`. The manager has special lazy-engine handling for the latter two, but the top-level comments still describe only three engines and understate the exception.
2. **The manager has no dedicated automated lifecycle regression tests yet.** The existing test suite covers playback/lyrics/library facades and mini-player refresh, not serialized engine switching, reuse, teardown, or cancellation.
3. **The original manager's `drive()` fan-out did not isolate exceptions per adapter.** This has now been hardened in the build copy: one adapter failure is caught and logged once, later adapters still receive the clock update, and a successful later call clears that adapter's fault latch. `loadLyrics()` already had per-adapter isolation.
4. **Partita's optional `setSuspended(v)` ignores the value and always calls `hide()`.** Current inspected call sites in `bravais.js` suspend/resume Sonnet directly and do not call `VisualizerManager.setSuspended()`, so this mismatch is not currently on the observed active path. It must be corrected before manager-wide suspension is adopted for Partita.
5. **Partita is a React/DOM renderer, not a Pixi WebGL runtime,** but it is serialized through the same manager. This is safe but the manager's “one WebGL context” comment is not a complete description of its responsibility.
6. **Lazy adapters cannot use the reuse fast path.** This is an explicit current rule, so switching back to Lumiere or Partita within the 15-second retention window still destroys/recreates rather than reusing. Do not change this without adapter-specific lifecycle tests.

## Compatibility rules

- Keep all four engines and their current rendering implementations.
- Do not alter engine-specific animations, camera movement, lyric parsing, or rendering as part of lifecycle test work.
- Keep the 15-second retention policy and the current non-lazy reuse eligibility until measured and tested.
- Do not route HTMLAudio playback through a native player.
- Keep `renderer.js` as the user-facing style transition owner and `VisualizerManager` as the cross-engine lifecycle coordinator.

## Next safe step

Add VM-based tests with controlled adapter doubles for serialized switching, teardown-before-mount, reuse eligibility, hide-versus-destroy, latest-request coalescing, and clock/lyric fan-out. Only after those pass should the manager protocol or any adapter lifecycle be changed.


## Verification update — Run #62

The VM-based lifecycle regression suite now covers:
- teardown-before-mount when switching engines;
- latest-target coalescing while a previous mount is in flight;
- non-lazy reuse and the distinction between hide and destroy;
- clock and lyric fan-out;
- one adapter throwing during `drive()` without starving later adapters.

The drive isolation is applied only to the restored build-workspace copy by `YiuFM/Scripts/patch-visualizer-drive-isolation.py`. The script uses exact single-match anchors and does not edit the pinned source baseline.

Run #62 passed all 12 automated tests, XcodeGen, iOS Release build, four-engine payload verification, and unsigned IPA packaging. No engine rendering code or UI was changed.


## Follow-up implementation — lifecycle hardening

Build-only compatibility patches now address two audit findings without changing engine rendering:

- `VisualizerManager.drive()` isolates exceptions per adapter. A failure in one engine no longer prevents later adapters from receiving the same playback clock; a recovered adapter clears its fault marker.
- `PartitaAdapter.setSuspended(v)` now has reversible, idempotent semantics. Suspending hides the host and suppresses render/drive work while preserving active state and cached lyrics. Resuming restores the host and renders the latest state without recreating or unmounting the React root.

The manager header comment is also corrected to describe four renderers: Sonnet, Tempera, and Lumiere use WebGL; Partita uses React/DOM.

Regression coverage now includes serialized teardown-before-mount, latest-request coalescing, non-lazy reuse, hide-versus-destroy, clock/lyric fan-out, per-adapter drive failure isolation and recovery, and Partita suspend/resume without renderer destruction.

Verification: Run #69 passed all 13 Node tests, XcodeGen, iOS Release compilation, four-engine payload checks, and unsigned IPA packaging. This remains a build-time patch against the pinned Run #13 UI baseline; no visual engine source or UI layout is rewritten.
