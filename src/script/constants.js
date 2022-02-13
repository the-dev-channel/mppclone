import { Note } from "./util";

export const NOTES = [
  "c",
  "cs",
  "d",
  "ds",
  "e",
  "f",
  "fs",
  "g",
  "gs",
  "a",
  "as",
  "b",
];

export const BASIC_PIANO_SCALES = {
  // ty https://www.pianoscales.org/
  // major keys
  "Highlight notes in C Major": ["C", "D", "E", "F", "G", "A", "B", "C"],
  "Highlight notes in D Major": ["D", "E", "G♭", "G", "A", "B", "D♭", "D"],
  "Highlight notes in E Major": ["E", "G♭", "A♭", "A", "B", "D♭", "E♭", "E"],
  "Highlight notes in F Major": ["F", "G", "A", "B♭", "C", "D", "E", "F"],
  "Highlight notes in G Major": ["G", "A", "B", "C", "D", "E", "G♭", "G"],
  "Highlight notes in A Major": ["A", "B", "D♭", "D", "E", "G♭", "A♭", "A"],
  "Highlight notes in B Major": ["B", "D♭", "E♭", "E", "G♭", "A♭", "B♭", "B"],
  "Highlight notes in C# / Db Major": [
    "D♭",
    "E♭",
    "F",
    "G♭",
    "A♭",
    "B♭",
    "C",
    "D♭",
  ],
  "Highlight notes in D# / Eb Major": [
    "E♭",
    "F",
    "G",
    "A♭",
    "B♭",
    "C",
    "D",
    "E♭",
  ],
  "Highlight notes in F# / Gb Major": [
    "G♭",
    "A♭",
    "B♭",
    "B",
    "D♭",
    "E♭",
    "F",
    "G♭",
  ],
  "Highlight notes in G# / Ab Major": [
    "A♭",
    "B♭",
    "C",
    "D♭",
    "E♭",
    "F",
    "G",
    "A♭",
  ],
  "Highlight notes in A# / Bb Major": [
    "B♭",
    "C",
    "D",
    "E♭",
    "F",
    "G",
    "A",
    "B♭",
  ],
  // natural minor keys
  "Highlight notes in A Minor": ["A", "B", "C", "D", "E", "F", "G", "A"],
  "Highlight notes in A# / Bb Minor": [
    "B♭",
    "C",
    "D♭",
    "E♭",
    "F",
    "G♭",
    "A♭",
    "B♭",
  ],
  "Highlight notes in B Minor": ["B", "D♭", "D", "E", "G♭", "G", "A", "B"],
  "Highlight notes in C Minor": ["C", "D", "E♭", "F", "G", "A♭", "B♭", "C"],
  "Highlight notes in C# / Db Minor": [
    "D♭",
    "E♭",
    "E",
    "G♭",
    "A♭",
    "A",
    "B",
    "D♭",
  ],
  "Highlight notes in D Minor": ["D", "E", "F", "G", "A", "B♭", "C", "D"],
  "Highlight notes in D# / Eb Minor": [
    "E♭",
    "F",
    "G♭",
    "A♭",
    "B♭",
    "B",
    "D♭",
    "E♭",
  ],
  "Highlight notes in E Minor": ["E", "G♭", "G", "A", "B", "C", "D", "E"],
  "Highlight notes in F Minor": ["F", "G", "A♭", "B♭", "C", "D♭", "E♭", "F"],
  "Highlight notes in F# / Gb Minor": [
    "G♭",
    "A♭",
    "A",
    "B",
    "D♭",
    "D",
    "E",
    "G♭",
  ],
  "Highlight notes in G Minor": ["G", "A", "B♭", "C", "D", "E♭", "F", "G"],
  "Highlight notes in G# / Ab Minor": [
    "A♭",
    "B♭",
    "B",
    "D♭",
    "E♭",
    "E",
    "G♭",
    "A♭",
  ],
};

export const DEFAULT_VELOCITY = 0.5;
export const TIMING_TARGET = 1000;

function n(a, b) {
  return { note: new Note(a, b), held: false };
}

export const MPP_LAYOUT = {
  65: n("gs"),
  90: n("a"),
  83: n("as"),
  88: n("b"),
  67: n("c", 1),
  70: n("cs", 1),
  86: n("d", 1),
  71: n("ds", 1),
  66: n("e", 1),
  78: n("f", 1),
  74: n("fs", 1),
  77: n("g", 1),
  75: n("gs", 1),
  188: n("a", 1),
  76: n("as", 1),
  190: n("b", 1),
  191: n("c", 2),
  222: n("cs", 2),

  49: n("gs", 1),
  81: n("a", 1),
  50: n("as", 1),
  87: n("b", 1),
  69: n("c", 2),
  52: n("cs", 2),
  82: n("d", 2),
  53: n("ds", 2),
  84: n("e", 2),
  89: n("f", 2),
  55: n("fs", 2),
  85: n("g", 2),
  56: n("gs", 2),
  73: n("a", 2),
  57: n("as", 2),
  79: n("b", 2),
  80: n("c", 3),
  189: n("cs", 3),
  173: n("cs", 3), // firefox why
  219: n("d", 3),
  187: n("ds", 3),
  61: n("ds", 3), // firefox why
  221: n("e", 3),
};

export const VP_LAYOUT = {
  112: n("c", -1),
  113: n("d", -1),
  114: n("e", -1),
  115: n("f", -1),
  116: n("g", -1),
  117: n("a", -1),
  118: n("b", -1),

  49: n("c"),
  50: n("d"),
  51: n("e"),
  52: n("f"),
  53: n("g"),
  54: n("a"),
  55: n("b"),
  56: n("c", 1),
  57: n("d", 1),
  48: n("e", 1),
  81: n("f", 1),
  87: n("g", 1),
  69: n("a", 1),
  82: n("b", 1),
  84: n("c", 2),
  89: n("d", 2),
  85: n("e", 2),
  73: n("f", 2),
  79: n("g", 2),
  80: n("a", 2),
  65: n("b", 2),
  83: n("c", 3),
  68: n("d", 3),
  70: n("e", 3),
  71: n("f", 3),
  72: n("g", 3),
  74: n("a", 3),
  75: n("b", 3),
  76: n("c", 4),
  90: n("d", 4),
  88: n("e", 4),
  67: n("f", 4),
  86: n("g", 4),
  66: n("a", 4),
  78: n("b", 4),
  77: n("c", 5),
};

export const MIDI_TRANSPOSE = -12;
export const MIDI_KEY_NAMES = ["a-1", "as-1", "b-1"];

for (var oct = 0; oct < 7; oct++) {
  for (var i in NOTES) {
    MIDI_KEY_NAMES.push(NOTES[i] + oct);
  }
}
MIDI_KEY_NAMES.push("c7");

export const URL_REGEX = new RegExp(
  // protocol identifier (optional)
  // short syntax // still required
  "(?:(?:(?:https?|ftp):)?\\/\\/)" +
    // user:pass BasicAuth (optional)
    "(?:\\S+(?::\\S*)?@)?" +
    "(?:" +
    // IP address exclusion
    // private & local networks
    "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
    "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
    "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
    // IP address dotted notation octets
    // excludes loopback network 0.0.0.0
    // excludes reserved space >= 224.0.0.0
    // excludes network & broadcast addresses
    // (first & last IP address of each class)
    "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
    "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
    "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
    "|" +
    // host & domain names, may end with dot
    // can be replaced by a shortest alternative
    // (?![-_])(?:[-\\w\\u00a1-\\uffff]{0,63}[^-_]\\.)+
    "(?:" +
    "(?:" +
    "[a-z0-9\\u00a1-\\uffff]" +
    "[a-z0-9\\u00a1-\\uffff_-]{0,62}" +
    ")?" +
    "[a-z0-9\\u00a1-\\uffff]\\." +
    ")+" +
    // TLD identifier name, may end with dot
    "(?:[a-z\\u00a1-\\uffff]{2,}\\.?)" +
    ")" +
    // port number (optional)
    "(?::\\d{2,5})?" +
    // resource path (optional)
    "(?:[/?#]\\S*)?",
  "i"
);
