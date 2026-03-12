export const KEY_TO_NOTE: Record<string, string> = {
  'a': 'C4',
  'w': 'C#4',
  's': 'D4',
  'e': 'D#4',
  'd': 'E4',
  'f': 'F4',
  't': 'F#4',
  'g': 'G4',
  'y': 'G#4',
  'h': 'A4',
  'u': 'A#4',
  'j': 'B4',
  'k': 'C5',
  'o': 'C#5',
  'l': 'D5',
  'p': 'D#5',
  ';': 'E5',
  '\'': 'F5',
};

export const NOTE_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_NOTE).map(([k, v]) => [v, k])
);

export const ALL_NOTES = [
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5'
];

export const isBlackKey = (note: string) => note.includes('#');
