# Yiu.fm 2.0 — On-device Regression Checklist

## Purpose and limits

This checklist is for manual validation on a real iPhone of the event-driven mini-player and the existing legacy playback UI.

The latest automated baseline is GitHub Actions Run #52:
- Run: https://github.com/maguc98/text-display-ios/actions/runs/41305330292
- Result: 6 tests passed, 0 failed; Xcode iOS Release build passed; all four visual-engine payload checks passed.
- Artifact: `YiuFM-2.0-unsigned-ipa` (2,524,092 bytes; artifact ID `13083257342`).

The IPA is **unsigned**. It must be signed with the user's own certificate/profile before installation. Do not upload or expose the private key to an untrusted signing service.

CI validates source transformations, syntax, service contracts, packaging, and the presence of the four visual engines. It does not prove runtime behavior on a physical iPhone, visual equivalence, thermal behavior, or CPU/battery improvements. Record those separately.

## Test setup

1. Install the signed build corresponding to Run #52 on the target iPhone.
2. Use a small local library with at least three tracks:
   - one with embedded artwork,
   - one with no embedded artwork,
   - one with a custom per-track cover.
3. Use an LRC file with enough lines to observe automatic progression and manual lyric edits.
4. Keep the app in the foreground for the first pass. Repeat selected checks after backgrounding and relaunching.
5. If possible, record the screen and note the device model, iOS version/build, app build/run number, and whether Performance Mode is enabled.

## Functional regression matrix

| ID | Action | Expected result |
|---|---|---|
| P01 | Cold launch with a previously selected track | The selected track restores; title and cover settle to the restored track, not a previous track. |
| P02 | Start playback and let several lyric lines advance | The mini-bar lyric/title follows the current line/song without waiting for a visible polling delay. No frozen title. |
| P03 | Manually jump to a distant lyric line | The mini-bar and playback card update to the selected line. |
| P04 | Edit a lyric line, bulk-replace lines, then restore a lyric package | Each real lyric-text change refreshes the mini-bar; visual-only settings changes do not cause visible flicker. |
| P05 | Rapidly switch A → B → C while artwork loads | The final title/artwork belong to C. A late artwork response for A or B must not overwrite C. |
| P06 | Switch between tracks with artwork and without artwork | Artwork updates correctly; the no-artwork track uses the existing default presentation. |
| P07 | Set a custom cover for a track, switch away and back | The custom cover remains attached to that track. |
| P08 | Reset that track's custom cover | The embedded cover returns, or the default presentation appears when no embedded cover exists. |
| P09 | Switch Text Mode ↔ Music Mode repeatedly | The mini-bar title and next/previous labels reflect the active mode. No stale mode label. |
| P10 | Delete the currently selected track | Playback stops/clears as before; the mini-bar title/cover and next/previous labels settle to the no-current-track state. |
| P11 | Delete a different track | The current track remains selected and its title/cover do not change. |
| P12 | Clear the library, then relaunch | The empty-library state is shown; no deleted title or cover reappears. |
| P13 | Open and close the playback card repeatedly | Existing fade, cover transition, controls, and open/close behavior remain intact. |
| P14 | Drag the playback card using its existing gesture | Drag remains responsive; after release the card content is current and not stale. |
| P15 | Toggle Performance Mode while the card is open | A single refresh occurs; no repeated refresh loop is reintroduced and the UI remains correct. |
| P16 | Exercise play/pause, seek, next/previous, shuffle, and repeat | Existing playback semantics remain unchanged; no second audio clock or duplicate playback is introduced. |

## Performance observations

Do not judge performance from a single short interaction. Repeat the same sequence at least three times in both normal and Performance Mode.

Record:
- any visible delay between lyric/song change and mini-bar update;
- missed or duplicated updates;
- animation stutter while opening, closing, or dragging the card;
- unexpected CPU/battery heating during a 5–10 minute playback session;
- memory warnings, app termination, or audio interruptions.

A subjective smoother-feeling result is useful feedback, but it is not a measured CPU/battery improvement. Quantitative claims require Instruments or equivalent device profiling.

## Failure report template

For any failure, capture:
- Test ID (for example, P05);
- iPhone model and iOS version/build;
- app Run #52 or later run number;
- normal or Performance Mode;
- exact steps and whether the issue reproduces;
- screen recording or screenshot, if safe and practical;
- whether relaunching clears the issue.

Do not change the pinned UI baseline, CSS, visual-engine code, or playback engine merely to work around a failed test. First isolate the event source and reproduce it with the smallest change possible.

## Sign-off

- [ ] Functional matrix completed
- [ ] No visible UI/layout/animation regression
- [ ] No playback behavior regression
- [ ] No stale title/artwork after rapid track switching
- [ ] Performance observations recorded
- [ ] Any failures reproduced and isolated

A completed checklist is a manual device-validation record; it is not a substitute for instrumented performance profiling.
