import { MIDI_KEY_NAMES, MIDI_TRANSPOSE } from "./constants";

class SynthVoice {
  constructor(note_name, time, synth) {
    let note_number = MIDI_KEY_NAMES.indexOf(note_name);
    note_number = note_number + 9 - MIDI_TRANSPOSE;
    let freq = Math.pow(2, (note_number - 69) / 12) * 440.0;

    this.synth = synth;

    this.osc = synth.context.createOscillator();
    this.osc.type = synth.osc1.type;
    this.osc.frequency.value = freq;

    this.gain = synth.context.createGain();
    this.gain.gain.value = 0;
    this.osc.connect(this.gain);
    this.gain.connect(synth.gain);

    this.osc.start(time);
    this.gain.gain.setValueAtTime(0, time);
    this.gain.gain.linearRampToValueAtTime(1, time + synth.osc1.attack);
    this.gain.gain.linearRampToValueAtTime(
      synth.osc1.sustain,
      time + synth.osc1.attack + synth.osc1.decay
    );
  }

  stop(time) {
    //this.gain.gain.setValueAtTime(osc1_sustain, time);
    this.gain.gain.linearRampToValueAtTime(0, time + this.synth.osc1.release);
    this.osc.stop(time + this.synth.osc1.release);
  }
}

class Synth {
  constructor(engine) {
    this.engine = engine;
    this.context = engine.context;
    this.enable = false;

    this.gain = this.context.createGain();
    this.gain.gain.value = 0.05;
    this.gain.connect(engine.synthGain);

    this.osc1 = {
      type: "square",
      attack: 0,
      decay: 0.2,
      sustain: 0.5,
      release: 2.0,
    };
  }
}

export class AudioEngine {
  init(cb) {
    this.volume = 0.6;
    this.sounds = {};
    this.paused = true;
    return this;
  }
  load(id, url, cb) {}
  play() {}
  stop() {}
  setVolume(vol) {
    this.volume = vol;
  }
  resume() {
    this.paused = false;
  }
}

export class AudioEngineWeb extends AudioEngine {
  constructor() {
    super();

    this.threshold = 0;
    this.worker = new Worker(new URL("./workerTimer.js", import.meta.url));

    this.worker.onmessage = (event) => {
      if (event.data.args)
        if (event.data.args.action == 0) {
          this.actualPlay(
            event.data.args.id,
            event.data.args.vol,
            event.data.args.time,
            event.data.args.part_id
          );
        } else {
          this.actualStop(
            event.data.args.id,
            event.data.args.time,
            event.data.args.part_id
          );
        }
    };
  }

  init(cb) {
    super.init(cb);

    this.context = new AudioContext({ latencyHint: "interactive" });

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = this.volume;

    this.limiterNode = this.context.createDynamicsCompressor();
    this.limiterNode.threshold.value = -10;
    this.limiterNode.knee.value = 0;
    this.limiterNode.ratio.value = 20;
    this.limiterNode.attack.value = 0;
    this.limiterNode.release.value = 0.1;
    this.limiterNode.connect(this.masterGain);

    // for synth mix
    this.pianoGain = this.context.createGain();
    this.pianoGain.gain.value = 0.5;
    this.pianoGain.connect(this.limiterNode);
    this.synthGain = this.context.createGain();
    this.synthGain.gain.value = 0.5;
    this.synthGain.connect(this.limiterNode);

    this.playings = {};

    this.synth = new Synth(this);

    if (cb) setTimeout(cb, 0);
    return this;
  }

  load(id, url, cb) {
    const req = new XMLHttpRequest();
    req.open("GET", url);
    req.responseType = "arraybuffer";
    req.addEventListener("readystatechange", (evt) => {
      if (req.readyState !== 4) return;
      try {
        this.context.decodeAudioData(req.response, (buffer) => {
          this.sounds[id] = buffer;
          if (cb) cb();
        });
      } catch (e) {
        /*throw new Error(e.message
            + " / id: " + id
            + " / url: " + url
            + " / status: " + req.status
            + " / ArrayBuffer: " + (req.response instanceof ArrayBuffer)
            + " / byteLength: " + (req.response && req.response.byteLength ? req.response.byteLength : "undefined"));*/
        new Notification({
          id: "audio-download-error",
          title: "Problem",
          text:
            "For some reason, an audio download failed with a status of " +
            req.status +
            ". ",
          target: "#piano",
          duration: 10000,
        });
      }
    });
    req.send();
  }

  actualPlay(id, vol, time, part_id) {
    if (this.paused) return;
    if (!this.sounds.hasOwnProperty(id)) return;
    let source = this.context.createBufferSource();
    source.buffer = this.sounds[id];
    let gain = this.context.createGain();
    gain.gain.value = vol;
    source.connect(gain);
    gain.connect(this.pianoGain);
    source.start(time);
    // Patch from ste-art remedies stuttering under heavy load
    if (this.playings[id]) {
      let playing = this.playings[id];
      playing.gain.gain.setValueAtTime(playing.gain.gain.value, time);
      playing.gain.gain.linearRampToValueAtTime(0.0, time + 0.2);
      playing.source.stop(time + 0.21);
      if (this.synth.enable && playing.voice) {
        playing.voice.stop(time);
      }
    }
    this.playings[id] = { source, gain, part_id };

    if (this.synth.enable) {
      this.playings[id].voice = new SynthVoice(id, time, this.synth);
    }
  }

  play(id, vol, delay_ms, part_id) {
    if (!this.sounds.hasOwnProperty(id)) return;
    let time = this.context.currentTime + delay_ms / 1000; //calculate time on note receive.
    let delay = delay_ms - this.threshold;
    if (delay <= 0) this.actualPlay(id, vol, time, part_id);
    else {
      this.worker.postMessage({
        delay: delay,
        args: {
          action: 0 /*play*/,
          id: id,
          vol: vol,
          time: time,
          part_id: part_id,
        },
      }); // but start scheduling right before play.
    }
  }

  actualStop(id, time, part_id) {
    if (
      this.playings.hasOwnProperty(id) &&
      this.playings[id] &&
      this.playings[id].part_id === part_id
    ) {
      let gain = this.playings[id].gain.gain;
      gain.setValueAtTime(gain.value, time);
      gain.linearRampToValueAtTime(gain.value * 0.1, time + 0.16);
      gain.linearRampToValueAtTime(0.0, time + 0.4);
      this.playings[id].source.stop(time + 0.41);

      if (this.playings[id].voice) {
        this.playings[id].voice.stop(time);
      }

      this.playings[id] = null;
    }
  }

  stop(id, delay_ms, part_id) {
    let time = this.context.currentTime + delay_ms / 1000;
    let delay = delay_ms - this.threshold;
    if (delay <= 0) this.actualStop(id, time, part_id);
    else {
      this.worker.postMessage({
        delay: delay,
        args: { action: 1 /*stop*/, id: id, time: time, part_id: part_id },
      });
    }
  }

  setVolume(vol) {
    super.setVolume(vol);
    this.masterGain.gain.value = this.volume;
  }

  resume() {
    this.paused = false;
    this.context.resume();
  }
}
