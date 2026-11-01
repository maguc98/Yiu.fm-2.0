# Playback Service Facade v1

## Purpose

`APP/playback-service.js` introduces a stable boundary around the existing playback implementation. It is deliberately a compatibility facade, not a replacement audio engine.

The existing `player.js`, HTML `audio` element, LRC parser, animation loop, and UI handlers remain authoritative. The facade must not change their behavior or visual output.

## Public API

- `YiuPlayback.version`: contract version, currently `1`.
- `YiuPlayback.getSnapshot()`: returns a point-in-time playback and lyric snapshot.
- `YiuPlayback.subscribe(callback)`: subscribes to playback events and returns an unsubscribe function.
- `YiuPlayback.play()`, `pause()`, `toggle()`: delegate to the existing `setPlay` function.
- `YiuPlayback.seek(seconds)`: safely seeks the existing HTML audio element.
- `YiuPlayback.jumpToLyric(index, playNow)`: delegates to the existing `gotoIdx` function.
- `YiuPlayback.next()`: delegates to the existing `goNext` function.

The facade also emits the DOM event `yiufm:playback` with an event object containing `type` and `snapshot`.

## Event sources

The first version observes native audio events:

- `play`, `pause`, `timeupdate`
- `loadedmetadata`, `durationchange`
- `seeking`, `seeked`, `ended`, `error`

It also wraps existing global functions after `player.js` has defined them:

- `setPlay` → `playbackstatechange`
- `gotoIdx` → `lyricindexchange`
- `applyLRC` → `lyricschange`

The wrapper calls the original function with the same receiver and arguments, returns its result, and publishes a snapshot afterward.

## Snapshot fields

- `currentTime`, `duration`
- `isPlaying`, `audioReady`
- `lyricIndex`, `lyricProgress`, `lyricCount`

The snapshot is observational; it does not own or mutate player state.

## Compatibility rules

1. Keep all legacy globals and function names available during migration.
2. Do not migrate existing UI consumers in the same change that introduces this facade.
3. Do not replace HTML audio with AVAudioPlayer/AVPlayer in this phase.
4. Do not add a second animation or playback clock.
5. Do not use the facade to drive visualizers directly; the existing player loop and VisualizerManager remain responsible for that.
6. Future changes must preserve the existing public API or introduce a new version explicitly.

## Build integration

The build restores the exact Run #13 web UI baseline and injects this facade immediately after the existing `player.js` script tag. The original baseline `index.html` and all visual-engine source files remain unchanged.

The build verifies that the facade file is packaged and that the injected script reference exists in the packaged app.
