import React, { useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { ALL_NOTES, KEY_TO_NOTE, NOTE_TO_KEY, isBlackKey } from '../lib/pianoMapping';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PianoProps {
  onNotePlay: (note: string) => void;
}

export const Piano: React.FC<PianoProps> = React.memo(({ onNotePlay }) => {
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
    <div className="relative flex justify-center w-full max-w-4xl mx-auto h-48 select-none bg-black/20 p-2 rounded-b-3xl backdrop-blur-md border border-t-0 border-white/10 shadow-2xl">
      <div className="relative flex" style={{ width: '33rem' }}>
        {ALL_NOTES.map((note) => {
          const isBlack = isBlackKey(note);
          const isActive = pressedKeys.has(note);
          const keyChar = NOTE_TO_KEY[note]?.toUpperCase();

          if (isBlack) {
            const leftPos = whiteKeyIndex * 3 - 1; // 3rem per white key, 1rem offset
            return (
              <div
                key={note}
                className={twMerge(
                  clsx(
                    "absolute top-0 w-8 h-28 rounded-b-lg border border-black/50 z-10 flex items-end justify-center pb-2 cursor-pointer transition-all duration-75 shadow-[inset_0_-5px_10px_rgba(255,255,255,0.1)]",
                    isActive ? "bg-orange-500 shadow-[0_0_20px_rgba(255,120,0,0.8)] translate-y-1" : "bg-gray-900 hover:bg-gray-800"
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
                  "relative w-12 h-full rounded-b-xl z-0 flex items-end justify-center pb-4 cursor-pointer transition-all duration-75 shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1)]",
                  isActive ? "bg-emerald-100 border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.8)] translate-y-1" : "bg-white border border-gray-300 hover:bg-gray-50"
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
