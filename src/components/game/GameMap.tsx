import React, { useRef, useEffect } from 'react';
import { useGame, Tile, NPC, Item, Position, QuestItem } from './GameContext';

const TILE_SIZE = 32; // Size of each tile in pixels

const GameMap: React.FC = () => {
  const { gameState } = useGame();
  const { player, gameMap, npcs, activeDialogue, questItems } = gameState;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Check if a conversation is active
  const isConversationActive = activeDialogue.active;
  
  // Center the map view on the player
  useEffect(() => {
    if (mapContainerRef.current) {
      // Calculate the position to center the player on screen
      const containerWidth = mapContainerRef.current.clientWidth;
      const containerHeight = mapContainerRef.current.clientHeight;
      
      // Use visualPosition for smoother scrolling
      const playerPixelX = player.visualPosition.x * TILE_SIZE;
      const playerPixelY = player.visualPosition.y * TILE_SIZE;
      
      // Center the player
      const scrollX = playerPixelX - containerWidth / 2 + TILE_SIZE / 2;
      const scrollY = playerPixelY - containerHeight / 2 + TILE_SIZE / 2;
      
      mapContainerRef.current.scrollTo({
        left: scrollX,
        top: scrollY,
        behavior: 'auto' // Always use auto to avoid jittery behavior
      });
    }
  }, [player.visualPosition]);

  // Render a tile with the appropriate appearance
  const renderTile = (tile: Tile, x: number, y: number) => {
    let bgColor = 'bg-green-600'; // Default grass
    let content = null;
    
    switch (tile.terrain) {
      case 'grass':
        bgColor = 'bg-green-600';
        break;
      case 'water':
        bgColor = 'bg-blue-500';
        content = (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-3/4 bg-blue-400 rounded-full opacity-30 animate-pulse"></div>
          </div>
        );
        break;
      case 'stone':
        bgColor = 'bg-gray-500';
        break;
      case 'path':
        bgColor = 'bg-yellow-200';
        break;
      case 'wall':
        bgColor = 'bg-gray-800';
        content = (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
            <div className="w-full h-full border-2 border-gray-700"></div>
          </div>
        );
        break;
      case 'tree':
        bgColor = 'bg-green-700';
        content = (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-5/6 h-2/3 bg-green-800 rounded-full"></div>
            <div className="w-1/4 h-1/3 bg-brown-600 mt-auto"></div>
          </div>
        );
        break;
      case 'bridge':
        bgColor = 'bg-brown-600';
        content = (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-full h-1/3 bg-brown-700"></div>
            <div className="w-full h-1/3 bg-brown-800"></div>
            <div className="w-full h-1/3 bg-brown-700"></div>
          </div>
        );
        break;
    }
    
    return (
      <div 
        key={`${x}-${y}`}
        className={`absolute ${bgColor} border border-opacity-10 border-black`}
        style={{ 
          width: TILE_SIZE, 
          height: TILE_SIZE, 
          left: x * TILE_SIZE, 
          top: y * TILE_SIZE 
        }}
      >
        {content}
      </div>
    );
  };

  // Render an NPC
  const renderNPC = (npc: NPC) => {
    // Don't render any NPC icons during active conversation
    if (isConversationActive) {
      return null;
    }
    
    // Different appearance based on NPC type
    let npcStyle = '';
    
    switch (npc.sprite) {
      case 'elder':
        npcStyle = 'bg-purple-700 text-white';
        break;
      case 'merchant':
        npcStyle = 'bg-yellow-600 text-white';
        break;
      default:
        npcStyle = 'bg-blue-600 text-white';
        break;
    }

    // Check if NPC has completed quests
    const hasCompletedQuests = gameState.completedQuests.some(quest => quest.npcId === npc.id);
    const glowClass = hasCompletedQuests ? 'quest-completed-glow' : '';
    
    return (
      <div 
        key={npc.id}
        className={`absolute ${npcStyle} ${glowClass} rounded-full border-2 border-white flex items-center justify-center animate-float z-10`}
        style={{ 
          width: TILE_SIZE, 
          height: TILE_SIZE, 
          left: npc.position.x * TILE_SIZE, 
          top: npc.position.y * TILE_SIZE 
        }}
      >
        {npc.name.substring(0, 1)}
      </div>
    );
  };

  // Render a quest item on the map
  const renderQuestItem = (item: QuestItem) => {
    // Only render if the item has a position
    if (!item.position) return null;
    
    // Different appearance based on item type
    let itemStyle = '';
    let itemContent = null;
    
    switch (item.sprite) {
      case 'crystal_blue':
        itemStyle = 'bg-blue-500';
        itemContent = (
          <div className="w-3/4 h-3/4 bg-blue-300 rounded-full animate-pulse"></div>
        );
        break;
      case 'crystal_green':
        itemStyle = 'bg-green-500';
        itemContent = (
          <div className="w-3/4 h-3/4 bg-green-300 rounded-full animate-pulse"></div>
        );
        break;
      case 'petals':
        itemStyle = 'bg-red-600';
        itemContent = (
          <div className="w-4/5 h-4/5 bg-red-400 rounded-full"></div>
        );
        break;
      case 'tracks':
        itemStyle = 'bg-transparent';
        itemContent = (
          <div className="w-full h-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-600">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </div>
        );
        break;
      case 'map_piece':
        itemStyle = 'bg-amber-700';
        itemContent = (
          <div className="w-4/5 h-4/5 bg-amber-400 rounded-sm border border-amber-900 flex items-center justify-center animate-pulse map-piece-glow">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-amber-950">
              <path fillRule="evenodd" d="M8.161 2.58a1.875 1.875 0 0 1 1.678 0l4.993 2.498c.106.052.23.052.336 0l3.869-1.935A1.875 1.875 0 0 1 21.75 4.82v12.485c0 .71-.401 1.36-1.037 1.677l-4.875 2.437a1.875 1.875 0 0 1-1.676 0l-4.994-2.497a.375.375 0 0 0-.336 0l-3.868 1.935A1.875 1.875 0 0 1 2.25 19.18V6.695c0-.71.401-1.36 1.036-1.677l4.875-2.437Z" clipRule="evenodd" />
            </svg>
          </div>
        );
        break;
      default:
        itemStyle = 'bg-yellow-400';
        itemContent = (
          <div className="w-3/4 h-3/4 bg-yellow-300 rounded-md"></div>
        );
    }
    
    return (
      <div 
        key={item.id}
        className={`absolute ${itemStyle} rounded-md border border-white flex items-center justify-center z-5 animate-pulse`}
        style={{ 
          width: TILE_SIZE * 0.8, 
          height: TILE_SIZE * 0.8, 
          left: item.position.x * TILE_SIZE + TILE_SIZE * 0.1, 
          top: item.position.y * TILE_SIZE + TILE_SIZE * 0.1
        }}
      >
        {itemContent}
      </div>
    );
  };

  // Render the player character
  const renderPlayer = () => {
    // Don't render player icon during active conversation
    if (isConversationActive) {
      return null;
    }
    
    // Different appearance based on player direction
    let playerBg = '';
    
    switch (player.direction) {
      case 'up':
        playerBg = 'bg-gradient-to-t from-mystic-400 to-mystic-500';
        break;
      case 'down':
        playerBg = 'bg-gradient-to-b from-mystic-400 to-mystic-500';
        break;
      case 'left':
        playerBg = 'bg-gradient-to-l from-mystic-400 to-mystic-500';
        break;
      case 'right':
        playerBg = 'bg-gradient-to-r from-mystic-400 to-mystic-500';
        break;
    }
    
    // Use visualPosition for smooth animation
    return (
      <div 
        className={`absolute ${playerBg} rounded-full border-2 border-white z-20 flex items-center justify-center shadow-md`}
        style={{ 
          width: TILE_SIZE, 
          height: TILE_SIZE, 
          left: player.visualPosition.x * TILE_SIZE, 
          top: player.visualPosition.y * TILE_SIZE,
        }}
      >
        <div className="w-1/2 h-1/2 bg-white rounded-full"></div>
      </div>
    );
  };

  // Render map elements
  return (
    <div className="relative w-full h-full">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
        .quest-completed-glow {
          box-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 30px #ffd700;
          animation: float 2s ease-in-out infinite, glow 2s ease-in-out infinite;
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 30px #ffd700; }
          50% { box-shadow: 0 0 15px #ffd700, 0 0 25px #ffd700, 0 0 35px #ffd700; }
        }
        .map-piece-glow {
          box-shadow: 0 0 10px #b45309, 0 0 15px #b45309;
          animation: map-glow 1.5s ease-in-out infinite;
        }
        @keyframes map-glow {
          0%, 100% { box-shadow: 0 0 10px #b45309, 0 0 15px #b45309; }
          50% { box-shadow: 0 0 15px #b45309, 0 0 20px #b45309; }
        }
      `}</style>
      <div 
        ref={mapContainerRef} 
        className="w-full h-full overflow-auto relative bg-green-800"
      >
        <div className="relative" style={{ 
          width: gameMap[0]?.length * TILE_SIZE || 0,
          height: gameMap.length * TILE_SIZE || 0
        }}>
          {/* Render map tiles */}
          {gameMap.map((row, y) =>
            row.map((tile, x) => renderTile(tile, x, y))
          )}
          
          {/* Render quest items - only those in the questItems array (visible ones) */}
          {questItems.map((item) => renderQuestItem(item))}
          
          {/* Render NPCs */}
          {npcs.map((npc) => renderNPC(npc))}
          
          {/* Render player */}
          {renderPlayer()}
        </div>
      </div>
    </div>
  );
};

export default GameMap;
