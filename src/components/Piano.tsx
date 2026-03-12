import React, { useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { ALL_NOTES, KEY_TO_NOTE, NOTE_TO_KEY, isBlackKey } from '../lib/pianoMapping';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PianoProps {
  onNotePlay: (note: string) => void;
  activeNotes: Set<string>;
}

export const Piano: React.FC<PianoProps> = React.memo(({ onNotePlay, activeNotes }) => {
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const s = new Tone.PolySynth(Tone.Synth).toDestination();
    setSynth(s);
    return () => {
      s.dispose();
    };
  }, []);

  const playNote = useCallback((note: string) => {
    if (!synth) return;
    if (Tone.context.state !== 'running') {
      Tone.start();
    }
    synth.triggerAttackRelease(note, '8n');
    onNotePlay(note);
  }, [synth, onNotePlay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      const note = KEY_TO_NOTE[key];
      if (note) {
        setPressedKeys(prev => new Set(prev).add(note));
        playNote(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const note = KEY_TO_NOTE[key];
      if (note) {
        setPressedKeys(prev => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playNote]);

  let whiteKeyIndex = 0;

  return (
    <div className="relative flex justify-center w-full max-w-4xl mx-auto h-48 select-none">
      <div className="relative flex" style={{ width: '33rem' }}>
        {ALL_NOTES.map((note) => {
          const isBlack = isBlackKey(note);
          const isActive = pressedKeys.has(note) || activeNotes.has(note);
          const keyChar = NOTE_TO_KEY[note]?.toUpperCase();

          if (isBlack) {
            const leftPos = whiteKeyIndex * 3 - 1; // 3rem per white key, 1rem offset
            return (
              <div
                key={note}
                className={twMerge(
                  clsx(
                    "absolute top-0 w-8 h-28 bg-black rounded-b-md border border-black z-10 flex items-end justify-center pb-2 cursor-pointer transition-colors",
                    isActive ? "bg-indigo-600" : "hover:bg-gray-800"
                  )
                )}
                style={{ left: `${leftPos}rem` }}
                onMouseDown={() => {
                  setPressedKeys(prev => new Set(prev).add(note));
                  playNote(note);
                }}
                onMouseUp={() => {
                  setPressedKeys(prev => {
                    const next = new Set(prev);
                    next.delete(note);
                    return next;
                  });
                }}
                onMouseLeave={() => {
                  setPressedKeys(prev => {
                    const next = new Set(prev);
                    next.delete(note);
                    return next;
                  });
                }}
              >
                <span className="text-white text-xs font-bold opacity-50">{keyChar}</span>
              </div>
            );
          }

          whiteKeyIndex++;
          return (
            <div
              key={note}
              className={twMerge(
                clsx(
                  "relative w-12 h-full bg-white border border-gray-300 rounded-b-md z-0 flex items-end justify-center pb-4 cursor-pointer transition-colors",
                  isActive ? "bg-indigo-100 border-indigo-300" : "hover:bg-gray-50"
                )
              )}
              onMouseDown={() => {
                setPressedKeys(prev => new Set(prev).add(note));
                playNote(note);
              }}
              onMouseUp={() => {
                setPressedKeys(prev => {
                  const next = new Set(prev);
                  next.delete(note);
                  return next;
                });
              }}
              onMouseLeave={() => {
                setPressedKeys(prev => {
                  const next = new Set(prev);
                  next.delete(note);
                  return next;
                });
              }}
            >
              <div className="flex flex-col items-center">
                <span className="text-gray-400 text-[10px] font-bold mb-1">{note}</span>
                <span className="text-gray-800 font-bold">{keyChar}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
