import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '@/components/game/GameContext';

const PythonQuiz: React.FC = () => {
  const { gameState, submitQuizAnswer, closeQuiz } = useGame();
  const { activeQuiz } = gameState;
  const [answer, setAnswer] = useState('');
  const [animateIn, setAnimateIn] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sparklePosition, setSparklePosition] = useState({ x: 0, y: 0 });
  const [showSparkle, setShowSparkle] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset answer when the active quiz NPC changes
  useEffect(() => {
    if (activeQuiz.active) {
      setAnswer(''); // Clear the input field
      setAnimateIn(true); // Trigger animation when quiz becomes active
      
      // Create random sparkles on load
      setTimeout(() => {
        if (containerRef.current) {
          createRandomSparkle();
        }
      }, 500);
    }
  }, [activeQuiz.active, activeQuiz.npcId]); // Depend on active status and npcId

  const createRandomSparkle = () => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;
    
    setSparklePosition({ x, y });
    setShowSparkle(true);
    
    setTimeout(() => {
      setShowSparkle(false);
      
      // Create another sparkle after a delay
      setTimeout(() => {
        if (containerRef.current) {
          createRandomSparkle();
        }
      }, Math.random() * 3000 + 1000);
    }, 700);
  };

  // If no quiz is active, don't render anything
  if (!activeQuiz.active || !activeQuiz.npcId || !activeQuiz.currentQuiz) return null;

  // Find the NPC giving the quiz
  const npc = gameState.npcs.find(n => n.id === activeQuiz.npcId);
  if (!npc) return null;

  // Get the current quiz data
  const { currentQuiz } = activeQuiz;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create a success sparkle effect on submit
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSparklePosition({ x: rect.width / 2, y: rect.height / 2 });
      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 700);
    }
    
    submitQuizAnswer(answer);
  };

  // Function to render code snippets with preserved whitespace
  const renderCode = (code: string) => {
    return <pre className="whitespace-pre-wrap break-words">{code}</pre>;
  };

  // Get difficulty color
  const getDifficultyColor = () => {
    switch(currentQuiz.difficulty) {
      case 'beginner': return 'from-green-500 to-green-700 text-green-300';
      case 'intermediate': return 'from-yellow-500 to-yellow-700 text-yellow-300';
      case 'advanced': return 'from-red-500 to-red-700 text-red-300';
      default: return 'from-mystic-500 to-mystic-700 text-mystic-300';
    }
  };

  // Generate a simple hint based on difficulty
  const getHint = () => {
    switch(currentQuiz.difficulty) {
      case 'beginner': 
        return "Remember to check for print statements in the code and follow the execution flow line by line.";
      case 'intermediate': 
        return "Pay attention to variable scope and how values change throughout the program execution.";
      case 'advanced': 
        return "Look carefully at edge cases, recursion patterns, or complex data transformations.";
      default: 
        return "Analyze the code step by step to determine the output.";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div 
        ref={containerRef}
        className={`bg-gradient-to-br from-mystic-900 to-mystic-950 rounded-lg shadow-2xl max-w-2xl w-full border-2 border-mystic-400 max-h-[90vh] overflow-hidden 
          ${animateIn ? 'animate-quizAppear' : ''} relative`}
      >
        {/* Animated background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/mystic-pattern.png')] opacity-5 animate-float"></div>
        </div>
        
        {/* Sparkle effect */}
        {showSparkle && (
          <div 
            className="absolute pointer-events-none z-10"
            style={{ 
              left: `${sparklePosition.x}px`, 
              top: `${sparklePosition.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-16 h-16 animate-sparkle">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" fill="url(#sparkleGradient)" />
                <defs>
                  <linearGradient id="sparkleGradient" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#B9A4FF" />
                    <stop offset="1" stopColor="#7E69AB" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        )}
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-mystic-500 via-purple-500 to-mystic-500"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-mystic-500 via-purple-500 to-mystic-500"></div>
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-mystic-500 via-purple-500 to-mystic-500"></div>
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-mystic-500 via-purple-500 to-mystic-500"></div>
        
        {/* Glowing corner decorations */}
        <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-mystic-300 shadow-[0_0_10px_rgba(185,164,255,0.5)]"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-mystic-300 shadow-[0_0_10px_rgba(185,164,255,0.5)]"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-mystic-300 shadow-[0_0_10px_rgba(185,164,255,0.5)]"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-mystic-300 shadow-[0_0_10px_rgba(185,164,255,0.5)]"></div>
        
        {/* Animated runes */}
        <div className="absolute top-[20%] left-0 w-1 h-20 overflow-hidden pointer-events-none">
          <div className="w-1 h-40 bg-gradient-to-b from-transparent via-mystic-400 to-transparent animate-runeFlow"></div>
        </div>
        <div className="absolute top-[60%] right-0 w-1 h-20 overflow-hidden pointer-events-none">
          <div className="w-1 h-40 bg-gradient-to-b from-transparent via-mystic-400 to-transparent animate-runeFlow"></div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[90vh] relative z-10">
          {/* Header with glow effect */}
          <div className="flex justify-between items-center mb-6 border-b border-mystic-700 pb-4">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-mystic-300 to-purple-300 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">
              <span className="animate-pulse-glow inline-block mr-2">✧</span>
              Python Challenge: {npc.conceptTitle}
            </h2>
            <button 
              onClick={closeQuiz}
              className="text-mystic-400 hover:text-white text-2xl leading-none hover:scale-110 transition-all duration-200 w-8 h-8 flex items-center justify-center rounded-full hover:bg-mystic-800 hover:shadow-[0_0_10px_rgba(185,164,255,0.5)]"
              aria-label="Close quiz"
            >
              &times;
            </button>
          </div>

          {/* NPC info with avatar */}
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-mystic-500 shadow-lg mr-3">
              <img 
                src={`/NPC Icon/${npc.name}.png`} 
                alt={npc.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.endsWith('.png')) {
                    target.src = `/NPC Icon/${npc.name}.jpg`;
                  } else {
                    target.src = `/placeholder.svg`;
                  }
                }}
              />
            </div>
            <div>
              <p className="text-mystic-300 font-medium">{npc.name}</p>
              <p className="text-xs text-mystic-400">Python Master</p>
            </div>
          </div>

          {/* Concept Explanation with styled box */}
          <div className="mb-6 bg-mystic-800 bg-opacity-50 p-4 rounded-lg border-l-4 border-mystic-500 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-shadow duration-300">
            <h3 className="text-lg font-semibold text-mystic-300 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-mystic-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Concept
            </h3>
            <p className="text-white text-sm leading-relaxed">{npc.conceptExplanation}</p>
          </div>

          {/* Demo Code Snippet with improved styling */}
          <div className="mb-6 transform hover:scale-[1.01] transition-transform duration-300">
            <h3 className="text-lg font-semibold text-mystic-300 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-mystic-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Example
            </h3>
            <div className="bg-[#1a1a2e] p-4 rounded-lg font-mono text-sm text-green-400 overflow-x-auto border border-mystic-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] relative">
              {/* Python logo watermark */}
              <div className="absolute right-3 bottom-3 opacity-10 w-12 h-12">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.372 0 6.61 2.864 6.61 2.864l.005 2.958h5.49v.78H4.005S0 6.215 0 12.592c0 6.376 3.497 6.143 3.497 6.143h2.084v-2.96s-.113-3.497 3.448-3.497h5.927s3.313.058 3.313-3.202V3.764S18.832 0 12 0zM8.84 1.67c.53 0 .963.432.963.964a.964.964 0 01-.963.964.964.964 0 01-.964-.964c0-.532.433-.963.964-.963z" fill="#3776AB"/>
                  <path d="M12 24c6.628 0 5.39-2.864 5.39-2.864l-.005-2.958h-5.49v-.78h8.101S24 17.784 24 11.407c0-6.376-3.497-6.143-3.497-6.143h-2.084v2.96s.113 3.497-3.448 3.497H9.044s-3.313-.058-3.313 3.202v5.112S5.168 24 12 24zm3.16-1.67a.964.964 0 01-.963-.964c0-.533.432-.964.963-.964.531 0 .964.431.964.964a.964.964 0 01-.964.964z" fill="#3776AB"/>
                </svg>
              </div>
              {renderCode(npc.demoCodeSnippet)}
            </div>
          </div>

          {/* Quiz Program with improved styling */}
          <div className="mb-6 border-t border-mystic-700 pt-6">
            <h3 className="text-lg font-semibold text-mystic-300 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-mystic-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              Challenge
              <span className="ml-2 text-xs px-2 py-0.5 bg-mystic-700 rounded-full text-mystic-300 animate-pulse-light">
                Solve it!
              </span>
            </h3>
            <p className="text-mystic-200 italic mb-3 pl-7">What will be the output of the following program?</p>
            
            <div className="bg-[#1a1a2e] p-4 rounded-lg mb-4 font-mono text-sm text-cyan-400 overflow-x-auto border border-mystic-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] relative transform hover:scale-[1.01] transition-transform duration-300">
              {/* Line numbers */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-mystic-950 flex flex-col items-end pr-2 text-mystic-600 select-none border-r border-mystic-800">
                {currentQuiz.program.split('\n').map((_, i) => (
                  <div key={i} className="leading-relaxed">{i+1}</div>
                ))}
              </div>
              
              {/* Code content */}
              <div className="pl-8 relative">
                {renderCode(currentQuiz.program)}
                
                {/* Animated cursor effect */}
                <div className="absolute bottom-0 left-8 h-[1.2em] w-2 bg-cyan-500 opacity-70 animate-blink"></div>
              </div>
            </div>
            
            {/* Difficulty badge with tooltip */}
            <div className="flex justify-end mb-4">
              <div className="relative group">
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getDifficultyColor()} text-xs font-bold uppercase tracking-wider shadow-lg cursor-help`}>
                  {currentQuiz.difficulty}
                </div>
                <div className="absolute bottom-full mb-2 right-0 w-48 bg-mystic-950 p-2 rounded text-xs text-mystic-300 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-mystic-700">
                  {currentQuiz.difficulty === 'beginner' ? 'Perfect for new Python learners' : 
                   currentQuiz.difficulty === 'intermediate' ? 'For those familiar with Python basics' : 
                   'For experienced Python developers'}
                </div>
              </div>
            </div>
          </div>

          {/* Hint section */}
          <div className="mb-6">
            <button 
              onClick={() => setShowHint(!showHint)}
              className="text-mystic-400 hover:text-mystic-300 text-sm flex items-center transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showHint ? 'Hide Hint' : 'Need a Hint?'}
            </button>
            
            {showHint && (
              <div className="mt-2 p-3 bg-mystic-800 bg-opacity-40 rounded border-l-2 border-mystic-500 text-sm text-mystic-200 animate-fadeIn">
                {getHint()}
              </div>
            )}
          </div>

          {/* Answer Form with improved styling */}
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="mb-4 relative">
              <label htmlFor="answer" className="block text-mystic-300 text-sm mb-2 font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Your Answer:
              </label>
              <div className="relative">
                <input
                  id="answer"
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                      e.stopPropagation();
                    }
                  }}
                  className="w-full p-3 pl-4 bg-mystic-800 text-white border border-mystic-600 rounded-md focus:outline-none focus:ring-2 focus:ring-mystic-400 focus:border-transparent shadow-[inset_0_0_5px_rgba(0,0,0,0.3)] placeholder-mystic-500"
                  placeholder="Enter the exact output..."
                  aria-label="Quiz answer input"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-mystic-500 text-xs flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Press Enter to submit
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <p className="text-mystic-400 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Press ESC to cancel
              </p>
              <button
                type="submit"
                disabled={!answer.trim()}
                className={`px-6 py-3 rounded-md focus:outline-none transition-all duration-200 transform shadow-lg flex items-center font-medium
                  ${!answer.trim() 
                    ? 'bg-mystic-800 text-mystic-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-mystic-600 to-purple-600 text-white hover:from-mystic-500 hover:to-purple-500 hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Submit Answer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Add this to your global CSS or tailwind.config.js
// @keyframes quizAppear {
//   0% { transform: scale(0.9); opacity: 0; }
//   100% { transform: scale(1); opacity: 1; }
// }

export default PythonQuiz; 