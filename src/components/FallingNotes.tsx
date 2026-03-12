import React from 'react';
import { Song } from '../lib/songs';
import { ALL_NOTES, isBlackKey } from '../lib/pianoMapping';
import { clsx } from 'clsx';

interface FallingNotesProps {
  song: Song;
  currentTime: number;
  pixelsPerSecond?: number;
}

export const FallingNotes: React.FC<FallingNotesProps> = ({ song, currentTime, pixelsPerSecond = 200 }) => {
  // Only render notes that are currently visible
  // Let's say visible is from currentTime - 1s to currentTime + 4s
  const visibleNotes = song.notes.filter(n => 
    n.time + n.duration > currentTime - 1 && n.time < currentTime + 4
  );

  return (
    <div className="relative w-full max-w-4xl mx-auto h-[400px] bg-black/40 rounded-t-3xl overflow-hidden border-b-4 border-orange-500 backdrop-blur-sm shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="absolute bottom-0 left-0 right-0 h-full flex justify-center">
        <div className="relative flex h-full" style={{ width: '33rem' }}>
          {/* Render vertical lines for white keys */}
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 border-r border-white/5" style={{ left: `${(i + 1) * 3}rem` }} />
          ))}

          {/* Render notes */}
          {visibleNotes.map((note, idx) => {
            const isBlack = isBlackKey(note.note);
            let whiteKeyIndex = 0;
            for (let i = 0; i < ALL_NOTES.length; i++) {
              if (ALL_NOTES[i] === note.note) break;
              if (!isBlackKey(ALL_NOTES[i])) whiteKeyIndex++;
            }

            const leftPos = isBlack ? (whiteKeyIndex * 3 - 1) : (whiteKeyIndex * 3);
            const width = isBlack ? 2 : 3; // 2rem for black, 3rem for white
            
            const bottom = (note.time - currentTime) * pixelsPerSecond;
            const height = note.duration * pixelsPerSecond;

            return (
              <div
                key={`${idx}-${note.note}`}
                className={clsx(
                  "absolute rounded-md opacity-90",
                  isBlack 
                    ? "bg-gradient-to-t from-orange-500 to-orange-400 shadow-[0_0_15px_rgba(255,120,0,0.6)]" 
                    : "bg-gradient-to-t from-emerald-400 to-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.6)]"
                )}
                style={{
                  left: `${leftPos + 0.1}rem`,
                  width: `${width - 0.2}rem`,
                  bottom: `${bottom}px`,
                  height: `${height}px`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
