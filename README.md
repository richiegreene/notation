# Notation

### [notation.richiegreene.com](https://notation.richiegreene.com)

A browser-based tuner and resource for microtonal and xenharmonic notation systems. Enter pitches as just-intonation ratios, chords, or visually by selecting given accidentals and read them back in several different microtonal notation systems side by side, along with the nearest 12edo cent deviation, frequency, and audio playback.

---

## Features

### Tuner
Match a live sound against a scale by ear and eye:

- **Live pitch detection** from the microphone (McLeod / NSDF), plotting the
  incoming pitch against a scrolling cent ruler with the received pitch fixed at
  the centre line.
- Label the scale degrees in any notation language — **HEJI, Sagittal,
  Johnston, or Ups and Downs** — drawn from a just-intonation set (integer-,
  odd-, or prime-limit, or a custom scale) or an EDO.
- Names, ratios, and ruler dots turn **blue in tune** (within 4c), fading
  through three 2c gradient steps as the pitch approaches.
- Optional complexity (Tenney) sizing, 89-limit extensions, and enharmonic
  equivalents; adjustable **cents window** (zoom) via the Settings card.

### Pitch entry
Choose whichever way of describing a pitch is most natural:

- **Chord Entry** — enumerated chords (e.g. `4:5:6`, `4::8`) or note-by-note.
- **HEJI Entry** — a palette of Helmholtz-Ellis accidentals spanning primes 3
  through 89.
- **Interval Entry** — stack a ratio a chosen number of times.
- **Sagittal Entry** — build accidentals in evo or revo flavor from a note,
  octave, and accidental input.
- **Johnston Entry** — a diatonic nominal plus stacked comma accidentals.

### Notation output
Every entered pitch is rendered simultaneously across all notation systems:

- **HEJI Output** — Helmholtz-Ellis JI Pitch Notation, extendable to the 89-limit.
- **Ups and Downs Output** — an EDO approximation of each pitch (e.g. 41-edo),
  with optional enharmonic equivalents.
- **Sagittal Output** — evo/revo and Unicode/ASCII variants.
- **Johnston Output** — Ben Johnston's extended just-intonation spelling.

Each output column reports the exact ratio, the nearest 12EDO pitch class and
its cent deviation, the resulting frequency in Hz, and the interval size in
cents from 1/1.

### Reference and tuning
- Define **1/1** by diatonic note, accidental, and octave.
- Set the **1/1 frequency** directly, or work relative to **A4** with a linked
  or free tuning meter.
- Octave-reduce output, and toggle enharmonic equivalents where applicable.

### Playback
- **In-browser audio** with a continuous timbre morph across sine, triangle,
  sawtooth, and square waves, plus a live waveform display.
- **MPE MIDI output** for sending microtonal pitches to external instruments via
  per-note pitch bend.

### Export
- **Save / Export CSV:** `⇧⌘S` 

### Display
- Light and dark themes.

---

## Notation systems & credits

This tool renders pitches using several notation systems designed by others.
Please refer to and support the original sources:

- **[The Helmholtz-Ellis JI Pitch Notation (HEJI)](https://heji.plainsound.org/)**
  — Marc Sabat & Thomas Nicholson, in collaboration with Wolfgang von
  Schweinitz, Catherine Lamb, and M.O. Abbott, building upon the original HEJI
  devised by Marc Sabat and Wolfgang von Schweinitz.

- **[Unofficial 89-limit HEJI Extensions](https://en.xen.wiki/w/Richie%27s_HEJI_extensions)**
  — Richie Greene.

- **[Ups and Downs Notation](https://en.xen.wiki/w/Kite%27s_ups_and_downs_notation)**
  — Kite Giedraitis.

- **[Sagittal](https://www.sagittal.org/)** — Dave Keenan, George Secor, and
  Douglas Blumeyer, with significant contributions from numerous others.

- **[Johnston Notation](https://www.sacredrealism.org/artists/catherine-lamb/the-interaction-of-tone/articles/Fonville%2C%20John%20-%20Ben%20Johnston%27s%20Extended%20Just%20Intonation%2C%20A%20Guide%20for%20Interpreters.pdf)**
  — Ben Johnston (implementation guided by John Fonville's *Ben Johnston's
  Extended Just Intonation: A Guide for Interpreters*).

---

## License

Released under the [MIT License](LICENSE). The notation systems, fonts, and
accidental designs referenced above remain the work of their respective
authors; see each source for its own terms.