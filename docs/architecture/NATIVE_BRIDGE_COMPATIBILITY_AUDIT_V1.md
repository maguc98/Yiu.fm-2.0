# Native Bridge Compatibility Audit v1

## Scope

Audited the current Swift shell and pinned Run #13 web player:

- `YiuFM/Sources/YiuFMApp.swift`
- `YiuFM/Sources/AppShell/YiuRootView.swift`
- `YiuFM/Sources/Web/LegacyVisualStage.swift`
- `YiuFM/Sources/NativeBridge/YiuMusicBridge.swift`
- `YiuFM/Sources/Playback/YiuAudioPlayer.swift`
- `APP/ios-music.js`
- `APP/player.js`

This is an architecture and compatibility audit. It does not change the audio engine or UI.

## Current runtime path

1. `YiuFMApp` presents `YiuRootView`.
2. `YiuRootView` presents `LegacyVisualStage`, a local `WKWebView`.
3. `LegacyVisualStage` registers the `yiuMusic` script-message reply handler and loads the bundled `Web/index.html`.
4. `APP/ios-music.js` detects `window.webkit.messageHandlers.yiuMusic` and calls the bridge with `list`, `read`, and `text` operations.
5. `YiuMusicBridge` reads files from the app's Documents/Music directory. Audio files are transferred in bounded chunks; LRC files are returned as decoded text.
6. The web scanner passes scanned files to `YiuLibrary.importScanned()` (with the legacy `SongLibrary` fallback), which stores the audio Blob in the existing `yiufm-songs` IndexedDB database.

## Audio authority

The pinned web player obtains its audio element from `document.getElementById('audio')` and owns play/pause, seeking, current time, and lyric synchronization through that HTMLAudio element.

`YiuAudioPlayer` is currently a separate AVAudioPlayer implementation and is not instantiated by `YiuFMApp`, `YiuRootView`, or `LegacyVisualStage`. It is dormant infrastructure, not the active playback path.

**Compatibility rule:** HTMLAudio remains the single authoritative playback engine for this migration phase. Do not connect `YiuAudioPlayer` to the UI or mirror playback state into it as part of unrelated refactoring. Any future native playback migration must be a separately planned project with explicit audio-clock, seeking, interruptions, background playback, lyric timing, and library-ownership parity tests.

## File bridge contract

| Operation | Input | Output |
|---|---|---|
| `list` | `{op: "list"}` | `{files: [{name, size, dir}]}` |
| `read` | `{op: "read", name, offset, length}` | `{data: base64, size}` |
| `text` | `{op: "text", name}` | `{text}` |

Security and compatibility observations:
- The bridge accepts a single filename and rejects slash, backslash, dot, and dot-dot names.
- Chunk reads cap each request at 8 MiB.
- Text decoding attempts UTF-8, UTF-16, and GB18030, matching the scanner's legacy expectations.
- The JS scanner pairs LRC and audio files by normalized basename and delegates duplicate detection/import semantics to the existing library.
- The bridge directory is Documents/Music. The dormant AVAudioPlayer copies selected files into Documents/YiuMusic; these are currently separate storage paths and must not be conflated.

## Lifecycle and future risks

- The message handler is registered on the WKWebView configuration before loading the local page and removed when the representable is dismantled.
- The bridge performs file I/O on a dedicated serial queue and sends reply callbacks back to the main queue.
- The native audio class currently owns a 200 ms progress timer. This is not part of the active playback path and must not be introduced into lyric timing without a dedicated clock-accuracy evaluation.
- The current bridge imports files into IndexedDB rather than playing directly from the Documents/Music directory. This preserves the existing web library's Blob/object-URL model.

## Next safe step

Keep the bridge as a file-import adapter only. Add contract regression tests that pin the JS operation names, Swift handler cases, safe filename checks, and the fact that the native AVAudioPlayer is not wired into the app shell. Do not change playback ownership or directory layout in this phase.
