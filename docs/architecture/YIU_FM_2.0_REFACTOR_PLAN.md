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

Run #21 (`41300807414`) is the first build that includes the library facade and its syntax/package checks. Its final result must be recorded after GitHub Actions completes.
