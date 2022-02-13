import $ from "jquery";

import { AudioEngineWeb } from "./audio";
import { CanvasRenderer } from "./render";

import { NOTES } from "./constants";

const test_mode =
  window.location.hash &&
  window.location.hash.match(/^(?:#.+)*#test(?:#.+)*$/i);

export class PianoKey {
  constructor(note, octave) {
    this.note = note + octave;
    this.baseNote = note;
    this.octave = octave;
    this.sharp = note.indexOf("s") != -1;
    this.loaded = false;
    this.timeLoaded = 0;
    this.domElement = null;
    this.timePlayed = 0;
    this.blips = [];
  }
}

export class Piano {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.keys = {};

    let white_spatial = 0;
    let black_spatial = 0;
    let black_it = 0;
    let black_lut = [2, 1, 2, 1, 1];

    let addKey = (note, octave) => {
      let key = new PianoKey(note, octave);
      this.keys[key.note] = key;
      if (key.sharp) {
        key.spatial = black_spatial;
        black_spatial += black_lut[black_it % 5];
        ++black_it;
      } else {
        key.spatial = white_spatial;
        ++white_spatial;
      }
    };

    if (test_mode) {
      addKey("c", 2);
    } else {
      addKey("a", -1);
      addKey("as", -1);
      addKey("b", -1);

      for (let oct = 0; oct < 7; oct++) {
        for (let note of NOTES) {
          addKey(note, oct);
        }
      }
      addKey("c", 7);
    }

    this.renderer = new CanvasRenderer().init(this);

    window.addEventListener("resize", () => {
      this.renderer.resize();
    });

    // This fixes a warning from Chromium. What the hell?
    window.AudioContext =
      window.AudioContext || window.webkitAudioContext || undefined;

    this.audio = new AudioEngineWeb().init();
    this.midiOutTest = null;
  }

  play(note, vol, participant, delay_ms, lyric) {
    if (!this.keys.hasOwnProperty(note) || !participant) return;
    let key = this.keys[note];
    if (key.loaded) this.audio.play(key.note, vol, delay_ms, participant.id);
    if (this.midiOutTest)
      this.midiOutTest(key.note, vol * 100, delay_ms, participant.id);

    setTimeout(() => {
      this.renderer.visualize(key, participant.color);
      if (lyric) {
      }
      var jq_namediv = $(participant.nameDiv);
      jq_namediv.addClass("play");
      setTimeout(() => {
        jq_namediv.removeClass("play");
      }, 30);
    }, delay_ms || 0);
  }

  stop(note, participant, delay_ms) {
    if (!this.keys.hasOwnProperty(note)) return;
    let key = this.keys[note];
    if (key.loaded) this.audio.stop(key.note, delay_ms, participant.id);
    if (this.midiOutTest)
      this.midiOutTest(key.note, 0, delay_ms, participant.id);
  }
}
