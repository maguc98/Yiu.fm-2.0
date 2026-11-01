# Mini-player Refresh Bridge v1

## Scope

This change removes the 50 ms (normal mode) / 100 ms (performance mode) interval that called `npRefresh()` while the playback card was open.

It changes only the build-workspace copy of the pinned Run #13 `APP/mini-player.js`. The original UI source at `b070ae110b9cc143e71c8607466f6c1e85467367` remains untouched. No HTML, CSS, markup, animation definitions, button layout, gestures, or visual-engine source is rewritten.

## Refresh triggers

The patched card schedules a refresh only when the card is open or being dragged:

- `YiuPlayback.subscribe()`: playback state, audio time/metadata/seeking, lyric index and lyric application events.
- `YiuLibrary.subscribe()`: library render/state changes, including current song and next-song information.
- A scoped `MutationObserver` on the existing mini-player subtree: catches actual changes to the mini title/tile and the renderer's `.mi-s` status text.
- Existing explicit refresh calls remain for opening the card and direct card-button actions.
- `performance-mode-change` now requests a single refresh; it no longer starts or changes a polling interval.

All asynchronous signals are coalesced through one `requestAnimationFrame` callback. Closing the card cancels a pending frame. Dragging still uses the existing no-animation direct-write path; a final refresh is requested when the drag ends.

## Deliberately unchanged

- The mini-bar's former 200 ms `tick()` has also been removed in the build copy. Its text/cover refresh is driven by `YiuPlayback` lyric-index/lyrics events and `YiuLibrary` state events.
- Audio-clock and no-audio lyric progression publish `lyricindexchange`; LRC application and actual lyric-array edits publish `lyricschange`; song title/cover/mode synchronization publishes `librarychange`.
- The mini-bar deduplication key includes the active cover as well as song title and lyric text, so cover-only changes are not skipped.
- The renderer's existing status updates remain authoritative; the card observes real `.mi-s` DOM changes rather than creating a second clock.
- The existing fade timing, text transitions, cover transitions, play icon, next-track/next-lyric label, gesture handling, and drawer animation remain in place.
- Legacy `SongLibrary`, `setPlay`, and player globals remain available.

## Build and test

The build runs `YiuFM/Scripts/patch-mini-player-refresh.py` after restoring the pinned UI baseline. The patch script requires every expected source anchor exactly once and fails closed if the baseline changes unexpectedly.

The workflow then syntax-checks the patched mini-player, runs the compatibility contract tests, and verifies in the packaged app that the interval identifiers are absent and playback/library subscriptions are present.

GitHub Actions Run #30 (`41301825919`) passed:
- 4 tests passed, 0 failed.
- XcodeGen and iOS Release build passed.
- All four legacy visual-engine payloads verified.
- Unsigned IPA uploaded (2,523,837 bytes; artifact ID `13081702394`).

These checks prove the guarded source transformation, syntax, package contents, and service contracts. They do not replace on-device visual/interaction testing or runtime CPU profiling.
