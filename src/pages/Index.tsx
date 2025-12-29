
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import GameContainer from '@/components/game/GameContainer';
import { GameProvider } from '@/components/game/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/auth/LoginForm';
import { RegisterForm } from '@/auth/RegisterForm';

const Index = () => {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [searchParams] = useSearchParams();
  const loadSlot = searchParams.get('load');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
        {showRegister ? (
          <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <LoginForm onSwitchToRegister={() => setShowRegister(true)} />
        )}
      </div>
    );
  }

  return (
    <GameProvider initialLoadSlot={loadSlot || undefined}>
      <div className="flex items-center justify-center min-h-screen bg-mystic-900 p-4">
        <GameContainer />
      </div>
    </GameProvider>
  );
};

export default Index;
