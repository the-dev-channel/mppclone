import $ from "jquery";

export default class SoundSelector {
  constructor(piano) {
    this.initialized = false;
    this.keys = piano.keys;
    this.loading = {};
    this.notification;
    this.packs = [];
    this.piano = piano;
    this.soundSelection = localStorage.soundSelection
      ? localStorage.soundSelection
      : "mppclassic";
    this.addPack({
      name: "MPP Classic",
      keys: Object.keys(this.piano.keys),
      ext: ".mp3",
      url: "/sounds/mppclassic/",
    });
  }

  _add(obj, load) {
    let added = false;
    for (let pack of this.packs) {
      if (obj.name == pack.name) {
        added = true;
        break;
      }
    }

    if (added) return console.warn("Sounds already added!!"); //no adding soundpacks twice D:<

    if (obj.url.substr(obj.url.length - 1) != "/") obj.url = obj.url + "/";
    let html = document.createElement("li");
    html.classList = "pack";
    html.innerText = obj.name + " (" + obj.keys.length + " keys)";
    html.onclick = () => {
      this.loadPack(obj.name);
      this.notification.close();
    };
    obj.html = html;
    this.packs.push(obj);
    this.packs.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    if (load) this.loadPack(obj.name);
    delete this.loading[obj.url];
  }

  addPack(pack, load) {
    this.loading[pack.url || pack] = true;

    if (typeof pack == "string") {
      $.getJSON(pack + "/info.json").done((json) => {
        json.url = pack;
        this._add(json, load);
      });
    } else this._add(pack, load); //validate packs??
  }

  addPacks(packs) {
    for (let pack of packs) this.addPack(pack);
  }

  init() {
    if (this.initialized)
      return console.warn("Sound selector already initialized!");

    if (!!Object.keys(this.loading).length)
      return setTimeout(() => {
        this.init();
      }, 250);

    $("#sound-btn").on("click", () => {
      if (document.getElementById("Notification-Sound-Selector") != null)
        return this.notification.close();
      let html = document.createElement("ul");
      //$(html).append("<p>Current Sound: " + this.soundSelection + "</p>");
      for (let pack of this.packs) {
        if (pack.name == this.soundSelection)
          pack.html.classList = "pack enabled";
        else pack.html.classList = "pack";
        html.appendChild(pack.html);
      }

      this.notification = new Notification({
        title: "Sound Selector",
        html: html,
        id: "Sound-Selector",
        duration: -1,
        target: "#sound-btn",
      });
    });

    this.initialized = true;
    this.loadPack(this.soundSelection, true);
  }

  loadPack(name, f) {
    let pack;

    for (let p of this.packs) {
      if (p.name == name) {
        pack = p;
        break;
      }
    }

    if (!pack) {
      console.warn("Sound pack does not exist! Loading default pack...");
      return this.loadPack("MPP Classic");
    }

    if (pack.name == this.soundSelection && !f) return;
    if (pack.keys.length != Object.keys(this.piano.keys).length) {
      this.piano.keys = {};
      for (let key of pack.keys) this.piano.keys[key] = this.keys[key];
      this.piano.renderer.resize();
    }

    for (let key of Object.values(this.piano.keys)) {
      key.loaded = false;
      this.piano.audio.load(key.note, pack.url + key.note + pack.ext, () => {
        key.loaded = true;
        key.timeLoaded = Date.now();
      });
    }
    if (localStorage) localStorage.soundSelection = pack.name;
    this.soundSelection = pack.name;
  }

  removePack(name) {
    let found = false;
    for (let pack of this.packs) {
      if (pack.name == name) {
        this.packs.splice(i, 1);
        if (pack.name == this.soundSelection) this.loadPack(this.packs[0].name); //add mpp default if none?
        break;
      }
    }
    if (!found) console.warn("Sound pack not found!");
  }
}
