# Lyrics Service Facade v1

## Purpose

`APP/lyrics-service.js` creates a stable access boundary around the existing LRC parser, lyric arrays, and lyric navigation functions.

It is a compatibility facade only. The existing `player.js` remains authoritative for parsing, applying lyrics, the playback clock, lyric index/progress, and synchronization with visual engines.

## Public API

- `YiuLyrics.version`: contract version, currently `1`.
- `YiuLyrics.getSnapshot()`: returns copies of the current lyric lines, timestamps, word timings, metadata, current index, and progress.
- `YiuLyrics.parse(text)`: delegates to the existing `parseLRC` function.
- `YiuLyrics.apply(parsed)`: delegates to the existing `applyLRC` function.
- `YiuLyrics.seek(index, playNow)`: delegates to `YiuPlayback.jumpToLyric` when available, otherwise to the legacy `gotoIdx`.
- `YiuLyrics.subscribe(callback)`: subscribes to lyric-application and lyric-index events through `YiuPlayback`, returning an unsubscribe function.

## Ownership and compatibility

1. `player.js` continues to own `TS`, `WT`, `LN`, `idx`, and `prog`.
2. The existing renderer and visualizer manager continue to own DOM rendering and visual-engine synchronization.
3. The facade does not create a second playback clock or animation loop.
4. Snapshot arrays are shallow copies so consumers cannot mutate the legacy arrays through the returned snapshot.
5. Existing global names and all existing UI handlers remain available during migration.
6. No HTML/CSS or visual-engine implementation is rewritten by this change.

## Build integration

The build restores the exact Run #13 legacy UI baseline and injects this script after `playback-service.js`, which itself is injected after `player.js`. The workflow runs `node --check` for the facade and verifies that both service scripts are present in the packaged app.
