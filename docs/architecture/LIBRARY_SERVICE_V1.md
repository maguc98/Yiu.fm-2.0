# Library Service Facade v1

## Purpose

`APP/library-service.js` standardizes access to the existing `SongLibrary` module. It is an adapter over the current implementation, not a new storage engine.

The existing `song-library.js` remains the sole owner of IndexedDB, song metadata/files, object URLs, import sequencing, skip records, cover extraction, and song selection.

## Public API

- `YiuLibrary.version`: contract version, currently `1`.
- `YiuLibrary.getSnapshot()`: returns a snapshot with song metadata copies, current song ID, and music-mode state.
- `YiuLibrary.subscribe(callback)`: subscribes through the existing `SongLibrary.onChange` hook. The callback receives a fresh snapshot and an unsubscribe function is returned.
- `YiuLibrary.select(id, autoPlay)`: delegates to the existing song selection operation.
- `YiuLibrary.step(direction)`: delegates to previous/next song navigation.
- `YiuLibrary.autoNext()` and `peekNext()`: delegate to existing end-of-track and next-track logic.
- `YiuLibrary.isMusic()`: reads the existing music-mode state.
- `YiuLibrary.remove(id, element)` and `clearAll()`: delegate to existing removal operations.
- `YiuLibrary.cover(id)`: delegates to the existing asynchronous cover lookup.
- `YiuLibrary.importScanned(items, options)`: delegates to the existing scan/import pipeline.

## Observed legacy behavior and constraints

- The legacy module exposes `list`, `select`, `step`, `autoNext`, `peekNext`, `isMusic`, `remove`, `current`, `cover`, `importScanned`, `clearAll`, and `onChange`.
- `onChange` currently notifies from the module's `render()` function, rather than from a separately typed domain-event stream. Consumers must treat it as “library view/state may have changed,” not as a precise event such as “song added.”
- `select` and `remove` are asynchronous; `step` and `autoNext` return a synchronous handled/not-handled boolean while initiating the existing selection flow.
- `importScanned` processes items sequentially and returns counts for added, updated, skipped, and failed items. Its options include `onProgress`, `all`, and `manual`.
- The legacy song objects are shallow-copied in snapshots. Nested values are not deep-cloned; consumers must treat snapshot data as read-only.
- If the legacy `SongLibrary` is not yet available, the facade returns safe empty/default values. It does not claim that initialization or IndexedDB recovery has completed.

## Compatibility rules

1. Do not change the existing IndexedDB database name, object-store names, schema, or localStorage keys in this phase.
2. Do not move file/blob ownership or object-URL lifecycle into the facade.
3. Do not change import ordering, duplicate detection, skip-list behavior, or iOS file scanning.
4. Keep the existing `SongLibrary` global and all current callers working.
5. Do not rewrite the music panel UI or mini-player as part of introducing this boundary.

## Build integration

The build restores the pinned Run #13 UI, then injects `library-service.js` after the playback and lyrics facades. The workflow syntax-checks all three service facades and verifies their presence in the packaged app.
