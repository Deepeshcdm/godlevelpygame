import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import {
  isRunningInWebview,
  registerPythonSpeechCallback,
  startPythonSpeechRecognition,
  stopPythonSpeechRecognition
} from './webview-support';

// API Key for Gemini AI
const GEMINI_API_KEY = 'AIzaSyAo_edLyN42xYWoshKJFR8WH06nj_pXLAE';

// Define game types
export type Position = {
  x: number;
  y: number;
};

export type Terrain = 'grass' | 'water' | 'stone' | 'path' | 'wall' | 'tree' | 'bridge';

export type Tile = {
  terrain: Terrain;
  walkable: boolean;
};

export type NPC = {
  id: string;
  name: string;
  position: Position;
  dialogue: string[];
  quest?: Quest;
  sprite: string;
  personality?: string; // For AI context
  // Enhanced Quiz properties
  conceptTitle: string;
  conceptExplanation: string;
  demoCodeSnippet: string;
  quizProgram: string;
  correctOutput: string;
  hasPassedQuiz: boolean;
};

export type QuestObjective = {
  id: string;
  description: string;
  type: 'collect' | 'location' | 'interact';
  targetId?: string; // ID of item to collect or NPC to interact with
  targetPosition?: Position; // Position to reach for location objectives
  count?: number; // Number of items to collect
  completed: boolean;
  currentProgress?: number; // For collection objectives
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  relatedQuestItemIds: string[]; // IDs of quest items linked to this quest
  active: boolean; // Whether the quest is currently active
  completed: boolean;
  npcId: string; // The NPC who gave the quest
  reward?: Item;
  xpReward: number; // Experience points awarded for completing the quest
};

export type Item = {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'potion' | 'key' | 'artifact';
  value: number;
  sprite: string;
  position?: Position; // Make position optional in the base Item type
};

// Define quest item as an item with a position
export type QuestItem = Item & {
  position: Position; // Position is required for quest items
};

// Define SpeechRecognition interfaces
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: (event: Event) => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

// Declare global types
declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
    currentRecognition: SpeechRecognition;
  }
}

type GameState = {
  player: {
    position: Position;
    targetPosition: Position;
    visualPosition: Position; // Added for smooth animation
    isMoving: boolean;
    direction: 'up' | 'down' | 'left' | 'right';
    sprite: string;
    level: number; // Player's current level
    xp: number; // Current XP amount
    nextLevelXp: number; // XP required for next level
  };
  gameMap: Tile[][];
  npcs: NPC[];
  inventory: Item[];
  activeQuests: Quest[];
  completedQuests: Quest[];
  questItems: QuestItem[]; // Only visible quest items
  hiddenQuestItems: QuestItem[]; // Quest items that aren't visible yet
  activeDialogue: {
    npc: NPC | null;
    active: boolean;
    currentResponseIndex: number;
  };
  uiState: {
    inventoryOpen: boolean;
    questLogOpen: boolean;
    showLevelUp: boolean; // Whether to show level up notification
  };
  currentConversationHistory: string[];
  // Quiz state
  activeQuiz: {
    npcId: string | null;
    active: boolean;
    playerAnswer: string;
  };
  // New state to trigger interaction after quiz
  npcToInteractAfterQuiz: string | null; 
};

// Initial game state
const initialState: GameState = {
  player: {
    position: { x: 25, y: 25 },
    targetPosition: { x: 25, y: 25 },
    visualPosition: { x: 25, y: 25 }, // Initialize visual position same as actual position
    isMoving: false,
    direction: 'down',
    sprite: 'player_down',
    level: 1,
    xp: 0,
    nextLevelXp: 100
  },
  gameMap: [], // Will be initialized in useEffect
  npcs: [
    {
      id: 'npc1',
      name: 'Elder Mystic',
      position: { x: 22, y: 18 },
      dialogue: [
        "Welcome to Mystic Realms, young adventurer...",
        "Our world is in danger...",
        "Speak with the villagers..."
      ],
      quest: {
        id: 'quest1',
        title: 'The Fading Crystals',
        description: 'Find the sacred crystals to restore balance to the realm.',
        completed: false,
        active: false,
        objectives: [],
        relatedQuestItemIds: [],
        npcId: 'npc1',
        xpReward: 100
      },
      sprite: 'elder',
      personality: 'A wise, ancient guardian...',
      // Quiz Data for NPC 1: Variables & print()
      conceptTitle: "Variables & print()",
      conceptExplanation: "Variables store data. `print()` displays output.",
      demoCodeSnippet: 
`message = "Hello, adventurer!"
print(message)`,
      quizProgram:
`level = 1
message = "Current level:"
print(message, level)`,
      correctOutput: "Current level: 1",
      hasPassedQuiz: false
    },
    {
      id: 'npc2',
      name: 'Merchant Ryla',
      position: { x: 28, y: 22 },
      dialogue: [
        "Greetings! I'm Ryla...",
        "I trade in rare artifacts...",
        "Complete quests..."
      ],
      quest: {
        id: 'quest4',
        title: 'The Lost Map Piece',
        description: 'Find the missing piece of the ancient map for Merchant Ryla.',
        completed: false,
        active: false,
        objectives: [
          {
            id: 'q4_obj1',
            description: 'Find the missing map piece',
            type: 'collect',
            targetId: 'questItem5', // Example item ID
            completed: false,
            currentProgress: 0,
            count: 1
          },
          {
            id: 'q4_obj2',
            description: 'Return to Merchant Ryla',
            type: 'interact',
            targetId: 'npc2',
            completed: false
          }
        ],
        relatedQuestItemIds: ['questItem5'],
        npcId: 'npc2',
        xpReward: 150
      },
      sprite: 'merchant',
      personality: 'A cheerful, business-savvy merchant...',
      // Quiz Data for NPC 2: If Statements
      conceptTitle: "If Statements",
      conceptExplanation: "`if` statements run code only if a condition is true.",
      demoCodeSnippet:
`gold = 150
if gold > 100:
  print("You have enough gold!")`,
      quizProgram:
`has_key = False
if has_key:
  print("Door unlocked")
else:
  print("Key needed")`,
      correctOutput: "Key needed",
      hasPassedQuiz: false
    },
    {
      id: 'npc3',
      name: 'Ranger Thorne',
      position: { x: 35, y: 30 },
      dialogue: [
        "Keep your wits about you...",
        "There have been strange creatures...",
        "I can teach you tracking skills..."
      ],
      sprite: 'elder',
      quest: {
        id: 'quest2',
        title: 'Strange Disturbances',
        description: 'Investigate the unusual activity near the eastern ruins with Ranger Thorne.',
        completed: false,
        active: false,
        objectives: [],
        relatedQuestItemIds: [],
        npcId: 'npc3',
        xpReward: 120
      },
      personality: 'A gruff, no-nonsense forest ranger...',
      // Quiz Data for NPC 3: Loops
      conceptTitle: "Loops (for)",
      conceptExplanation: "`for` loops repeat actions for each item in a sequence.",
      demoCodeSnippet:
`for item in ["sword", "shield"]:
  print("Found:", item)`,
      quizProgram:
`count = 0
for i in range(3):
  count = count + 1
print(count)`,
      correctOutput: "3",
      hasPassedQuiz: false
    },
    {
      id: 'npc4',
      name: 'Alchemist Vex',
      position: { x: 15, y: 40 },
      dialogue: [
        "Ah! A visitor! Perfect timing!...",
        "I'm working on a revolutionary potion...",
        "Bring me some firebloom petals..."
      ],
      sprite: 'merchant',
      quest: {
        id: 'quest3',
        title: 'Alchemical Wonders',
        description: 'Collect firebloom petals for Alchemist Vex.',
        completed: false,
        active: false,
        objectives: [],
        relatedQuestItemIds: [],
        npcId: 'npc4',
        xpReward: 130
      },
      personality: 'An eccentric, enthusiastic alchemist...',
      // Quiz Data for NPC 4: Functions
      conceptTitle: "Functions (def)",
      conceptExplanation: "Functions group code to perform a specific task.",
      demoCodeSnippet:
`def greet(name):
  print("Hello,", name)
greet("Hero")`,
      quizProgram:
`def add(a, b):
  return a + b
result = add(5, 3)
print(result)`,
      correctOutput: "8",
      hasPassedQuiz: false
    }
  ],
  inventory: [
    {
      id: 'item1',
      name: 'Healing Potion',
      description: 'Restores health when consumed.',
      type: 'potion',
      value: 10,
      sprite: 'healing_potion'
    }
  ],
  activeQuests: [],
  completedQuests: [],
  questItems: [], // Start with no visible quest items
  hiddenQuestItems: [
    // Quest1 items - Elder Mystic's crystals
    {
      id: 'questItem1',
      name: 'Fading Crystal',
      description: 'A mystical crystal pulsing with faint energy. It needs to be returned to the Elder Mystic.',
      type: 'artifact',
      value: 50,
      sprite: 'crystal_blue',
      position: { x: 30, y: 20 }
    },
    {
      id: 'questItem2',
      name: 'Ancient Crystal',
      description: 'An ancient crystal with mysterious powers. The Elder Mystic needs this.',
      type: 'artifact',
      value: 50,
      sprite: 'crystal_green',
      position: { x: 40, y: 35 }
    },
    // Quest3 items - Alchemist Vex's firebloom petals
    {
      id: 'questItem3_1',
      name: 'Firebloom Petal',
      description: 'A vibrant red petal that radiates heat. Alchemist Vex would be interested in this.',
      type: 'artifact',
      value: 30,
      sprite: 'petals',
      position: { x: 20, y: 45 }
    },
    {
      id: 'questItem3_2',
      name: 'Firebloom Petal',
      description: 'A vibrant red petal that radiates heat. Alchemist Vex would be interested in this.',
      type: 'artifact',
      value: 30,
      sprite: 'petals',
      position: { x: 15, y: 33 }
    },
    {
      id: 'questItem3_3',
      name: 'Firebloom Petal',
      description: 'A vibrant red petal that radiates heat. Alchemist Vex would be interested in this.',
      type: 'artifact',
      value: 30,
      sprite: 'petals',
      position: { x: 33, y: 15 }
    },
    // Quest2 items - Ranger Thorne's footprints
    {
      id: 'questItem4',
      name: 'Strange Footprints',
      description: 'Unusual tracks from an unknown creature. Ranger Thorne should examine these.',
      type: 'artifact',
      value: 0,
      sprite: 'tracks',
      position: { x: 38, y: 32 }
    },
    // Quest4 item - Merchant Ryla's map piece
    {
      id: 'questItem5',
      name: 'Missing Map Piece',
      description: 'A crucial piece of the ancient map. Merchant Ryla needs this.',
      type: 'artifact',
      value: 40,
      sprite: 'map_piece',
      position: { x: 22, y: 35 }
    }
  ],
  activeDialogue: {
    npc: null,
    active: false,
    currentResponseIndex: 0
  },
  uiState: {
    inventoryOpen: false,
    questLogOpen: false,
    showLevelUp: false
  },
  currentConversationHistory: [],
  activeQuiz: {
    npcId: null,
    active: false,
    playerAnswer: ''
  },
  npcToInteractAfterQuiz: null // Initialize as null
};

// Generate a larger game map
const generateGameMap = (width: number, height: number): { map: Tile[][], playerSpawnPosition: Position, npcPositions: { [key: string]: Position } } => {
  const map: Tile[][] = [];
  
  // Initialize map with grass
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      // Create border walls
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        row.push({ terrain: 'wall', walkable: false });
      } else {
        row.push({ terrain: 'grass', walkable: true });
      }
    }
    map.push(row);
  }

  // Generate rivers
  const generateRiver = (startX: number, startY: number, length: number, direction: 'horizontal' | 'vertical') => {
    let x = startX;
    let y = startY;
    
    // Keep track of river tiles to ensure we don't create completely impassable rivers
    const riverTiles: Position[] = [];
    
    for (let i = 0; i < length; i++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        map[y][x] = { terrain: 'water', walkable: false };
        riverTiles.push({ x, y });
        
        // Add some width to the river
        if (direction === 'horizontal') {
          if (y > 0) map[y-1][x] = { terrain: 'water', walkable: false };
          if (y < height-1) map[y+1][x] = { terrain: 'water', walkable: false };
        } else {
          if (x > 0) map[y][x-1] = { terrain: 'water', walkable: false };
          if (x < width-1) map[y][x+1] = { terrain: 'water', walkable: false };
        }
      }
      
      // Move in the river's direction with some randomness
      if (direction === 'horizontal') {
        x += Math.random() < 0.8 ? 1 : -1;
        y += Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0;
      } else {
        y += Math.random() < 0.8 ? 1 : -1;
        x += Math.random() < 0.3 ? (Math.random() < 0.5 ? 1 : -1) : 0;
      }
    }
    
    // Add a bridge at a random point along the river to ensure connectivity
    if (riverTiles.length > 0) {
      const bridgeIndex = Math.floor(Math.random() * riverTiles.length);
      const bridgePos = riverTiles[bridgeIndex];
      map[bridgePos.y][bridgePos.x] = { terrain: 'bridge', walkable: true };
    }
  };

  // Generate multiple rivers
  const numRivers = Math.floor(Math.random() * 3) + 2; // 2-4 rivers
  for (let i = 0; i < numRivers; i++) {
    const startX = Math.floor(Math.random() * (width - 10)) + 5;
    const startY = Math.floor(Math.random() * (height - 10)) + 5;
    const length = Math.floor(Math.random() * 20) + 15;
    const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    generateRiver(startX, startY, length, direction);
  }

  // Add bridges near rivers
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (map[y][x].terrain === 'water') {
        // Check for potential bridge locations
        if (map[y-1][x].terrain === 'grass' && map[y+1][x].terrain === 'grass' && Math.random() < 0.3) {
          map[y][x] = { terrain: 'bridge', walkable: true };
        }
        if (map[y][x-1].terrain === 'grass' && map[y][x+1].terrain === 'grass' && Math.random() < 0.3) {
          map[y][x] = { terrain: 'bridge', walkable: true };
        }
      }
    }
  }

  // Ensure map connectivity by adding bridges at strategic locations
  const ensureMapConnectivity = () => {
    // Find all water tiles that separate grass areas
    const potentialBridgeLocations: Position[] = [];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (map[y][x].terrain === 'water') {
          // Check if this water tile separates two grass areas
          const hasGrassOnBothSides = 
            (map[y-1][x].terrain === 'grass' && map[y+1][x].terrain === 'grass') ||
            (map[y][x-1].terrain === 'grass' && map[y][x+1].terrain === 'grass');
            
          if (hasGrassOnBothSides) {
            potentialBridgeLocations.push({ x, y });
          }
        }
      }
    }
    
    // Sort bridge locations by distance from center (prioritize bridges near the center)
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    
    potentialBridgeLocations.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.x - centerX, 2) + Math.pow(a.y - centerY, 2));
      const distB = Math.sqrt(Math.pow(b.x - centerX, 2) + Math.pow(b.y - centerY, 2));
      return distA - distB;
    });
    
    // Add bridges at strategic locations to ensure connectivity
    // We'll add at least 3 bridges to ensure the map is connected
    const numBridgesToAdd = Math.max(3, Math.floor(potentialBridgeLocations.length * 0.2));
    
    for (let i = 0; i < numBridgesToAdd && i < potentialBridgeLocations.length; i++) {
      const pos = potentialBridgeLocations[i];
      map[pos.y][pos.x] = { terrain: 'bridge', walkable: true };
    }
  };
  
  // Call the function to ensure map connectivity
  ensureMapConnectivity();

  // Add trees with some clustering
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (map[y][x].terrain === 'grass' && Math.random() < 0.1) {
        // Create a small cluster of trees
        const clusterSize = Math.floor(Math.random() * 3) + 1;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (Math.random() < 0.5 && 
                x + dx > 0 && x + dx < width - 1 && 
                y + dy > 0 && y + dy < height - 1) {
              if (map[y + dy][x + dx].terrain === 'grass') {
                map[y + dy][x + dx] = { terrain: 'tree', walkable: false };
              }
            }
          }
        }
      }
    }
  }

  // Add paths connecting different areas
  const generatePath = (startX: number, startY: number, endX: number, endY: number) => {
    let x = startX;
    let y = startY;
    
    while (x !== endX || y !== endY) {
      if (map[y][x].terrain === 'grass') {
        map[y][x] = { terrain: 'path', walkable: true };
      }
      
      if (Math.random() < 0.5) {
        x += x < endX ? 1 : -1;
      } else {
        y += y < endY ? 1 : -1;
      }
    }
  };

  // Generate some random paths
  const numPaths = Math.floor(Math.random() * 3) + 2;
  for (let i = 0; i < numPaths; i++) {
    const startX = Math.floor(Math.random() * (width - 2)) + 1;
    const startY = Math.floor(Math.random() * (height - 2)) + 1;
    const endX = Math.floor(Math.random() * (width - 2)) + 1;
    const endY = Math.floor(Math.random() * (height - 2)) + 1;
    generatePath(startX, startY, endX, endY);
  }

  // Function to check if a position is a valid spawn location
  const isValidSpawnLocation = (x: number, y: number): boolean => {
    // Check if the position itself is walkable
    if (!map[y][x].walkable) return false;
    
    // Check if at least one adjacent tile is walkable
    const adjacentPositions = [
      { x: x, y: y - 1 }, // up
      { x: x, y: y + 1 }, // down
      { x: x - 1, y: y }, // left
      { x: x + 1, y: y }  // right
    ];
    
    // Count walkable adjacent tiles
    const walkableAdjacentCount = adjacentPositions.filter(pos => {
      // Check if the position is within bounds
      if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) {
        return false;
      }
      return map[pos.y][pos.x].walkable;
    }).length;
    
    // Return true if at least one adjacent tile is walkable
    return walkableAdjacentCount > 0;
  };

  // Find a valid spawn location for the player
  const findValidSpawnLocation = (): Position => {
    // Try the default position first
    const defaultX = 25;
    const defaultY = 25;
    
    if (isValidSpawnLocation(defaultX, defaultY)) {
      return { x: defaultX, y: defaultY };
    }
    
    // If default position is not valid, try random positions
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      const x = Math.floor(Math.random() * (width - 2)) + 1;
      const y = Math.floor(Math.random() * (height - 2)) + 1;
      
      if (isValidSpawnLocation(x, y)) {
        return { x, y };
      }
      
      attempts++;
    }
    
    // If we couldn't find a valid position after many attempts,
    // create one by ensuring the default position and its surroundings are walkable
    map[defaultY][defaultX] = { terrain: 'path', walkable: true };
    map[defaultY-1][defaultX] = { terrain: 'path', walkable: true };
    
    return { x: defaultX, y: defaultY };
  };

  // Find a valid spawn location for the player
  const playerSpawnPosition = findValidSpawnLocation();
  
  // Ensure the player starting position is walkable
  map[playerSpawnPosition.y][playerSpawnPosition.x] = { terrain: 'path', walkable: true };
  
  // Find valid spawn locations for NPCs
  const npcPositions: { [key: string]: Position } = {};
  
  // Function to find a valid spawn location for an NPC
  const findValidNPCLocation = (excludePositions: Position[]): Position => {
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loops
    
    while (attempts < maxAttempts) {
      const x = Math.floor(Math.random() * (width - 2)) + 1;
      const y = Math.floor(Math.random() * (height - 2)) + 1;
      
      // Check if this position is already taken by another NPC or the player
      const isPositionTaken = excludePositions.some(pos => pos.x === x && pos.y === y);
      if (isPositionTaken) {
        attempts++;
        continue;
      }
      
      // Check if the position itself is valid
      if (!isValidSpawnLocation(x, y)) {
        attempts++;
        continue;
      }
      
      // Check if the 3x3 area around the position is suitable for path tiles
      let suitableArea = true;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const checkX = x + dx;
          const checkY = y + dy;
          
          // Check if the position is within bounds
          if (checkX <= 0 || checkX >= width - 1 || checkY <= 0 || checkY >= height - 1) {
            suitableArea = false;
            break;
          }
          
          // Check if the tile is walkable or grass (can be converted to path)
          // Don't place NPCs near important map features like rivers
          if (map[checkY][checkX].terrain !== 'grass' && !map[checkY][checkX].walkable) {
            suitableArea = false;
            break;
          }
        }
        
        if (!suitableArea) break;
      }
      
      if (suitableArea) {
        return { x, y };
      }
      
      attempts++;
    }
    
    // If we couldn't find a valid position, create one
    const x = Math.floor(Math.random() * (width - 2)) + 1;
    const y = Math.floor(Math.random() * (height - 2)) + 1;
    
    // Create a 3x3 path area
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const createX = x + dx;
        const createY = y + dy;
        
        // Check if the position is within bounds
        if (createX > 0 && createX < width - 1 && createY > 0 && createY < height - 1) {
          map[createY][createX] = { terrain: 'path', walkable: true };
        }
      }
    }
    
    return { x, y };
  };
  
  // Find valid positions for each NPC
  const usedPositions: Position[] = [playerSpawnPosition];
  
  // Function to create a 3x3 path tile layout around an NPC
  const createNPCPathLayout = (npcPosition: Position): void => {
    // Create a 3x3 grid of path tiles centered on the NPC
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = npcPosition.x + dx;
        const y = npcPosition.y + dy;
        
        // Check if the position is within bounds
        if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
          // Only place path tiles on walkable or empty tiles (grass)
          // Don't overwrite important objects like rivers or trees
          if (map[y][x].terrain === 'grass' || map[y][x].walkable) {
            map[y][x] = { terrain: 'path', walkable: true };
          }
        }
      }
    }
  };
  
  initialState.npcs.forEach(npc => {
    const npcPosition = findValidNPCLocation(usedPositions);
    npcPositions[npc.id] = npcPosition;
    usedPositions.push(npcPosition);
    
    // Ensure the NPC position is walkable
    map[npcPosition.y][npcPosition.x] = { terrain: 'path', walkable: true };
    
    // Create a 3x3 path tile layout around the NPC
    createNPCPathLayout(npcPosition);
  });

  return { map, playerSpawnPosition, npcPositions };
};

// Create context
type GameContextType = {
  gameState: GameState;
  // movePlayer: (direction: 'up' | 'down' | 'left' | 'right') => void; // Removed
  interactWithNPC: (npcId: string) => void;
  continueDialogue: () => void;
  endDialogue: () => void;
  toggleInventory: () => void;
  toggleQuestLog: () => void;
  acceptQuest: (questId: string) => void;
  processVoiceCommand: (command: string) => void;
  startVoiceRecognition: () => void;
  stopVoiceRecognition: () => void;
  isListening: boolean;
  sendPlayerMessage: (message: string) => void;
  checkForQuestProgress: () => void;
  interactWithItem: () => void;
  submitQuizAnswer: (answer: string) => void;
  closeQuiz: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Game state
  const [gameState, setGameState] = useState<GameState>(getInitialGameState());
  const [heldKeys, setHeldKeys] = useState<Set<string>>(new Set());
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isWebviewEnvironment, setIsWebviewEnvironment] = useState<boolean>(false);
  const { toast } = useToast();

  // Animation frame reference
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  // Check if we're in a Webview environment on mount
  useEffect(() => {
    // The Python script sets window.isRunningInWebview when in Webview
    const runningInWebview = isRunningInWebview();
    
    if (runningInWebview) {
      console.log("Detected Python Webview environment");
      setIsWebviewEnvironment(true);
      
      // Register callback for Python speech recognition
      registerPythonSpeechCallback((text: string) => {
        if (text) {
          console.log("Received text from Python speech recognition:", text);
          toast({
            title: "Voice command received",
            description: text,
            duration: 2000,
          });
          processVoiceCommand(text);
        }
      });
    }
  }, []);

  // ... existing code ...

  // Remove the duplicate detection code that was added at the end of the file
  
  // ... existing code ...

  return (
    <GameContext.Provider value={{
      gameState,
      // movePlayer, // Removed: Replaced by game loop logic
      interactWithNPC,
      continueDialogue,
      endDialogue,
      toggleInventory,
      toggleQuestLog,
      acceptQuest,
      processVoiceCommand,
      startVoiceRecognition,
      stopVoiceRecognition,
      isListening,
      sendPlayerMessage,
      checkForQuestProgress,
      interactWithItem,
      submitQuizAnswer,
      closeQuiz
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
