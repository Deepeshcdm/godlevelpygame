import React from 'react';
import GameMap from './GameMap';
import GameControls from './GameControls';
import GameUI from './ui/GameUI';
import DialogueBox from './ui/DialogueBox';
import LevelUpNotification from './ui/LevelUpNotification';
import PythonQuiz from './ui/PythonQuiz';
import TutorialModal from './TutorialModal';
import { useGame } from './GameContext';

const GameContainer: React.FC = () => {
  const { gameState, isListening, startVoiceRecognition, stopVoiceRecognition } = useGame();
  const { activeDialogue, uiState } = gameState;

  return (
    <div className="relative w-full max-w-6xl h-[80vh] bg-mystic-900 rounded-lg overflow-hidden shadow-2xl border-2 border-mystic-700">
      {/* Game title */}
      <div className="absolute top-0 left-0 w-full bg-gradient-to-r from-mystic-700 to-mystic-900 p-3 z-10 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white tracking-wider">
          <span className="text-mystic-300">Mystic Realms:</span> Voice Quest
        </h1>
        
        {/* Voice command toggle button */}
        <button
          onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
          className={`px-4 py-2 rounded-full flex items-center space-x-2 transition-colors ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : 'bg-mystic-400 hover:bg-mystic-500 text-white'
          }`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          </svg>
          <span>{isListening ? 'Listening...' : 'Voice Commands'}</span>
        </button>
      </div>
      
      {/* Game world container */}
      <div className="w-full h-full pt-16 flex flex-col">
        <div className="relative flex-1 overflow-hidden border-t-2 border-mystic-700">
          {/* Game map */}
          <GameMap />
          
          {/* Game UI panels */}
          <GameUI />
          
          {/* Dialogue box */}
          {activeDialogue.active && activeDialogue.npc && (
            <DialogueBox />
          )}
          
          {/* Level up notification */}
          <LevelUpNotification />
          
          {/* Python Quiz */}
          <PythonQuiz />
        </div>
        
        {/* Game controls */}
        <GameControls />
      </div>

      {/* Tutorial Modal */}
      {uiState.showTutorial && <TutorialModal />}
    </div>
  );
};

export default GameContainer;
