import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db, auth, loginWithGoogle, logout, handleFirestoreError, OperationType } from '../lib/firebase';
import { SONGS } from '../lib/songs';

export const Lobby: React.FC = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedSong, setSelectedSong] = useState(SONGS[0].id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(collection(db, 'rooms'), where('status', '==', 'waiting'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(newRooms);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rooms');
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const createRoom = async () => {
    if (!auth.currentUser) return;
    try {
      // Clean up any existing waiting rooms hosted by this user
      const existingRooms = rooms.filter(r => r.hostId === auth.currentUser?.uid && r.status === 'waiting');
      for (const r of existingRooms) {
        await updateDoc(doc(db, 'rooms', r.id), { status: 'abandoned' });
      }

      const roomRef = await addDoc(collection(db, 'rooms'), {
        hostId: auth.currentUser.uid,
        songId: selectedSong,
        status: 'waiting',
        hostScore: 0,
        guestScore: 0,
      });
      navigate(`/room/${roomRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    }
  };

  const playAlone = async () => {
    if (!auth.currentUser) return;
    try {
      const roomRef = await addDoc(collection(db, 'rooms'), {
        hostId: auth.currentUser.uid,
        songId: selectedSong,
        status: 'playing',
        hostScore: 0,
        guestScore: 0,
      });
      navigate(`/room/${roomRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        guestId: auth.currentUser.uid
      });
      navigate(`/room/${roomId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  if (!auth.currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="atmosphere"></div>
        <div className="glass-panel p-10 rounded-3xl max-w-md w-full text-center relative z-10">
          <h1 className="text-5xl font-display font-bold text-white mb-4 tracking-tight">Piano Battle</h1>
          <p className="text-gray-300 mb-10 text-lg">Compete with friends on the virtual piano!</p>
          <button
            onClick={loginWithGoogle}
            className="w-full py-4 px-6 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-all transform hover:scale-105 shadow-lg"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      <div className="atmosphere"></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-display font-bold text-white tracking-tight">Piano Battle Lobby</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 font-medium">{auth.currentUser.displayName}</span>
            <button
              onClick={logout}
              className="px-5 py-2 glass-panel text-white rounded-full hover:bg-white/10 transition font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="glass-panel p-8 rounded-3xl">
            <h2 className="text-2xl font-display font-bold mb-6 text-white">Create a Room</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Select Song</label>
              <select
                value={selectedSong}
                onChange={(e) => setSelectedSong(e.target.value)}
                className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none"
              >
                {SONGS.map(song => (
                  <option key={song.id} value={song.id} className="bg-gray-900">
                    {song.title} ({song.difficulty})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <button
                onClick={createRoom}
                className="flex-1 py-4 px-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-200 transition-all transform hover:-translate-y-1 shadow-lg"
              >
                Create Room
              </button>
              <button
                onClick={playAlone}
                className="flex-1 py-4 px-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-500 transition-all transform hover:-translate-y-1 shadow-lg"
              >
                Play Alone
              </button>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-3xl">
            <h2 className="text-2xl font-display font-bold mb-6 text-white">Available Rooms</h2>
            {rooms.length === 0 ? (
              <div className="text-center py-12 text-gray-400 italic">
                No rooms available. Create one to start playing!
              </div>
            ) : (
              <div className="space-y-4">
                {rooms.map(room => {
                  const song = SONGS.find(s => s.id === room.songId);
                  return (
                    <div key={room.id} className="flex items-center justify-between p-5 bg-black/20 border border-white/5 rounded-2xl hover:border-orange-500/50 transition-all group">
                      <div>
                        <p className="font-bold text-white text-lg">Room {room.id.slice(0, 4)}</p>
                        <p className="text-sm text-gray-400">{song?.title || 'Unknown Song'}</p>
                      </div>
                      <button
                        onClick={() => joinRoom(room.id)}
                        disabled={room.hostId === auth.currentUser?.uid}
                        className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 disabled:opacity-30 transition-all group-hover:bg-orange-600 group-hover:text-white"
                      >
                        {room.hostId === auth.currentUser?.uid ? 'Your Room' : 'Join'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
