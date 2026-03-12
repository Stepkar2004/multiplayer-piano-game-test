import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { getSong, Song } from '../lib/songs';
import { Piano } from './Piano';
import { FallingNotes } from './FallingNotes';

export const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const hitNotesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRoom(data);
        setSong(getSong(data.songId));
        
        const isHost = data.hostId === auth.currentUser?.uid;
        setOpponentScore(isHost ? data.guestScore : data.hostScore);
      } else {
        navigate('/');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${roomId}`);
    });
    return () => unsubscribe();
  }, [roomId, navigate]);

  const startGame = async () => {
    if (!roomId || !room) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'playing'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const updateScore = async (newScore: number) => {
    if (!roomId || !room) return;
    const isHost = room.hostId === auth.currentUser?.uid;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        [isHost ? 'hostScore' : 'guestScore']: newScore
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  const currentTimeRef = useRef(0);
  const localStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (room?.status === 'playing') {
      if (!localStartTimeRef.current) {
        const firstNoteTime = song?.notes[0]?.time || 0;
        const startCurrentTime = firstNoteTime - 5;
        localStartTimeRef.current = Date.now() - startCurrentTime * 1000;
      }
      
      const updateTime = () => {
        if (!localStartTimeRef.current) return;
        const now = Date.now();
        const elapsed = (now - localStartTimeRef.current) / 1000;
        setCurrentTime(elapsed);
        currentTimeRef.current = elapsed;
        
        if (song) {
          if (elapsed > song.notes[song.notes.length - 1].time + 2) {
            // Game over
            if (room.hostId === auth.currentUser?.uid) {
              updateDoc(doc(db, 'rooms', roomId!), { status: 'finished' });
            }
            return;
          }
        }
        
        requestRef.current = requestAnimationFrame(updateTime);
      };
      requestRef.current = requestAnimationFrame(updateTime);
    } else {
      localStartTimeRef.current = null;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [room?.status, song, roomId]);

  const handleNotePlay = useCallback((note: string) => {
    if (room?.status !== 'playing' || !song) return;
    
    // Find if this note matches any in the song within a 0.3s window
    const hitWindow = 0.3;
    const noteIndex = song.notes.findIndex((n, idx) => {
      if (hitNotesRef.current.has(idx)) return false;
      if (n.note !== note) return false;
      return Math.abs(n.time - currentTimeRef.current) <= hitWindow;
    });

    if (noteIndex !== -1) {
      hitNotesRef.current.add(noteIndex);
      setScore(prev => {
        const newScore = prev + 10;
        // Throttle score updates to Firebase
        if (newScore % 50 === 0 || newScore === 10) {
          updateScore(newScore);
        }
        return newScore;
      });
    }
  }, [room?.status, song]);

  if (!room || !song) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        <div className="atmosphere"></div>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 z-10"></div>
      </div>
    );
  }

  const isHost = room.hostId === auth.currentUser?.uid;

  const leaveRoom = async () => {
    if (!roomId || !room) return;
    try {
      if (isHost) {
        // We need to import deleteDoc from firebase/firestore
        // Wait, I will add it to the imports
        await updateDoc(doc(db, 'rooms', roomId), { status: 'abandoned' });
      } else {
        await updateDoc(doc(db, 'rooms', roomId), {
          guestId: deleteField()
        });
      }
      navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  if (room.status === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="atmosphere"></div>
        <div className="glass-panel p-10 rounded-3xl max-w-md w-full text-center relative z-10">
          <h2 className="text-3xl font-display font-bold mb-2 text-white">Room: {roomId.slice(0, 6)}</h2>
          <p className="text-gray-400 mb-8">Song: <span className="text-white font-medium">{song.title}</span></p>
          
          <div className="flex justify-between items-center mb-10 p-6 bg-black/30 rounded-2xl border border-white/5">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center mb-3 border border-orange-500/50 shadow-[0_0_15px_rgba(255,78,0,0.3)]">
                <span className="text-orange-500 font-bold">P1</span>
              </div>
              <span className="text-sm font-medium text-gray-300">Host</span>
            </div>
            <div className="text-2xl font-display font-bold text-gray-600 italic">VS</div>
            <div className="flex flex-col items-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-500 ${room.guestId ? 'bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-2 border-dashed border-white/20'}`}>
                <span className={room.guestId ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
                  {room.guestId ? 'P2' : '?'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-300">{room.guestId ? 'Guest' : 'Waiting...'}</span>
            </div>
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={!room.guestId}
              className="w-full py-4 px-6 bg-orange-600 text-white rounded-full font-bold hover:bg-orange-500 disabled:opacity-30 disabled:hover:bg-orange-600 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,78,0,0.4)] mb-4"
            >
              {room.guestId ? 'Start Game' : 'Waiting for opponent...'}
            </button>
          ) : (
            <div className="text-orange-400 font-medium mb-6 animate-pulse">Waiting for host to start...</div>
          )}
          
          <button
            onClick={leaveRoom}
            className="w-full py-4 px-6 bg-white/10 text-white rounded-full font-bold hover:bg-white/20 transition-all"
          >
            Leave Room
          </button>
        </div>
      </div>
    );
  }

  if (room.status === 'abandoned') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="atmosphere"></div>
        <div className="glass-panel p-10 rounded-3xl max-w-md w-full text-center relative z-10">
          <h2 className="text-4xl font-display font-bold text-red-500 mb-4">Room Closed</h2>
          <p className="text-gray-300 mb-10">The host has left the room.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 px-6 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-all transform hover:scale-105"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (room.status === 'finished') {
    const myScore = isHost ? room.hostScore : room.guestScore;
    const theirScore = isHost ? room.guestScore : room.hostScore;
    const isSolo = !room.guestId;
    const won = myScore > theirScore;
    const tie = myScore === theirScore;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="atmosphere"></div>
        <div className="glass-panel p-10 rounded-3xl max-w-md w-full text-center relative z-10">
          <h2 className={`text-5xl font-display font-bold mb-8 ${isSolo ? 'text-white' : tie ? 'text-yellow-400' : won ? 'text-emerald-400' : 'text-red-400'}`}>
            {isSolo ? 'Game Over!' : tie ? 'Tie!' : won ? 'You Won!' : 'You Lost!'}
          </h2>
          <div className="flex justify-around mb-10 p-6 bg-black/30 rounded-2xl border border-white/5">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Your Score</p>
              <p className="text-4xl font-display font-bold text-white">{myScore}</p>
            </div>
            {!isSolo && (
              <div>
                <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Opponent</p>
                <p className="text-4xl font-display font-bold text-gray-500">{theirScore}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 px-6 bg-orange-600 text-white rounded-full font-bold hover:bg-orange-500 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(255,78,0,0.4)]"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="atmosphere"></div>
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 text-white relative z-10">
        <div className="flex flex-col glass-panel px-6 py-3 rounded-2xl">
          <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Your Score</span>
          <span className="text-3xl font-display font-bold text-orange-400">{score}</span>
        </div>
        <div className="text-center glass-panel px-8 py-3 rounded-2xl">
          <h2 className="text-2xl font-display font-bold text-white tracking-wide">{song.title}</h2>
          {currentTime < (song.notes[0]?.time || 0) - 2 && (
            <p className="text-orange-400 font-bold text-xl mt-1 animate-pulse">Starts in {Math.ceil((song.notes[0]?.time || 0) - 2 - currentTime)}s</p>
          )}
        </div>
        <div className="flex flex-col text-right glass-panel px-6 py-3 rounded-2xl">
          {room.guestId ? (
            <>
              <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Opponent</span>
              <span className="text-3xl font-display font-bold text-emerald-400">{opponentScore}</span>
            </>
          ) : (
            <>
              <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Mode</span>
              <span className="text-3xl font-display font-bold text-emerald-400">Solo</span>
            </>
          )}
        </div>
      </div>
      
      <div className="w-full max-w-4xl flex justify-end mb-6 relative z-10">
        <button
          onClick={leaveRoom}
          className="px-5 py-2 bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 border border-red-500/30 transition-all text-sm font-bold tracking-wider uppercase"
        >
          Leave Game
        </button>
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        <FallingNotes song={song} currentTime={currentTime} />
        <Piano onNotePlay={handleNotePlay} />
      </div>
    </div>
  );
};
