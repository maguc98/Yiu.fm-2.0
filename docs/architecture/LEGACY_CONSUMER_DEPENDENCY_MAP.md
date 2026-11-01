# Legacy Consumer Dependency Map

This map is based on the pinned Run #13 source tree at `b070ae110b9cc143e71c8607466f6c1e85467367`.

## Script load order

The relevant `index.html` script order is:

1. `APP/player.js`
2. `APP/song-library.js`
3. `APP/mini-player.js`
4. `APP/ios-music.js`

The build injects the compatibility facades immediately after `player.js`. The playback and lyrics facades can use the player globals immediately. The library facade resolves `window.SongLibrary` lazily on each call, so it remains safe even though it is loaded before `song-library.js`.

## Current dependency edges

| Consumer | Existing dependency | Behavior / risk |
|---|---|---|
| `player.js` | `SongLibrary.isMusic()`, `autoNext()`, `step(1)` | End-of-track and next-button routing. Playback-critical; do not alter without end-of-track tests. |
| `mini-player.js` | `list()`, `current()`, `peekNext()`, `step(-1)` | Computes next-song label and previous/next behavior. Its drawer refresh loop runs every 50 ms normally and 100 ms in performance mode. Avoid replacing this with allocation-heavy snapshots or extra polling. |
| `ios-music.js` | `importScanned()` | One-way native directory scan/import entry point. A narrow facade migration is low risk if the exact import options and result are preserved. |
| `song-library.js` | Player globals and functions | Owns IndexedDB, audio Blob/object URL lifecycle, LRC application, current-song restoration, and UI rendering. Keep as implementation owner in this phase. |

## Event behavior

`SongLibrary.onChange(callback)` currently invokes callbacks from the module's `render()` function. It signals that the library UI/state may have changed; it is not a typed domain-event stream and should not be interpreted as a precise add/remove/select event.

## Migration order

1. Migrate `ios-music.js` to call `YiuLibrary.importScanned()` with a legacy fallback. This is a narrow delegation change; scan, chunking, matching, progress, and import semantics remain unchanged.
2. Leave `player.js` and `mini-player.js` on the legacy API until targeted playback and 50 ms refresh performance tests exist.
3. Only then consider event-driven mini-player refresh and more explicit library domain events.
4. Do not move IndexedDB or object URL ownership out of `song-library.js` until storage migration and recovery tests exist.
