# ItalyPath Story test · QA

## Visual review

- Reviewed 7 representative frames at 1.6s, 4.0s, 5.8s, 8.0s, 8.8s,
  9.9s, and 10.9s.
- Essential copy remains inside the Instagram-safe area.
- Headline contrast is clear on all three photographic scenes.
- The cream, sage, terracotta, olive-shadow, and burgundy treatment is
  consistent across scenes.
- Cross-dissolves are restrained and preserve continuity at 4s, 8s, and 10s.
- Generated photography contains no embedded promotional copy, logo, or
  watermark.

## Composition validation

- HyperFrames lint: 0 errors, 0 warnings
- HyperFrames runtime validation: no console errors
- HyperFrames layout inspection: 0 issues across 9 timeline samples

## Final media

- File: `italypath-story-test.mp4`
- Duration: 12.000s
- Frames: 360
- Resolution: 1080×1920
- Frame rate: constant 30 FPS
- Video: H.264 High Profile
- Pixel format: yuv420p
- Color: BT.709
- Audio: AAC-LC, stereo, 48 kHz silent track
- Container: MP4
- Fast start: verified (`moov` atom precedes `mdat`)
- Decode test: passed with no FFmpeg errors
- Size: 10,977,002 bytes
- SHA-256: `d86862a6a39ef98a36c0c2dae6b95745ba13308dd0f6cb03ed4d2a34d0c405c4`
