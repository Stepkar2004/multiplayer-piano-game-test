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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
