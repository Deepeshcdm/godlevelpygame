
import React from 'react';
import { useGame, Item } from '../GameContext';

const InventoryPanel: React.FC = () => {
  const { gameState } = useGame();
  const { inventory } = gameState;

  // Render an individual inventory item
  const renderItem = (item: Item) => {
    // Use different colors based on item type
    let itemColor = '';
    switch (item.type) {
      case 'weapon':
        itemColor = 'bg-red-500';
        break;
      case 'potion':
        itemColor = 'bg-green-500';
        break;
      case 'key':
        itemColor = 'bg-yellow-500';
        break;
      case 'artifact':
        itemColor = 'bg-purple-500';
        break;
    }

    return (
      <div 
        key={item.id}
        className="p-3 bg-mystic-800 rounded-md flex items-start space-x-3 hover:bg-mystic-700 transition-colors"
      >
        <div className={`w-10 h-10 ${itemColor} rounded-md flex items-center justify-center text-white`}>
          {item.type === 'potion' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          )}
          {item.type === 'weapon' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {item.type === 'key' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          )}
          {item.type === 'artifact' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold">{item.name}</h3>
          <p className="text-mystic-300 text-sm">{item.description}</p>
          <div className="flex justify-between items-center mt-1">
            <span className="text-mystic-200 text-xs">Value: {item.value}</span>
            <span className="text-xs px-2 py-1 rounded bg-mystic-700 text-mystic-300 capitalize">{item.type}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-mystic-900 border-2 border-mystic-700 rounded-lg shadow-lg p-4 max-h-96 overflow-hidden flex flex-col">
      <h2 className="text-xl font-bold text-white mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 4v10" />
        </svg>
        Inventory
      </h2>
      
      <div className="flex-1 overflow-y-auto game-scrollbar space-y-2">
        {inventory.length > 0 ? (
          inventory.map(renderItem)
        ) : (
          <div className="text-center py-6 text-mystic-400">
            <p>Your inventory is empty</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPanel;
