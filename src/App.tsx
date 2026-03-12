/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        <div className="atmosphere"></div>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 z-10"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:roomId" element={
            user ? <GameRoom /> : <Navigate to="/" />
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
