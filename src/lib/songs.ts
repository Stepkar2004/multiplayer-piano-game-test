export interface SongNote {
  note: string;
  time: number;
  duration: number;
}

export interface Song {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  notes: SongNote[];
}

const createSong = (id: string, title: string, difficulty: 'Easy' | 'Medium' | 'Hard', noteSequence: string, duration: number = 0.5): Song => {
  const notes: SongNote[] = [];
  let time = 0;
  
  const tokens = noteSequence.split(' ');
  for (const token of tokens) {
    if (token === '-') {
      time += duration;
    } else {
      notes.push({ note: token, time, duration });
      time += duration;
    }
  }
  
  return { id, title, difficulty, notes };
};

export const SONGS: Song[] = [
  createSong('1', 'Twinkle Twinkle', 'Easy', 'C4 C4 G4 G4 A4 A4 G4 - F4 F4 E4 E4 D4 D4 C4 -'),
  createSong('2', 'Ode to Joy', 'Medium', 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4 -'),
  createSong('3', 'Mary Had a Little Lamb', 'Easy', 'E4 D4 C4 D4 E4 E4 E4 - D4 D4 D4 - E4 G4 G4 -'),
  createSong('4', 'Jingle Bells', 'Easy', 'E4 E4 E4 - E4 E4 E4 - E4 G4 C4 D4 E4 - - -'),
  createSong('5', 'Happy Birthday', 'Medium', 'C4 C4 D4 C4 F4 E4 - C4 C4 D4 C4 G4 F4 -'),
  createSong('6', 'Row Your Boat', 'Easy', 'C4 C4 C4 D4 E4 - E4 D4 E4 F4 G4 - - -'),
  createSong('7', 'Fur Elise', 'Hard', 'E5 D#5 E5 D#5 E5 B4 D5 C5 A4 - - - C4 E4 A4 B4 - - - E4 G#4 B4 C5 - - -'),
  createSong('8', 'London Bridge', 'Easy', 'G4 A4 G4 F4 E4 F4 G4 - D4 E4 F4 - E4 F4 G4 -'),
  createSong('9', 'Chopsticks', 'Medium', 'F4 G4 F4 G4 F4 G4 F4 G4 F4 G4 F4 G4 E4 G4 E4 G4 E4 G4 E4 G4'),
  createSong('10', 'Heart and Soul', 'Medium', 'C4 C4 C4 - C4 B4 A4 B4 C4 D4 E4 E4 E4 - E4 D4 C4 D4 E4 F4 G4'),
];

export const getSong = (id: string) => SONGS.find(s => s.id === id) || SONGS[0];
