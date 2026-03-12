import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
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
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
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
        status: 'playing',
        startTime: Date.now() + 3000 // Start in 3 seconds
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

  useEffect(() => {
    if (room?.status === 'playing' && room.startTime) {
      const updateTime = () => {
        const now = Date.now();
        const elapsed = (now - room.startTime) / 1000;
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
          
          // Update active notes for visual feedback
          const newActiveNotes = new Set<string>();
          song.notes.forEach(n => {
            if (elapsed >= n.time && elapsed <= n.time + n.duration) {
              newActiveNotes.add(n.note);
            }
          });
          
          setActiveNotes(prev => {
            if (prev.size !== newActiveNotes.size) return newActiveNotes;
            for (let item of newActiveNotes) {
              if (!prev.has(item)) return newActiveNotes;
            }
            return prev;
          });
        }
        
        requestRef.current = requestAnimationFrame(updateTime);
      };
      requestRef.current = requestAnimationFrame(updateTime);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [room?.status, room?.startTime, song, roomId]);

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

  if (!room || !song) return <div className="p-8 text-center">Loading...</div>;

  const isHost = room.hostId === auth.currentUser?.uid;

  if (room.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h2 className="text-3xl font-bold mb-2">Room: {roomId.slice(0, 6)}</h2>
          <p className="text-gray-600 mb-6">Song: {song.title}</p>
          
          <div className="flex justify-between items-center mb-8 p-4 bg-gray-100 rounded-lg">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-indigo-600 font-bold">P1</span>
              </div>
              <span className="text-sm font-medium">Host</span>
            </div>
            <div className="text-xl font-bold text-gray-400">VS</div>
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${room.guestId ? 'bg-emerald-100' : 'bg-gray-200 border-2 border-dashed border-gray-400'}`}>
                <span className={room.guestId ? 'text-emerald-600 font-bold' : 'text-gray-400'}>
                  {room.guestId ? 'P2' : '?'}
                </span>
              </div>
              <span className="text-sm font-medium">{room.guestId ? 'Guest' : 'Waiting...'}</span>
            </div>
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={!room.guestId}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {room.guestId ? 'Start Game' : 'Waiting for opponent...'}
            </button>
          ) : (
            <div className="text-gray-600 font-medium">Waiting for host to start...</div>
          )}
        </div>
      </div>
    );
  }

  if (room.status === 'finished') {
    const myScore = isHost ? room.hostScore : room.guestScore;
    const theirScore = isHost ? room.guestScore : room.hostScore;
    const won = myScore > theirScore;
    const tie = myScore === theirScore;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h2 className="text-4xl font-bold mb-4">
            {tie ? 'Tie!' : won ? 'You Won!' : 'You Lost!'}
          </h2>
          <div className="flex justify-around mb-8">
            <div>
              <p className="text-sm text-gray-500">Your Score</p>
              <p className="text-3xl font-bold text-indigo-600">{myScore}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Opponent</p>
              <p className="text-3xl font-bold text-gray-800">{theirScore}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-white">
        <div className="flex flex-col">
          <span className="text-sm text-gray-400">Your Score</span>
          <span className="text-2xl font-bold text-indigo-400">{score}</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">{song.title}</h2>
          {currentTime < 0 && (
            <p className="text-red-400 font-bold text-lg">Starts in {Math.ceil(Math.abs(currentTime))}s</p>
          )}
        </div>
        <div className="flex flex-col text-right">
          <span className="text-sm text-gray-400">Opponent</span>
          <span className="text-2xl font-bold text-emerald-400">{opponentScore}</span>
        </div>
      </div>

      <FallingNotes song={song} currentTime={currentTime} />
      <Piano onNotePlay={handleNotePlay} activeNotes={activeNotes} />
    </div>
  );
};
