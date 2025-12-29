import React from 'react';
import { useGame } from './GameContext';

const TutorialModal = () => {
  const { toggleTutorial } = useGame();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative bg-slate-900 border-2 border-amber-500 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 text-white">
        <h1 className="text-3xl font-bold text-amber-400 text-center mb-6">Welcome to Mystic Realms: A Python Adventure!</h1>
        
        <div className="space-y-6">
          <p className="text-lg">
            Greetings, brave adventurer! Welcome to a world where magic, mystery, and Python programming intertwine. 
            Your journey through this enchanted realm will not only test your wit but also teach you valuable coding skills!
          </p>
          
          <div>
            <h2 className="text-2xl font-semibold text-amber-300 mb-2">Getting Started</h2>
            
            <div className="ml-4 space-y-3">
              <div>
                <h3 className="text-xl font-medium text-amber-200">Movement</h3>
                <ul className="list-disc list-inside ml-4">
                  <li>Use <span className="font-mono bg-slate-800 px-1 rounded">WASD</span> keys or <span className="font-mono bg-slate-800 px-1 rounded">Arrow Keys</span> to move your character around the world</li>
                  <li>Explore the landscape of paths, forests, rivers, and magical locations</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-amber-200">Interacting with NPCs</h3>
                <ul className="list-disc list-inside ml-4">
                  <li>When you see a character with a name above their head, they're an NPC (Non-Player Character)</li>
                  <li>Press <span className="font-mono bg-slate-800 px-1 rounded">E</span> when near an NPC to interact with them</li>
                  <li>Each NPC has unique knowledge and quests to offer</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold text-amber-300 mb-2">The Python Challenge System</h2>
            
            <div className="ml-4 space-y-3">
              <div>
                <h3 className="text-xl font-medium text-amber-200">Meeting NPCs</h3>
                <p>When you first approach an NPC, they'll challenge you with a Python programming quiz</p>
                <p>Each NPC teaches a different Python concept:</p>
                <ul className="list-disc list-inside ml-4">
                  <li><span className="font-semibold">Elder Mystic</span>: Variables & Print Statements</li>
                  <li><span className="font-semibold">Merchant Ryla</span>: If Statements</li>
                  <li><span className="font-semibold">Ranger Thorne</span>: Loops</li>
                  <li><span className="font-semibold">Alchemist Vex</span>: Functions</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-amber-200">Taking the Challenge</h3>
                <ol className="list-decimal list-inside ml-4">
                  <li>Read the concept explanation and example code carefully</li>
                  <li>Study the quiz program</li>
                  <li>Determine what the correct output should be</li>
                  <li>Type your answer in the text box and submit</li>
                </ol>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-amber-200">Success and Failure</h3>
                <ul className="list-disc list-inside ml-4">
                  <li><span className="font-semibold">Unlimited Attempts</span>: Don't worry if you get it wrong! You can try as many times as needed</li>
                  <li>Press <span className="font-mono bg-slate-800 px-1 rounded">ESC</span> to cancel a quiz if you want to come back later</li>
                  <li>When you answer correctly, you'll unlock full interaction with that NPC</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold text-amber-300 mb-2">Quest System</h2>
            <ul className="list-disc list-inside ml-4">
              <li>After passing an NPC's Python challenge, they may offer you quests</li>
              <li>Quests involve collecting items, visiting locations, or helping NPCs</li>
              <li>Press <span className="font-mono bg-slate-800 px-1 rounded">Q</span> to view your active quests</li>
              <li>Press <span className="font-mono bg-slate-800 px-1 rounded">I</span> to check your inventory</li>
              <li>Complete quests to earn experience points and level up!</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold text-amber-300 mb-2">Additional Features</h2>
            <ul className="list-disc list-inside ml-4">
              <li>Press <span className="font-mono bg-slate-800 px-1 rounded">V</span> to activate voice commands (try saying "talk" when near an NPC)</li>
              <li>Use <span className="font-mono bg-slate-800 px-1 rounded">ESC</span> to exit dialogues or close menus</li>
              <li>Space or Enter advances through dialogue</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-semibold text-amber-300 mb-2">Your Adventure Begins!</h2>
            <p>
              Your goal is to help the inhabitants of Mystic Realms by mastering Python concepts and completing their quests. 
              As you learn more programming skills, you'll unlock more of the world and discover the secrets that lie within!
            </p>
            <p className="italic mt-2">
              Remember, the journey of a programmer begins with a single line of code. Good luck, adventurer!
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <button 
            onClick={toggleTutorial}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Begin Your Adventure!
          </button>
        </div>
        
        <div className="text-center mt-4 text-sm text-amber-200">
          Press <span className="font-mono bg-slate-800 px-1 rounded">ESC</span> to close this tutorial (you can reopen it by pressing <span className="font-mono bg-slate-800 px-1 rounded">H</span>)
        </div>
      </div>
    </div>
  );
};

export default TutorialModal; 