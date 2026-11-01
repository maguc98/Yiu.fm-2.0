# Legacy Consumer Dependency Map

This map is based on the pinned Run #13 source tree at `b070ae110b9cc143e71c8607466f6c1e85467367`.

## Script load order

The relevant `index.html` script order is:

1. `APP/player.js`
2. `APP/song-library.js`
3. `APP/mini-player.js`
4. `APP/ios-music.js`

The build injects playback, lyrics, and library compatibility facades immediately after `player.js`. The library facade resolves `window.SongLibrary` lazily on each call, so it remains safe even though it is loaded before `song-library.js`.

## Current dependency edges

| Consumer | Current dependency | Behavior / risk |
|---|---|---|
| `player.js` | Prefers `YiuLibrary`, falls back to `SongLibrary`; uses `isMusic()`, `autoNext()`, and `step(1)` | End-of-track and next-button routing. The facade delegates to the same legacy methods; audio engine and track-selection ownership are unchanged. Playback-critical; keep targeted end-of-track tests. |
| `mini-player.js` | `YiuPlayback` / `YiuLibrary` subscriptions; facade methods for navigation and metadata | Card refresh is event-driven and coalesced through RAF. Mini-bar refresh listens to lyric/library events. No interval polling remains in the patched build copy. |
| `ios-music.js` | Prefers `YiuLibrary.importScanned()`, falls back to `SongLibrary.importScanned()` | Narrow delegation only. Scan, chunked file reading, LRC matching, progress, and import semantics remain unchanged. |
| `song-library.js` | Owns IndexedDB and legacy player integration | Remains the implementation owner for IndexedDB, audio Blob/object URL lifecycle, LRC application, current-song restoration, and UI rendering. Do not migrate storage ownership in this phase. |

## Event behavior

`SongLibrary.onChange(callback)` currently invokes callbacks from the module's `render()` function. It signals that the library UI/state may have changed; it is not a typed domain-event stream and must not be interpreted as a precise add/remove/select event.

The build-only mini-player bridge combines playback and library subscriptions with a scoped MutationObserver, coalescing refreshes into one animation frame. The mini-bar consumes explicit lyric-index, lyric-data, and library-change notifications.

## Migration history

1. `ios-music.js` was migrated first to call `YiuLibrary.importScanned()` with a legacy fallback.
2. The mini-player card and mini-bar were migrated to event-driven refresh while retaining the existing visual DOM, gestures, and animation behavior.
3. `player.js` end-of-track and next-track consumers now prefer `YiuLibrary` and retain a `SongLibrary` fallback. The facade delegates to the same legacy API; it does not own playback or song selection.

## Remaining constraints

- Keep the legacy `SongLibrary` global and all current callers working during migration.
- Do not change IndexedDB database/store names, schema, localStorage keys, import ordering, duplicate detection, or skip-list behavior.
- Do not move file/blob ownership or object-URL lifecycle into the facade.
- Do not replace HTMLAudio or connect the dormant native AVAudioPlayer implementation.
- Continue with persistence contract discovery and explicit lifecycle/visualizer boundaries only after tests and a rollback point are established.
