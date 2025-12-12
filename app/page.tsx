"use client";

import { useState, useEffect } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import ProfileCreator from './components/ProfileCreator';
import dynamic from 'next/dynamic';

// Dynamically import SpaceLounge to avoid SSR issues with Three.js
const SpaceLounge = dynamic(() => import('./components/SpaceLounge'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Loading GiDiSpace...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  const { profile, loadProfile, isLoading } = useLobbyStore();
  const [showSpace, setShowSpace] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadProfile();
      setInitialized(true);
    };
    init();
  }, [loadProfile]);

  // Show loading while initializing
  if (!initialized || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Connecting to GiDiSpace...</p>
        </div>
      </div>
    );
  }

  // Show the 3D space if user has entered
  if (showSpace && profile) {
    return <SpaceLounge />;
  }

  // Show profile creator or welcome screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      {/* Background stars effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-50"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animation: 'pulse 3s infinite'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            GiDiSpace
          </h1>
          <p className="text-gray-400">Your Digital Twin Awaits</p>
        </div>

        {/* Profile Creator */}
        <ProfileCreator onComplete={() => setShowSpace(true)} />
      </div>
    </div>
  );
}
