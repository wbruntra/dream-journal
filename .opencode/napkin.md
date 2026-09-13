# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|

## User Preferences
- (accumulate here as you learn them)

## Patterns That Work
- (approaches that succeeded)

## Patterns That Don't Work
- (approaches that failed and why)

## Domain Notes
- Dream Journal PWA with voice recording & persistent offline storage (IndexedDB)
| 2026-09-13 | self | Passed ArtifactMetadata to write_to_file for a workspace file | Do not pass ArtifactMetadata for workspace files; only use it for artifacts in brain/ directory |

## Patterns That Work
- Voice PWA audio recording: Use `MediaRecorder` with prioritized MIME types (`audio/webm;codecs=opus`, `audio/mp4`, etc.) and fall back to browser default.
- Real-time voice visualizer: Connect MediaStream to `AudioContext` and `AnalyserNode` with `fftSize: 128` for smooth 60fps canvas wave bars.
- Persistent offline storage: Store audio Blobs directly in IndexedDB with `navigator.storage.persist()` call for durability.
- Responsive audio scrubber: Use custom `<input type="range">` with CSS variable `--progress` for full cross-browser seeking and fill styling.
