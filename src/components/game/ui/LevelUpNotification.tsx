import React, { useEffect, useState } from 'react';
import { useGame } from '../GameContext';

const LevelUpNotification: React.FC = () => {
  const { gameState } = useGame();
  const { player, uiState } = gameState;
  const [visible, setVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  
  useEffect(() => {
    if (uiState.showLevelUp) {
      setAnimationKey(prev => prev + 1);
      setVisible(true);
      
      // Hide after animation completes
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [uiState.showLevelUp]);
  
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="level-up-container" key={animationKey}>
        <div className="level-up-badge">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-500 mb-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="level-text">LEVEL UP!</div>
          <div className="new-level">Level {player.level}</div>
          <div className="level-description">You've become more powerful!</div>
        </div>
      </div>
      
      <style jsx>{`
        .level-up-container {
          animation: fadeInOut 3s ease-in-out forwards;
        }
        
        .level-up-badge {
          background: rgba(20, 20, 40, 0.9);
          border: 2px solid #ffd700;
          border-radius: 12px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
          transform: scale(0);
          animation: popIn 0.5s ease-out forwards;
        }
        
        .level-text {
          font-size: 2rem;
          font-weight: bold;
          color: #ffd700;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
        }
        
        .new-level {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
          margin-bottom: 0.5rem;
        }
        
        .level-description {
          color: #d1d5db;
          font-size: 1rem;
        }
        
        @keyframes fadeInOut {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        @keyframes popIn {
          0% { transform: scale(0); }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LevelUpNotification; 