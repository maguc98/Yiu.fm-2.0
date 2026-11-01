# Yiu.fm 2.0 — Layered Architecture Refactor Plan

## Status

- Status: active incremental refactor; Swift responsibility split and playback/lyrics compatibility facades are implemented on the isolated refactor branch.
- Base branch: `development-2.0`
- Working branch: `refactor/yiu-2.0-layered-architecture`
- UI acceptance baseline: GitHub Actions Run #13 (`41293352357`); pinned legacy resource commit: `b070ae110b9cc143e71c8607466f6c1e85467367`.
- Primary constraint: preserve the Run #13 UI, interaction model, animations, and all four visual engines. This is an internal architecture refactor, not a visual redesign.

## Goals

1. Preserve the existing product experience while reducing coupling between UI, playback, lyrics, library, themes, persistence, visualizers, and iOS system services.
2. Establish explicit service contracts and lifecycle ownership before replacing implementations.
3. Improve performance based on measurements rather than assuming that a framework rewrite is automatically faster.
4. Keep each migration incremental, testable, and reversible.
5. Avoid unrelated workflow, signing, provisioning, and release-pipeline changes.

## Current repository observations

The current `YiuFM/project.yml` defines an iOS 18 application and includes the `Sources` directory as its Swift source root.

The current `YiuFM/Sources/YiuFMApp.swift` contains several responsibilities in one file:

- SwiftUI app entry point and root view.
- `LegacyVisualStage`, which creates a WKWebView and loads the bundled local `Web/index.html`.
- Registration of the legacy `yiuMusic` script-message bridge.
- `YiuAudioPlayer`, an AVAudioPlayer-based native playback class.
- `YiuMusicBridge`, which implements the existing `list`, `text`, and `read` file operations.

The native audio player is declared in the file, but the current root view does not own or connect it to the WKWebView bridge. Therefore, the existing web player must be treated as the active playback implementation until an explicit migration is designed and tested.

The legacy bridge is currently used to access local music files. Its existing JavaScript contract must remain compatible during the transition.

## Target architecture

```text
Yiu.fm App
├── AppShell
│   ├── App entry / root lifecycle
│   └── LegacyUIHost (WKWebView; preserves existing UI)
├── AppCore
│   ├── App state and lifecycle
│   ├── Typed events
│   └── Dependency composition
├── Playback
│   ├── PlaybackService contract
│   ├── HTMLAudio adapter (initial active implementation)
│   └── Native audio adapter (later, only after parity tests)
├── Lyrics
│   ├── LRC parsing and lyric timeline
│   └── Playback-clock synchronization
├── Library
│   ├── Song metadata and collection operations
│   └── Import pipeline
├── Themes
│   ├── Theme configuration
│   └── Theme asset coordination
├── Persistence
│   ├── Legacy storage compatibility
│   ├── Versioned schema and migrations
│   └── LocalStorage / IndexedDB / native-file adapters
├── Visualizers
│   ├── VisualizerHost (single lifecycle owner)
│   ├── Sonnet adapter
│   ├── Tempera adapter
│   ├── Lumiere adapter
│   └── Partita adapter
├── NativeBridge
│   ├── Versioned request/response protocol
│   └── Legacy yiuMusic compatibility
└── Performance
    ├── Baseline instrumentation
    └── Adaptive performance governor
```

The diagram describes responsibility boundaries, not a requirement to rewrite every subsystem in Swift. The legacy DOM UI and its visual engines remain in their current rendering technologies unless measurements demonstrate a specific need to change them.

## Non-negotiable compatibility rules

- Treat Run #13 as the visual and interaction acceptance baseline.
- Do not redesign or replace the existing UI as part of this refactor.
- Do not remove, replace, or simplify any of the four visual engines.
- Do not change existing storage keys or IndexedDB databases without a migration and recovery plan.
- Keep the current `yiuMusic` operations working until all callers have migrated and compatibility tests pass.
- Do not switch the active audio engine merely because a native AVAudioPlayer class exists.
- Do not modify signing, provisioning, or unrelated GitHub Actions workflows during architecture work.
- Do not delete compatibility code until the replacement is verified and rollback is no longer required.

## Migration sequence

### Phase 0 — Freeze and measure

- Record the exact source revision and resource inputs used by Run #13.
- Capture representative screenshots and interaction checks for the original UI.
- Establish cold-start, first-render, animation frame-time (p50/p95), visualizer-switch, memory, and playback/lyric-sync baselines.
- Verify the four engine payloads are present in the packaged app.

### Phase 1 — Introduce boundaries without changing behavior

- Split the Swift app shell, WKWebView host, native music bridge, and currently dormant native audio class into focused source files.
- Keep implementation behavior and bridge message shapes unchanged.
- Add explicit ownership and lifecycle handling.
- Confirm XcodeGen still includes all files under `Sources`.

### Phase 2 — Stabilize data and persistence contracts

- Add a compatibility facade around existing LocalStorage and IndexedDB data.
- Introduce schema versioning and migration checks.
- Preserve existing data and keys during the transition; do not perform destructive migrations.
- Route imports through one library import service.

### Phase 3 — Playback and lyrics contracts

- First standardize playback commands, snapshots, events, and the shared playback clock while HTMLAudio remains active.
- Keep legacy globals available through a compatibility facade while consumers migrate.
- Validate seeking, track changes, end-of-track behavior, and lyric timing before considering native playback.

### Phase 4 — Visualizer lifecycle

- Make one VisualizerHost responsible for activation, deactivation, destruction, visibility, and resource budgets.
- Adapt Sonnet, Tempera, Lumiere, and Partita independently.
- Preserve each engine's internal rendering technology and engine-specific behavior.
- Retain and integrate the existing adaptive performance governor rather than discarding it.

### Phase 5 — Native capability integration

- Version the native bridge protocol while retaining the legacy bridge during migration.
- Evaluate native playback only against a feature-parity checklist: background audio, interruptions, remote controls, seeking, progress events, file access, and lyric synchronization.
- Choose AVAudioPlayer or AVPlayer only after the required behavior and tests are established.

### Phase 6 — Cleanup

- Remove legacy compatibility paths only after usage has reached zero and regression tests pass.
- Keep a known-good rollback point for each migration milestone.

## Validation gates

A phase is not complete merely because the project compiles.

Each phase must pass:

1. Build and package validation.
2. UI screenshot comparison against the Run #13 baseline.
3. Relevant interaction regression tests.
4. Four-engine presence and activation checks where applicable.
5. Data-preservation tests for storage/import changes.
6. Performance comparison against the recorded baseline.
7. A documented rollback point.

## First implementation task

Begin with a behavior-preserving split of `YiuFMApp.swift` into focused Swift files under `YiuFM/Sources`:

- `YiuFMApp.swift`: app entry point only.
- `AppShell/YiuRootView.swift`: root view composition.
- `Web/LegacyVisualStage.swift`: WKWebView setup and local UI loading.
- `NativeBridge/YiuMusicBridge.swift`: existing `yiuMusic` contract and file operations.
- `Playback/YiuAudioPlayer.swift`: existing AVAudioPlayer class, still not wired into the UI.

This first code change must preserve behavior and avoid changing the Web UI, assets, bridge contract, audio engine selection, build workflows, signing, or provisioning. Build and inspect the diff before proceeding to service redesign.


## Implemented progress

### Phase 1A — Swift responsibility split

Completed and build-verified in GitHub Actions Run #14 (`41299881530`):

- `YiuFM/Sources/YiuFMApp.swift`: app entry point.
- `YiuFM/Sources/AppShell/YiuRootView.swift`: root view.
- `YiuFM/Sources/Web/LegacyVisualStage.swift`: WKWebView host.
- `YiuFM/Sources/Playback/YiuAudioPlayer.swift`: existing native audio class, still not wired into active playback.
- `YiuFM/Sources/NativeBridge/YiuMusicBridge.swift`: existing bridge.

The extracted implementation bodies were checked against the original source. No HTML, CSS, JavaScript engine, signing, provisioning, or unrelated workflow source was rewritten in this split.

### Phase 1B — Playback compatibility boundary

Implemented in `YiuFM/Resources/Web/APP/playback-service.js` and build-verified in Run #17 (`41300349473`).

The facade exposes a snapshot, subscription/unsubscription, play/pause/toggle, seek, lyric jump, and next-track commands. It delegates to the legacy HTML audio element and existing functions. It does not activate the dormant native audio class or replace the legacy player.

Contract: `docs/architecture/PLAYBACK_SERVICE_V1.md`.

### Phase 1C — Lyrics compatibility boundary

Implemented in `YiuFM/Resources/Web/APP/lyrics-service.js`.

The facade exposes snapshot copies, LRC parse/apply delegation, lyric seeking, and subscriptions to lyric application/index events. It does not own lyric state, playback timing, rendering, or visual-engine synchronization.

Contract: `docs/architecture/LYRICS_SERVICE_V1.md`.

Run #19 (`41300690722`) completed successfully with the lyrics facade syntax and package checks passing.

## Next safe step

Audit the existing `SongLibrary` public API and its event notifications, then document a library-service contract around the existing implementation. Do not migrate storage, change IndexedDB schema, or move import ownership until the existing behavior and edge cases have been mapped.


### Phase 1D — Library compatibility boundary

Implemented in `YiuFM/Resources/Web/APP/library-service.js`.

The facade standardizes snapshots, subscriptions, song selection/navigation, cover lookup, scanned import, and removal/clear operations by delegating to the existing `SongLibrary` API. IndexedDB, blobs, object URLs, skip records, and import sequencing remain owned by `song-library.js`.

Contract and audited legacy constraints: `docs/architecture/LIBRARY_SERVICE_V1.md`.

Run #21 (`41300807414`) completed successfully with the library facade included and all four engine payloads verified.


### Phase 1E — Automated compatibility contract tests

Added `YiuFM/Tests/compatibility-services.test.cjs` and wired it into the macOS build workflow.

GitHub Actions Run #25 (`41300975596`) completed successfully:

- 3 tests passed, 0 failed.
- Playback facade command delegation and audio-event publishing.
- Lyrics facade parse/apply/seek delegation and defensive snapshot copies.
- Library facade snapshots, subscriptions, and operation delegation.
- JavaScript syntax checks passed for all three facades.
- XcodeGen generation and iOS Release build passed.
- Run #13 UI and all four visual-engine payloads were verified in the packaged app.
- Unsigned IPA artifact uploaded (2,523,516 bytes).

Run #25 is the current verified milestone. It validates the facade contracts against controlled legacy-compatible test doubles; it is not a substitute for on-device playback, import, lyric-sync, or visualizer regression testing.

## Next step

Before migrating any existing consumer, map the current dependency edges from mini-player, iOS music scanning, player end-of-track handling, and music panel to `SongLibrary`. Then choose one low-risk consumer at a time for migration to `YiuLibrary`, with behavior tests and a rollback point. Do not change the underlying IndexedDB schema or native audio ownership yet.


### Phase 1F — First consumer migration (iOS music import)

Added `docs/architecture/LEGACY_CONSUMER_DEPENDENCY_MAP.md` after auditing the pinned Run #13 script order and all direct `SongLibrary` references in `player.js`, `mini-player.js`, and `ios-music.js`.

The native directory scanner is the safest first consumer because it has one narrow responsibility: pass scanned items and the existing `all` / `manual` / progress options into the library importer. The build now applies a guarded, exact-match patch to the restored `ios-music.js` so it prefers `YiuLibrary.importScanned()` and falls back to `SongLibrary.importScanned()`. Scan, chunked file reading, LRC matching, and import semantics remain unchanged.

The high-frequency mini-player path (50 ms normal refresh / 100 ms performance mode) and the playback end-of-track path remain on the legacy API for now. They will not be migrated until their performance and playback regression tests are ready.

Run #26 (`41301173305`) completed successfully. The exact-source patch guard, migrated iOS scanner syntax check, 3 facade contract tests, XcodeGen generation, iOS Release build, four-engine package verification, and IPA upload all passed. The unsigned IPA artifact is 2,523,532 bytes (artifact ID `13081241729`).


### Phase 1G — Event-driven mini-player refresh

The 50 ms normal / 100 ms performance-mode `npRefresh()` interval has been removed from the playback card. The build now applies a guarded patch to the pinned Run #13 mini-player copy:

- Playback and lyric changes are received through `YiuPlayback.subscribe()`.
- Song-library changes are received through `YiuLibrary.subscribe()`.
- A scoped MutationObserver reacts to actual changes in the mini-player's existing DOM, including the renderer-owned `.mi-s` status text.
- All signals are coalesced into one animation-frame refresh.
- Closing the card cancels a pending frame; the existing drag path and final refresh remain intact.
- The separate 200 ms mini-bar title/cover `tick()` is deliberately unchanged.

Implementation: `YiuFM/Scripts/patch-mini-player-refresh.py`.
Contract and limitations: `docs/architecture/MINI_PLAYER_REFRESH_V1.md`.

Run #30 (`41301825919`) completed successfully: 4/4 tests passed, patched mini-player syntax check passed, XcodeGen and iOS Release build passed, all four visual-engine payloads were verified, and the unsigned IPA artifact uploaded (2,523,837 bytes; artifact ID `13081702394`).

This is source/build verification, not yet an on-device runtime performance measurement. The next step is a focused regression audit of the mini-player's open/close, play/pause, lyric switching, song switching, performance-mode toggle, cover updates, and drag gestures before considering changes to the separate 200 ms ticker.


### Phase 1H — Playback library consumer migration

The build now applies `YiuFM/Scripts/patch-player-library-consumer.py` to the restored Run #13 `player.js` copy. The end-of-track handler and next-track command prefer `YiuLibrary` and fall back to `SongLibrary`. Both facade methods delegate to the same existing `SongLibrary` methods; the audio element, playback clock, song selection, repeat/shuffle behavior, and end-of-track policy are unchanged.

The patch is guarded by exact single-match anchors. A regression test verifies both the transformed consumer and facade-first runtime dispatch with the legacy fallback available. The build checks the transformed source in the packaged Web payload.

This completes the remaining direct `SongLibrary` consumer migration in `player.js` without moving IndexedDB, audio Blob/object URL, or import ownership. The next phase is to audit persistence reads/writes and document a non-destructive persistence compatibility contract; no database/schema migration is authorized by this step.


### Phase 2A — Persistence discovery and compatibility inventory

Added `docs/architecture/PERSISTENCE_COMPATIBILITY_V1.md` after auditing the pinned Run #13 persistence owners and their storage contracts.

The inventory records the v1 `td_autosave` backup, the `yiufm-songs` IndexedDB database and its `songs` / `files` stores, theme metadata and image storage (`themesV1`, `themeCfgV1`, `themeImgsV1`), engine-specific configuration keys, and related playback/UI preferences. It also records important fallback behavior, including quota preservation, legacy inline theme images, song restoration, and reparsing raw LRC to restore word timing.

This is an audit/documentation milestone only. No stored data, localStorage key, database, object store, schema, or migration path was changed. The next implementation step is to introduce a narrow compatibility boundary for one low-risk preference domain, after mapping its full read/write call sites and initialization order. The primary backup, song library, and theme image stores remain out of scope for that first adapter.


### Phase 2B — Persistence compatibility regression guards

Added a compatibility test that pins the observed legacy backup key and payload version, song-library database/store names and key paths, theme metadata/image stores and fallback paths, engine configuration keys, and selected playback/UI preference keys.

These are preservation guards, not a storage migration. They intentionally fail if a future refactor silently renames a key, changes an IndexedDB version/store, or removes a legacy fallback. The new test runs in the existing macOS build workflow before the iOS Release build.


### Phase 4B — Visualizer lifecycle regression and drive isolation

Added VM-based tests for serialized engine switching, teardown-before-mount, latest-request coalescing, non-lazy reuse, hide-versus-destroy, and clock/lyric fan-out.

The audit found that an exception thrown by one adapter's `drive(ct)` could abort the manager's fan-out loop. A guarded build-copy patch now isolates each adapter call, logs the first failure, continues sending the clock to subsequent engines, and clears the fault latch after recovery. No adapter timebase or animation code was changed.

Run #62 verified 12/12 tests passing, successful XcodeGen and iOS Release compilation, and all four engine payloads. The generated IPA remains unsigned.
