# Persistence Compatibility Inventory v1

## Scope and status

This document records the persistence behavior found in the pinned Run #13 web source:

- UI/resource baseline: `b070ae110b9cc143e71c8607466f6c1e85467367`
- Status: discovery and contract inventory only.
- No database, object store, localStorage key, backup schema, or stored value is changed by this audit.

The app currently has several independent persistence owners. They must not be collapsed into one generic store or migrated together without per-domain compatibility tests.

## 1. Main text-editor backup

Owner: `APP/storage.js`

- localStorage key: `td_autosave`.
- Serialized payload identifies itself as `app: "text-display"`, `v: 1`.
- The snapshot contains lyric text and card formatting (`LN`, `CF`), file packages (`PACKAGES`, `ACTIVE_PKG`), general/background/lyric/playback/UI settings (`G`, `BG`, `LY`, `P`, `X`), line timestamps (`TS`), LRC metadata (`LRC_META`), and the global cover.
- Autosave is debounced by 500 ms and flushed when the document becomes hidden or receives `pagehide`.
- Quota fallback attempts to preserve the last saved background image, particle image data, and cover while saving the remaining state.
- Import/export uses the same JSON snapshot shape, with validation and legacy package fallback.

Compatibility constraints:
- Keep the key and v1 payload readable.
- Do not assume this backup contains per-character/word timing arrays: the observed snapshot stores `TS` but not `WT`.
- Do not remove the quota-preservation behavior.

## 2. Song library and audio files

Owner: `APP/song-library.js`

IndexedDB:
- Database: `yiufm-songs`, version 1.
- Object store `songs`: keyPath `id`, autoIncrement enabled; stores song metadata.
- Object store `files`: keyPath `id`; stores audio Blob and associated cover data.

Related localStorage keys:
- `song_cur`: last selected song ID, used to restore the track without auto-playing.
- `song_order`: user-defined song ID order.
- `ios_music_skip`: up to the last 500 manually deleted iOS-scanned file identities, preventing automatic re-import.
- `lyoff_hidden`: visibility state of the lyric-offset control.

Other behavior:
- Audio object URLs are created/revoked by the song-library owner.
- Raw LRC text is stored with song metadata. On restore, the app reparses that LRC to restore `WT` when the parsed line count matches the restored `TS` array.
- The library importer preserves sequential processing, duplicate detection, skip-list behavior, progress callbacks, and add/update/skip/fail counts.

Compatibility constraints:
- Keep database name, version, object-store names, key paths, localStorage keys, and stored record fields unchanged until a separately tested migration exists.
- Do not move Blob/object-URL ownership into a facade.
- A library snapshot is not a replacement for the raw persisted song record.

## 3. Themes and theme images

Owners: `APP/core.js`, `APP/theme-picker.js`, `APP/theme-editor.js`.

localStorage:
- `themesV1`: user-editable theme list.
- `themeCfgV1`: per-theme configuration metadata, including image IDs.
- Theme editor settings are stored separately from the theme list.

IndexedDB:
- Database: `themeImgsV1`, version 1.
- Object store: `img`; stores image data addressed by `imgId`.

Fallback:
- If IndexedDB writes fail or the database is unavailable, the editor attempts a legacy inline-image localStorage representation.
- It preserves already-saved images when quota is insufficient and warns rather than replacing all stored images with empty values.
- After successful metadata writes, unreferenced image IDs are cleaned up.

Compatibility constraints:
- Preserve both the normal IndexedDB path and the legacy inline-image fallback.
- Do not rename `imgId`, change database/store names, or remove fallback reads during the compatibility phase.
- The main `td_autosave` snapshot also stores the current background image; that duplication is intentional legacy behavior until proven otherwise.

## 4. Engine and playback preferences

Engine configuration is independently owned by each adapter:

| Domain | localStorage key |
|---|---|
| Sonnet configuration | `sonnetCfg.v1` |
| Sonnet dynamic performance governor | `folia.sonnet.dynamic` |
| Tempera configuration | `temperaCfg.v1` |
| Lumiere configuration | `folia.lumiere.cfg` |
| Partita configuration | `partitaCfgV3` |
| Shared engine render-resolution multiplier | `qt_res_mul` |
| Beat analysis tuning | `yiu.beatTune.v1` |

Other observed user preferences:
- `performanceMode`: performance optimization preference.
- `playModeV1`: sequential/random/repeat playback mode.
- `ui_mode_pref` and `ui_mode_last`: startup mode preference.
- `uiSpd`: interface animation speed.
- `gb`, `immerseSec`, `singleColorMode`, `glassDepth2`: appearance/interaction preferences.
- `splashImg`: startup cover image.

Compatibility constraints:
- Each engine adapter remains the owner of its own validated configuration for now.
- Do not silently normalize, reset, or merge engine-specific settings as part of a storage refactor.
- Keep the shared `qt_res_mul` key stable while all current consumers remain in use.

## 5. Release notes and diagnostics

- `changelogV2` is the current structured release-note store; `changelogV1` is read as a legacy migration source.
- Developer/diagnostic scripts also use many `cmd_*`, `dev_*`, and subsystem-specific keys. They are not part of the primary user-content schema and should be inventoried separately before any cleanup.
- Diagnostic tooling can inspect, export, import, and delete localStorage keys. Never run destructive diagnostic commands as part of automated migration tests.

## Migration rules

1. Read first; never rename or delete existing keys/databases during facade introduction.
2. Keep storage ownership with the existing module until a tested adapter has full read/write parity.
3. Preserve failure behavior, quota handling, fallback paths, and data recovery semantics.
4. Add fixture-based tests for old records and backups before changing serialization.
5. Test persistence across app reload, song restoration, import/export, theme image hydration, and storage-unavailable/quota conditions.
6. Keep rollback possible by retaining the old readers and writers until the new path is proven on-device.

## Next safe implementation step

Introduce a small `YiuStorage` compatibility boundary for a single low-risk preference domain first, with the exact old key unchanged and a legacy fallback. Do not move IndexedDB databases or the main backup/song/theme records in the first implementation. Select the first domain only after its read/write call sites and initialization order are fully mapped.
