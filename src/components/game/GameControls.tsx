import React from 'react';
import { useGame } from './GameContext';

const GameControls: React.FC = () => {
  const { 
    toggleInventory, 
    toggleQuestLog,
    toggleTutorial,
    startVoiceRecognition, 
    gameState,
    simulateKeyPress,
    simulateKeyRelease
  } = useGame();
  
  const { uiState } = gameState;

  return (
    <div className="bg-mystic-900 p-3 border-t-2 border-mystic-700">
      <div className="flex justify-between items-center">
        {/* Movement controls - with functional buttons */}
        <div className="flex space-x-1">
          <div className="grid grid-cols-3 gap-1">
            <div className="col-start-2">
              <button
                className="w-12 h-12 bg-mystic-700 text-white rounded-md flex items-center justify-center hover:bg-mystic-600 active:bg-mystic-500"
                onMouseDown={() => simulateKeyPress('arrowup')}
                onMouseUp={() => simulateKeyRelease('arrowup')}
                onTouchStart={() => simulateKeyPress('arrowup')}
                onTouchEnd={() => simulateKeyRelease('arrowup')}
                onMouseLeave={() => simulateKeyRelease('arrowup')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
            <div className="col-start-1 col-end-2 row-start-2">
              <button
                className="w-12 h-12 bg-mystic-700 text-white rounded-md flex items-center justify-center hover:bg-mystic-600 active:bg-mystic-500"
                onMouseDown={() => simulateKeyPress('arrowleft')}
                onMouseUp={() => simulateKeyRelease('arrowleft')}
                onTouchStart={() => simulateKeyPress('arrowleft')}
                onTouchEnd={() => simulateKeyRelease('arrowleft')}
                onMouseLeave={() => simulateKeyRelease('arrowleft')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="col-start-2 row-start-2">
              <button
                className="w-12 h-12 bg-mystic-700 text-white rounded-md flex items-center justify-center hover:bg-mystic-600 active:bg-mystic-500"
                onMouseDown={() => simulateKeyPress('arrowdown')}
                onMouseUp={() => simulateKeyRelease('arrowdown')}
                onTouchStart={() => simulateKeyPress('arrowdown')}
                onTouchEnd={() => simulateKeyRelease('arrowdown')}
                onMouseLeave={() => simulateKeyRelease('arrowdown')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div className="col-start-3 row-start-2">
              <button
                className="w-12 h-12 bg-mystic-700 text-white rounded-md flex items-center justify-center hover:bg-mystic-600 active:bg-mystic-500"
                onMouseDown={() => simulateKeyPress('arrowright')}
                onMouseUp={() => simulateKeyRelease('arrowright')}
                onTouchStart={() => simulateKeyPress('arrowright')}
                onTouchEnd={() => simulateKeyRelease('arrowright')}
                onMouseLeave={() => simulateKeyRelease('arrowright')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Voice commands button */}
        <button
          onClick={startVoiceRecognition}
          className="px-4 py-2 bg-mystic-500 hover:bg-mystic-600 text-white rounded-md flex items-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span>Speak (V)</span>
        </button>
        
        {/* Game UI controls */}
        <div className="flex space-x-2">
          <button
            onClick={toggleInventory}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              uiState.inventoryOpen 
                ? 'bg-mystic-500 text-white' 
                : 'bg-mystic-700 text-white hover:bg-mystic-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            <span>Inventory (I)</span>
          </button>
          
          <button
            onClick={toggleQuestLog}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              uiState.questLogOpen 
                ? 'bg-mystic-500 text-white' 
                : 'bg-mystic-700 text-white hover:bg-mystic-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Quests (Q)</span>
          </button>
          
          <button
            onClick={toggleTutorial}
            className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
              uiState.showTutorial 
                ? 'bg-mystic-500 text-white' 
                : 'bg-mystic-700 text-white hover:bg-mystic-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Help (H)</span>
          </button>
        </div>
      </div>
      
      {/* Keyboard controls info */}
      <div className="mt-2 text-center text-sm text-mystic-300">
        <p>Controls: Arrow Keys or WASD to move | E to interact | I for inventory | Q for quests | H for help | ESC to close panels</p>
      </div>
    </div>
  );
};

export default GameControls;
