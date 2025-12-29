import React from 'react';
import { useGame } from './GameContext';

export const DirectionControls: React.FC = () => {
  const { simulateKeyPress, simulateKeyRelease } = useGame();

  // Function to handle button press
  const handleButtonPress = (key: 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright') => {
    simulateKeyPress(key);
  };

  // Function to handle button release
  const handleButtonRelease = (key: 'arrowup' | 'arrowdown' | 'arrowleft' | 'arrowright') => {
    simulateKeyRelease(key);
  };

  return (
    <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
      <div className="grid grid-cols-3 gap-2">
        {/* Up button */}
        <div className="col-start-2">
          <button 
            className="w-14 h-14 bg-purple-800 text-white rounded-md flex items-center justify-center"
            onMouseDown={() => handleButtonPress('arrowup')}
            onMouseUp={() => handleButtonRelease('arrowup')}
            onTouchStart={() => handleButtonPress('arrowup')}
            onTouchEnd={() => handleButtonRelease('arrowup')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
        
        {/* Left button */}
        <div className="col-start-1 row-start-2">
          <button 
            className="w-14 h-14 bg-purple-800 text-white rounded-md flex items-center justify-center"
            onMouseDown={() => handleButtonPress('arrowleft')}
            onMouseUp={() => handleButtonRelease('arrowleft')}
            onTouchStart={() => handleButtonPress('arrowleft')}
            onTouchEnd={() => handleButtonRelease('arrowleft')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        
        {/* Down button */}
        <div className="col-start-2 row-start-2">
          <button 
            className="w-14 h-14 bg-purple-800 text-white rounded-md flex items-center justify-center"
            onMouseDown={() => handleButtonPress('arrowdown')}
            onMouseUp={() => handleButtonRelease('arrowdown')}
            onTouchStart={() => handleButtonPress('arrowdown')}
            onTouchEnd={() => handleButtonRelease('arrowdown')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Right button */}
        <div className="col-start-3 row-start-2">
          <button 
            className="w-14 h-14 bg-purple-800 text-white rounded-md flex items-center justify-center"
            onMouseDown={() => handleButtonPress('arrowright')}
            onMouseUp={() => handleButtonRelease('arrowright')}
            onTouchStart={() => handleButtonPress('arrowright')}
            onTouchEnd={() => handleButtonRelease('arrowright')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}; 