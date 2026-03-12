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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">Piano Battle</h1>
          <p className="text-gray-600 mb-8">Compete with friends on the virtual piano!</p>
          <button
            onClick={loginWithGoogle}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Piano Battle Lobby</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 font-medium">{auth.currentUser.displayName}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Create a Room</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Song</label>
              <select
                value={selectedSong}
                onChange={(e) => setSelectedSong(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {SONGS.map(song => (
                  <option key={song.id} value={song.id}>
                    {song.title} ({song.difficulty})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={createRoom}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
            >
              Create Room
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4">Available Rooms</h2>
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No rooms available. Create one to start playing!
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map(room => {
                  const song = SONGS.find(s => s.id === room.songId);
                  return (
                    <div key={room.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-300 transition">
                      <div>
                        <p className="font-bold text-gray-900">Room {room.id.slice(0, 4)}</p>
                        <p className="text-sm text-gray-500">{song?.title || 'Unknown Song'}</p>
                      </div>
                      <button
                        onClick={() => joinRoom(room.id)}
                        disabled={room.hostId === auth.currentUser?.uid}
                        className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold hover:bg-emerald-200 disabled:opacity-50 transition"
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
