import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { PythonQuiz, getRandomQuizForTopic, getDynamicQuizForTopic, pythonQuizBank } from '../../data/pythonQuizzes'; // Import quiz functions
import AudioManager from '../../utils/AudioManager';
import { useAuth } from '../../contexts/AuthContext';
import { saveGame, loadGame, saveToLocalStorage, loadFromLocalStorage, getMapFromSave, GameSaveData } from '../../lib/saveManager';

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
  quizTopic: keyof typeof pythonQuizBank; // The topic for this NPC's quizzes
  hasPassedQuiz: boolean;
  completedQuizzes: string[]; // Track completed quiz IDs to prevent repeats
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
    showTutorial: boolean; // Whether to show tutorial for first-time players
    ascendQuestOpen: boolean;
  };
  currentConversationHistory: string[];
  // Quiz state
  activeQuiz: {
    npcId: string | null;
    active: boolean;
    playerAnswer: string;
    currentQuiz: PythonQuiz | null; // Store the current random quiz
  };
  // New state to trigger interaction after quiz
  npcToInteractAfterQuiz: string | null;
  // New state for delayed NPC interactions
  pendingNpcInteraction: {
    npcId: string | null;
    timeoutId: number | null;
  };
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
      quizTopic: 'variables', // Map to quiz topic
      hasPassedQuiz: false,
      completedQuizzes: [] // Track completed quiz IDs
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
      quizTopic: 'if_statements', // Map to quiz topic
      hasPassedQuiz: false,
      completedQuizzes: [] // Track completed quiz IDs
    },
    {
      id: 'npc3',
      name: 'Ranger Thorne',
      position: { x: 35, y: 30 },
      dialogue: [
        "Dangerous beasts have been attacking travelers...",
        "A Shadow Wolf lurks in the northern woods...",
        "And a massive Stone Bear has claimed the southern caves...",
        "I need someone skilled to hunt them down..."
      ],
      sprite: 'elder',
      quest: {
        id: 'quest2',
        title: 'Beast Hunt',
        description: 'Help Ranger Thorne track and deal with two dangerous beasts that have been terrorizing travelers.',
        completed: false,
        active: false,
        objectives: [],
        relatedQuestItemIds: [],
        npcId: 'npc3',
        xpReward: 150
      },
      personality: 'A gruff, no-nonsense forest ranger...',
      // Quiz Data for NPC 3: Loops
      conceptTitle: "Loops (for)",
      conceptExplanation: "`for` loops repeat actions for each item in a sequence.",
      demoCodeSnippet:
        `for item in ["sword", "shield"]:
  print("Found:", item)`,
      quizTopic: 'loops', // Map to quiz topic
      hasPassedQuiz: false,
      completedQuizzes: [] // Track completed quiz IDs
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
      quizTopic: 'functions', // Map to quiz topic
      hasPassedQuiz: false,
      completedQuizzes: [] // Track completed quiz IDs
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
    // Quest2 items - Ranger Thorne's beast hunt
    {
      id: 'questItem4_1',
      name: 'Shadow Wolf Fang',
      description: 'A dark fang from the Shadow Wolf. Proof of your victory over this elusive predator.',
      type: 'artifact',
      value: 75,
      sprite: 'fang',
      position: { x: 42, y: 28 }
    },
    {
      id: 'questItem4_2',
      name: 'Stone Bear Claw',
      description: 'A massive claw from the Stone Bear. Evidence of defeating this powerful creature.',
      type: 'artifact',
      value: 85,
      sprite: 'claw',
      position: { x: 35, y: 45 }
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
    showLevelUp: false,
    showTutorial: true, // Show tutorial for first-time players by default
    ascendQuestOpen: false
  },
  currentConversationHistory: [],
  activeQuiz: {
    npcId: null,
    active: false,
    playerAnswer: '',
    currentQuiz: null
  },
  npcToInteractAfterQuiz: null, // Initialize as null
  pendingNpcInteraction: {
    npcId: null,
    timeoutId: null
  }
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
          if (y > 0) map[y - 1][x] = { terrain: 'water', walkable: false };
          if (y < height - 1) map[y + 1][x] = { terrain: 'water', walkable: false };
        } else {
          if (x > 0) map[y][x - 1] = { terrain: 'water', walkable: false };
          if (x < width - 1) map[y][x + 1] = { terrain: 'water', walkable: false };
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
        if (map[y - 1][x].terrain === 'grass' && map[y + 1][x].terrain === 'grass' && Math.random() < 0.3) {
          map[y][x] = { terrain: 'bridge', walkable: true };
        }
        if (map[y][x - 1].terrain === 'grass' && map[y][x + 1].terrain === 'grass' && Math.random() < 0.3) {
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
            (map[y - 1][x].terrain === 'grass' && map[y + 1][x].terrain === 'grass') ||
            (map[y][x - 1].terrain === 'grass' && map[y][x + 1].terrain === 'grass');

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
    map[defaultY - 1][defaultX] = { terrain: 'path', walkable: true };

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

// Add these utility functions before the GameContext definition

// Function to get advanced quests for NPCs based on level
const getAdvancedQuestForNpc = (npcId: string, playerLevel: number): Quest | undefined => {
  // Create advanced quests based on NPC and player level
  switch (npcId) {
    case 'npc1': // Elder Mystic
      return {
        id: `quest1_level${playerLevel}`,
        title: `The Fading Crystals ${playerLevel > 2 ? 'II' : ''}`,
        description: 'Continue your quest to restore balance to the realm with more powerful crystals.',
        completed: false,
        active: false,
        objectives: [],
        relatedQuestItemIds: [],
        npcId: 'npc1',
        xpReward: 100 + (playerLevel * 50)
      };
    case 'npc2': // Merchant Ryla
      return {
        id: `quest4_level${playerLevel}`,
        title: `The Lost Map ${playerLevel > 2 ? 'Fragments' : 'Piece'}`,
        description: 'Find the missing pieces of the ancient map to unlock new areas.',
        completed: false,
        active: false,
        objectives: [],
        relatedQuestItemIds: [],
        npcId: 'npc2',
        xpReward: 150 + (playerLevel * 40)
      };
    case 'npc3': // Ranger Thorne
      return {
        id: `quest2_level${playerLevel}`,
        title: `Beast Hunt ${playerLevel > 2 ? 'Advanced' : ''}`,
        description: 'Continue helping Ranger Thorne with more dangerous beasts in the wilderness.',
        completed: false,
        active: false,
        objectives: [],
        relatedQuestItemIds: [],
        npcId: 'npc3',
        xpReward: 120 + (playerLevel * 45)
      };
    case 'npc4': // Alchemist Vex
      return {
        id: `quest3_level${playerLevel}`,
        title: `Alchemical Wonders ${playerLevel > 2 ? 'Advanced' : ''}`,
        description: 'Collect rare ingredients for an even more powerful potion.',
        completed: false,
        active: false,
        objectives: [],
        relatedQuestItemIds: [],
        npcId: 'npc4',
        xpReward: 130 + (playerLevel * 50)
      };
    default:
      // Return undefined if no quest is found
      return undefined;
  }
};

// Function to get advanced quiz topics for NPCs based on level
const getAdvancedQuizTopicForNpc = (npcId: string, playerLevel: number): keyof typeof pythonQuizBank => {
  // All levels currently use the same topics since we only have the basic ones available
  // We rotate the topics for variety in higher levels
  if (playerLevel <= 1) {
    // Initial topic assignments
    switch (npcId) {
      case 'npc1': return 'variables';
      case 'npc2': return 'if_statements';
      case 'npc3': return 'loops';
      case 'npc4': return 'functions';
      default: return 'variables';
    }
  } else if (playerLevel === 2) {
    // Level 2 rotates topics
    switch (npcId) {
      case 'npc1': return 'if_statements'; // Was variables
      case 'npc2': return 'loops';         // Was if_statements
      case 'npc3': return 'functions';     // Was loops
      case 'npc4': return 'variables';     // Was functions
      default: return 'if_statements';
    }
  } else {
    // Level 3+ rotates topics again
    switch (npcId) {
      case 'npc1': return 'loops';         // Was if_statements
      case 'npc2': return 'functions';     // Was loops
      case 'npc3': return 'variables';     // Was functions
      case 'npc4': return 'if_statements'; // Was variables
      default: return 'loops';
    }
  }
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
  toggleTutorial: () => void; // Add a function to toggle the tutorial visibility
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
  simulateKeyPress: (key: string) => void;
  simulateKeyRelease: (key: string) => void;
  manualSave: (slotName?: string, displayName?: string) => Promise<void>; // Manual save function
  loadSaveSlot: (slotName: string) => Promise<void>; // Load specific save slot
};

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: React.ReactNode;
  initialLoadSlot?: string; // Optional slot to load on mount
}

export const GameProvider: React.FC<GameProviderProps> = ({ children, initialLoadSlot }) => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState>(() => {
    // Initialize game state
    return initialState;
  });

  const [isListening, setIsListening] = useState(false);
  const [gameLoaded, setGameLoaded] = useState(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>(gameState); // Ref to always have latest state
  
  // Keep the ref up to date
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Function to create NPCs with their positions
  const createNPCs = (npcPositions: { [key: string]: Position }): NPC[] => {
    return initialState.npcs.map(npc => ({
      ...npc,
      position: npcPositions[npc.id]
    }));
  };

  // Initialize game map and positions on first render
  useEffect(() => {
    const initializeGame = async () => {
      console.log('[GameInit] Starting game initialization...');
      console.log('[GameInit] User:', user?.uid);
      console.log('[GameInit] Initial load slot:', initialLoadSlot);
      
      // Determine which slot to load
      const slotToLoad = initialLoadSlot || 'autosave';
      
      let map: any[][] = [];
      let playerSpawnPosition = { x: 25, y: 25 };
      let npcPositions: { [key: string]: Position } = {};
      let savedGame: GameSaveData | null = null;
      let isFirstTimePlayer = true;

      // Try to load saved game for authenticated user
      if (user) {
        try {
          console.log('[GameInit] Attempting to load slot:', slotToLoad, 'for user:', user.uid);
          savedGame = await loadGame(user.uid, slotToLoad);
          
          if (savedGame && savedGame.mapData) {
            // Load map from save
            console.log('[GameInit] ✅ Found saved game with map data');
            map = getMapFromSave(savedGame);
            npcPositions = savedGame.npcPositions || {};
            playerSpawnPosition = savedGame.game?.player?.position || { x: 25, y: 25 };
            isFirstTimePlayer = false;
            
            console.log('[GameInit] Loaded map size:', map.length, 'x', map[0]?.length);
            console.log('[GameInit] Player position:', playerSpawnPosition);
            
            toast({
              title: "Game Loaded",
              description: `Welcome back! Level ${savedGame.game?.player?.level || 1} loaded from "${savedGame.displayName || slotToLoad}".`,
              duration: 3000,
            });
          } else {
            console.log('[GameInit] No save found or no map data, generating new map');
          }
        } catch (error) {
          console.error('[GameInit] Failed to load game:', error);
          toast({
            title: "Load Failed",
            description: "Starting a new game instead.",
            duration: 3000,
          });
        }
      }

      // Generate new map if no saved map exists (first time player)
      if (map.length === 0) {
        console.log('[GameInit] Generating new map for first-time player');
        const generated = generateGameMap(50, 50);
        map = generated.map;
        playerSpawnPosition = generated.playerSpawnPosition;
        npcPositions = generated.npcPositions;
        isFirstTimePlayer = true;
      }

      // Create NPCs with positions (from save or generated)
      const npcs = initialState.npcs.map(npc => ({
        ...npc,
        position: npcPositions[npc.id] || { x: 25, y: 25 },
      }));

      // Apply saved game state or fresh state
      if (savedGame && savedGame.game && !isFirstTimePlayer) {
        const loadedState = savedGame.game;
        console.log('[GameInit] Applying saved game state...');
        
        setGameState(prev => ({
          ...prev,
          gameMap: map,
          player: {
            ...prev.player,
            position: { x: playerSpawnPosition.x, y: playerSpawnPosition.y },
            targetPosition: { x: playerSpawnPosition.x, y: playerSpawnPosition.y },
            visualPosition: { x: playerSpawnPosition.x, y: playerSpawnPosition.y },
            isMoving: false,
            direction: loadedState.player?.direction || 'down',
            level: loadedState.player?.level || 1,
            xp: loadedState.player?.xp || 0,
            nextLevelXp: loadedState.player?.nextLevelXp || 100,
            sprite: loadedState.player?.sprite || 'player_down',
          },
          inventory: loadedState.inventory || [],
          activeQuests: loadedState.activeQuests || [],
          completedQuests: loadedState.completedQuests || [],
          questItems: loadedState.questItems || prev.questItems,
          hiddenQuestItems: loadedState.hiddenQuestItems || prev.hiddenQuestItems,
          npcs: npcs.map(npc => {
            const savedNpc = loadedState.npcs?.find((n: any) => n.id === npc.id);
            return savedNpc ? { ...npc, hasPassedQuiz: savedNpc.hasPassedQuiz, completedQuizzes: savedNpc.completedQuizzes || [] } : npc;
          }),
          uiState: {
            ...prev.uiState,
            showTutorial: loadedState.uiState?.showTutorial ?? false,
          },
        }));
      } else {
        console.log('[GameInit] Starting fresh game');
        // Fresh game initialization
        setGameState(prev => ({
          ...prev,
          gameMap: map,
          player: {
            ...prev.player,
            position: playerSpawnPosition,
            targetPosition: playerSpawnPosition,
            visualPosition: playerSpawnPosition,
          },
          npcs
        }));
        
        // For first-time players, save immediately to store the map
        if (user && isFirstTimePlayer) {
          console.log('[GameInit] First time player - saving initial state with map');
          // We need to wait for state to update, so we save in a timeout
          setTimeout(async () => {
            try {
              const stateToSave = {
                ...initialState,
                gameMap: map,
                player: {
                  ...initialState.player,
                  position: playerSpawnPosition,
                  targetPosition: playerSpawnPosition,
                  visualPosition: playerSpawnPosition,
                },
                npcs
              };
              await saveGame(user.uid, stateToSave, 'autosave');
              console.log('[GameInit] Initial game state saved');
            } catch (error) {
              console.error('[GameInit] Failed to save initial state:', error);
            }
          }, 1000);
        }
      }

      setGameLoaded(true);
      console.log('[GameInit] Game initialization complete');
      // Verify and fix quest item positions
      verifyQuestItemPositions();
    };

    initializeGame();
  }, [user, initialLoadSlot]);

  // Function to verify and fix quest item positions
  const verifyQuestItemPositions = () => {
    setGameState(prev => {
      let fixedItemsCount = 0;

      // First, fix any hidden quest items with invalid positions
      const fixedHiddenItems = prev.hiddenQuestItems.map(item => {
        const { x, y } = item.position;

        // Check if position is valid (walkable and not surrounded by obstacles)
        const isPositionValid =
          x >= 0 &&
          y >= 0 &&
          x < prev.gameMap[0]?.length &&
          y < prev.gameMap.length &&
          prev.gameMap[y][x].walkable &&
          hasAccessibleSide({ x, y });

        if (!isPositionValid) {
          // Find a new valid position
          const newPosition = findValidPositionForQuestItem(prev.gameMap);
          console.log(`Fixed hidden quest item ${item.id} position from (${x},${y}) to (${newPosition.x},${newPosition.y})`);
          fixedItemsCount++;

          return {
            ...item,
            position: newPosition
          };
        }

        return item;
      });

      // Then fix any visible quest items with invalid positions
      const fixedVisibleItems = prev.questItems.map(item => {
        const { x, y } = item.position;

        // Check if position is valid (walkable and not surrounded by obstacles)
        const isPositionValid =
          x >= 0 &&
          y >= 0 &&
          x < prev.gameMap[0]?.length &&
          y < prev.gameMap.length &&
          prev.gameMap[y][x].walkable &&
          hasAccessibleSide({ x, y });

        if (!isPositionValid) {
          // Find a new valid position
          const newPosition = findValidPositionForQuestItem(prev.gameMap);
          console.log(`Fixed visible quest item ${item.id} position from (${x},${y}) to (${newPosition.x},${newPosition.y})`);
          fixedItemsCount++;

          return {
            ...item,
            position: newPosition
          };
        }

        return item;
      });

      // Show a notification if any items were fixed
      if (fixedItemsCount > 0) {
        toast({
          title: "Quest Items Repositioned",
          description: `${fixedItemsCount} quest items were moved to valid locations.`,
          duration: 3000,
        });
      }

      return {
        ...prev,
        hiddenQuestItems: fixedHiddenItems,
        questItems: fixedVisibleItems
      };
    });
  };

  // Autosave effect - debounced save on state changes
  useEffect(() => {
    if (!gameLoaded || !gameState.gameMap.length) {
      console.log('[Autosave] Skipping - game not loaded yet');
      return;
    }

    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    console.log('[Autosave] State change detected, scheduling save...');

    // Debounce: wait 5 seconds after last state change before saving
    autosaveTimerRef.current = setTimeout(async () => {
      const now = Date.now();
      const minSaveInterval = 10000; // Minimum 10 seconds between saves

      // Check if enough time has passed since last save
      if (now - lastSaveTimeRef.current < minSaveInterval) {
        console.log('[Autosave] Skipping - too soon since last save');
        return;
      }

      lastSaveTimeRef.current = now;
      const currentState = gameStateRef.current; // Use ref for latest state

      try {
        if (user) {
          console.log('[Autosave] Saving to Firebase for user:', user.uid);
          // Save to Firebase
          await saveGame(user.uid, currentState, 'autosave');
          console.log('[Autosave] ✅ Saved to cloud successfully');
          toast({
            title: "Game Saved",
            description: "Your progress has been saved to the cloud.",
            duration: 2000,
          });
        } else {
          console.log('[Autosave] No user, saving to localStorage');
          // Save to localStorage as fallback
          saveToLocalStorage(currentState, 'local_autosave');
          console.log('[Autosave] ✅ Saved locally');
        }
      } catch (error: any) {
        console.error('[Autosave] ❌ Failed:', error);
        // Try localStorage as fallback
        saveToLocalStorage(currentState, 'local_autosave');
        toast({
          title: "Cloud Save Failed",
          description: "Saved locally instead. Check console for details.",
          duration: 3000,
        });
      }
    }, 5000); // 5 second debounce

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    gameState.player.position.x,
    gameState.player.position.y,
    gameState.player.level,
    gameState.player.xp,
    gameState.inventory.length,
    gameState.activeQuests.length,
    gameState.completedQuests.length,
    gameLoaded,
    user
  ]);

  // Save on window close/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        // Synchronous save to localStorage
        saveToLocalStorage(gameState, 'local_autosave');
      } catch (error) {
        console.error('Failed to save on unload:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  const [heldKeys, setHeldKeys] = useState<Set<string>>(new Set()); // Track held movement keys

  // Reference for the game loop
  const gameLoopRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0); // Track last move time
  const moveCooldown = 150; // Milliseconds between tile moves
  const lastFrameTimeRef = useRef<number>(0); // For delta time calculation
  const animationSpeed = 8; // Controls how fast the visual position catches up to actual position 

  // Utility function to calculate XP needed for a level
  const calculateXpForLevel = (level: number): number => {
    // Basic formula: each level requires 50 more XP than the previous one
    return 100 + (level - 1) * 50;
  };

  // Function to handle level up, supporting multiple level-ups
  const handleLevelUp = useCallback((currentLevel: number, newXp: number): { newLevel: number, finalXp: number, nextLevelXpThreshold: number } => {
    let level = currentLevel;
    let xp = newXp;
    let changed = false;
    let nextLevelXpThreshold = calculateXpForLevel(level);

    // Calculate all level-ups at once
    const levelUps: number[] = []; // Store all new levels gained

    while (true) {
      nextLevelXpThreshold = calculateXpForLevel(level); // Recalculate for the current level check

      if (xp >= nextLevelXpThreshold) {
        // Level up
        level++;
        changed = true;

        // Save this level for animation
        levelUps.push(level);

        // Calculate overflow XP
        xp = xp - nextLevelXpThreshold;

        // Show toast notification
        toast({
          title: "Level Up!",
          description: `You've reached level ${level}!`,
          duration: 5000,
        });
      } else {
        // No more level ups possible
        break;
      }
    }

    // Calculate the threshold for the *next* level after potential level-ups
    const finalNextLevelXpThreshold = calculateXpForLevel(level);

    // If the player didn't level up but XP changed, just update the XP
    if (!changed && xp !== newXp) {
      setGameState(prev => ({
        ...prev,
        player: {
          ...prev.player,
          xp: xp
        }
      }));
    }
    // If player did level up, handle animations sequentially
    else if (changed) {
      // First, update to the new final level and XP values immediately
      setGameState(prev => ({
        ...prev,
        player: {
          ...prev.player,
          level: level,
          xp: xp,
          nextLevelXp: finalNextLevelXpThreshold
        }
      }));

      // Then trigger level-up animations one at a time with delays
      const triggerLevelUpAnimations = () => {
        // Process each level-up animation sequentially
        levelUps.forEach((newLevel, index) => {
          // Stagger animations with a delay between each
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              uiState: {
                ...prev.uiState,
                showLevelUp: true
              }
            }));

            // Hide animation after it plays
            setTimeout(() => {
              setGameState(prev => ({
                ...prev,
                uiState: {
                  ...prev.uiState,
                  showLevelUp: false
                }
              }));
            }, 3000); // Animation duration
          }, index * 3500); // Start next animation 3.5s after previous one starts
        });
      };

      // Start the animation sequence
      triggerLevelUpAnimations();
    }

    // Return the final values
    return { newLevel: level, finalXp: xp, nextLevelXpThreshold: finalNextLevelXpThreshold };
  }, [toast, setGameState]);

  // NPC-specific voice profiles
  const npcVoiceProfiles: Record<string, { voiceNameIncludes?: string[]; rate?: number; pitch?: number; volume?: number; }> = {
    npc1: { voiceNameIncludes: ['Daniel', 'Google UK English Male', 'Google UK English'], rate: 0.85, pitch: 0.85 }, // Elder Mystic
    npc2: { voiceNameIncludes: ['Samantha', 'Google US English Female', 'Google US English'], rate: 1.0, pitch: 1.1 }, // Merchant Ryla
    npc3: { voiceNameIncludes: ['Google UK English Female', 'Serena', 'Google UK English'], rate: 0.95, pitch: 0.75 }, // Ranger Thorne
    npc4: { voiceNameIncludes: ['Victoria', 'Google US English', 'Google US English Female'], rate: 1.05, pitch: 1.3 } // Alchemist Vex
  };
  // Speech queue management to prevent overlapping voices
  const speechQueueRef = useRef<{ text: string; npc?: NPC | null; flush?: boolean }[]>([]);
  const isSpeakingRef = useRef(false);

  type SpeakOptions = { flush?: boolean };

  const processSpeechQueue = useCallback(() => {
    if (isSpeakingRef.current) return; // Already speaking
    const next = speechQueueRef.current.shift();
    if (!next) return;
    const { text, npc } = next;
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // Defaults
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (npc) {
      const profile = npcVoiceProfiles[npc.id];
      if (profile) {
        if (profile.rate !== undefined) utterance.rate = profile.rate;
        if (profile.pitch !== undefined) utterance.pitch = profile.pitch;
        if (profile.volume !== undefined) utterance.volume = profile.volume;
      }
    }
    const assignVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return false;
      let selected: SpeechSynthesisVoice | undefined;
      if (npc) {
        const profile = npcVoiceProfiles[npc.id];
        if (profile?.voiceNameIncludes) {
          selected = voices.find(v => profile.voiceNameIncludes!.some(sn => v.name.includes(sn)));
        }
      }
      if (!selected) {
        selected = voices.find(v => /Google UK English Male/i.test(v.name)) || voices.find(v => /Google US English/i.test(v.name)) || voices[0];
      }
      if (selected) utterance.voice = selected;
      return true;
    };
    const safeSpeak = () => {
      isSpeakingRef.current = true;
      utterance.onend = () => { isSpeakingRef.current = false; processSpeechQueue(); };
      utterance.onerror = () => { isSpeakingRef.current = false; processSpeechQueue(); };
      window.speechSynthesis.speak(utterance);
    };
    if (!assignVoice()) {
      window.speechSynthesis.onvoiceschanged = () => {
        assignVoice();
        safeSpeak();
        window.speechSynthesis.onvoiceschanged = null as any;
      };
    } else {
      safeSpeak();
    }
  }, []);

  // Public speak function (adds to queue). If flush, cancel current & clear queue first.
  const speakText = useCallback((text: string, npc?: NPC | null, options?: SpeakOptions) => {
    const flush = options?.flush;
    if (!('speechSynthesis' in window)) return;
    if (flush) {
      window.speechSynthesis.cancel();
      speechQueueRef.current = []; // Clear queued
      isSpeakingRef.current = false;
    }
    speechQueueRef.current.push({ text, npc, flush });
    // Try processing (in case nothing is speaking)
    processSpeechQueue();
  }, [processSpeechQueue]);

  // Check for NPC interaction based on player position
  useEffect(() => {
    const { position } = gameState.player;
    const nearbyNPC = gameState.npcs.find(npc =>
      Math.abs(npc.position.x - position.x) <= 1 &&
      Math.abs(npc.position.y - position.y) <= 1
    );

    if (nearbyNPC && !gameState.activeDialogue.active) {
      toast({
        title: `${nearbyNPC.name} is nearby!`,
        description: "Press E or say 'Talk' to interact",
        duration: 3000,
      });
    }
  }, [gameState.player, gameState.npcs, gameState.activeDialogue.active]);

  // Fallback to static dialogue if AI fails
  const fallbackToStaticDialogue = useCallback((npc: NPC) => {
    if (npc.dialogue.length > 0) {
      const firstLine = npc.dialogue[0];
      speakText(firstLine, npc, { flush: true });

      setGameState(prev => ({
        ...prev,
        activeDialogue: {
          npc: {
            ...npc,
            dialogue: [firstLine]
          },
          active: true,
          currentResponseIndex: 0
        },
        currentConversationHistory: [...prev.currentConversationHistory, `${npc.name}: ${firstLine}`]
      }));
    }
  }, [speakText]);

  // Generate AI greeting when starting conversation
  const sendAIGreeting = useCallback(async (npc: NPC) => {
    try {
      // Prepare context-aware greeting prompt
      const prompt = `
You are ${npc.name} in the game "Mystic Realms", a fantasy RPG. 
${npc.personality || "You are a friendly and helpful NPC."}

Game context:
- You are greeting the player for the first time in this conversation
- You should introduce yourself briefly and hint at your role or quest
- Stay in character and match your personality description
- Keep your greeting concise (1-2 sentences max)

${npc.quest ? `You have a quest called "${npc.quest.title}" that you want to tell the player about: ${npc.quest.description}` : ""}

Respond as ${npc.name} would in character, with a brief, welcoming greeting.
      `;

      // Define response schema for structured output
      const responseSchema = {
        type: "object",
        properties: {
          response: {
            type: "string",
            description: "The NPC's greeting"
          }
        },
        required: ["response"]
      };

      // Prepare payload for Gemini API
      const payload = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: responseSchema
        }
      };

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      let aiGreeting = "";

      try {
        // Extract the AI response from the JSON structure
        if (data.candidates &&
          data.candidates[0]?.content?.parts &&
          data.candidates[0].content.parts[0]?.functionResponse?.response) {
          aiGreeting = data.candidates[0].content.parts[0].functionResponse.response;
        } else if (data.candidates &&
          data.candidates[0]?.content?.parts &&
          data.candidates[0].content.parts[0]?.text) {
          // Parse the text if it's in JSON format
          const textContent = data.candidates[0].content.parts[0].text;
          try {
            const jsonResponse = JSON.parse(textContent);
            if (jsonResponse.response) {
              aiGreeting = jsonResponse.response;
            }
          } catch (e) {
            // If not valid JSON, use the text directly if it's not too long
            if (textContent.length < 200) {
              aiGreeting = textContent;
            }
          }
        }
      } catch (e) {
        console.error("Error parsing AI greeting:", e);
      }

      if (aiGreeting) {
        // Speak the AI greeting
        speakText(aiGreeting, npc, { flush: true });

        // Update the NPC dialogue with the AI greeting
        setGameState(prev => {
          const updatedNpcs = prev.npcs.map(n => {
            if (n.id === npc.id) {
              return {
                ...n,
                dialogue: [aiGreeting, ...n.dialogue] // Add as first dialogue entry
              };
            }
            return n;
          });

          return {
            ...prev,
            npcs: updatedNpcs,
            activeDialogue: {
              ...prev.activeDialogue,
              npc: {
                ...prev.activeDialogue.npc!,
                dialogue: [aiGreeting]
              }
            },
            currentConversationHistory: [...prev.currentConversationHistory, `${npc.name}: ${aiGreeting}`]
          };
        });
      } else {
        // Fallback to first dialogue line if AI fails
        fallbackToStaticDialogue(npc);
      }
    } catch (error) {
      console.error("Error generating AI greeting:", error);
      fallbackToStaticDialogue(npc);
    }
  }, [speakText, fallbackToStaticDialogue]);

  // Utility function to check proximity (for quests and items)
  const isInProximity = (pos1: Position, pos2: Position, radius: number = 1): boolean => {
    return Math.abs(pos1.x - pos2.x) <= radius && Math.abs(pos1.y - pos2.y) <= radius;
  };

  // Function to check for quest progress and update objectives
  const checkForQuestProgress = useCallback(() => {
    setGameState(prev => {
      const { player, activeQuests, questItems, npcs } = prev;
      if (activeQuests.length === 0) return prev; // No active quests to check

      let questUpdated = false;
      let updatedQuests = [...activeQuests];
      let updatedQuestItems = [...questItems];
      let updatedInventory = [...prev.inventory];
      const updatedCompletedQuests = [...prev.completedQuests];

      // Check each active quest
      updatedQuests = updatedQuests.map(quest => {
        if (quest.completed) return quest;

        // Copy the quest to modify its objectives
        const updatedQuest = { ...quest };
        let questObjectivesCompleted = true;

        // Check each objective in the quest
        updatedQuest.objectives = quest.objectives.map(objective => {
          // Skip already completed objectives
          if (objective.completed) return objective;

          switch (objective.type) {
            case 'location':
              // Check if player is at the required location
              if (objective.targetPosition &&
                isInProximity(player.position, objective.targetPosition, 2)) {

                toast({
                  title: "Quest Update",
                  description: `Objective completed: ${objective.description}`,
                  duration: 3000,
                });

                questUpdated = true;
                return { ...objective, completed: true };
              }
              break;

            case 'collect':
              // Special case for firebloom petals in the Alchemist quest
              if (quest.id === 'quest3' && objective.id === 'q3_obj1') {
                // Check if player is near any firebloom petal
                const targetItem = questItems.find(item =>
                  item.name === 'Firebloom Petal' &&
                  isInProximity(player.position, item.position, 1)
                );

                if (targetItem) {
                  // Increase progress count and check if complete
                  const newProgress = (objective.currentProgress || 0) + 1;
                  const isComplete = newProgress >= (objective.count || 1);

                  // Remove the item from the world
                  updatedQuestItems = updatedQuestItems.filter(item => item.id !== targetItem.id);

                  // Add the item to player inventory
                  const inventoryItem: Item = {
                    ...targetItem,
                    position: undefined // Remove position from inventory items
                  };
                  updatedInventory.push(inventoryItem);

                  toast({
                    title: "Item Collected",
                    description: `You found: ${targetItem.name}`,
                    duration: 3000,
                  });

                  if (isComplete) {
                    toast({
                      title: "Quest Update",
                      description: `Objective completed: ${objective.description}`,
                      duration: 3000,
                    });
                  } else {
                    toast({
                      title: "Quest Update",
                      description: `Progress: ${newProgress}/${objective.count}`,
                      duration: 3000,
                    });
                  }

                  questUpdated = true;
                  return {
                    ...objective,
                    currentProgress: newProgress,
                    completed: isComplete
                  };
                }
              } else {
                // Default behavior for other collect objectives
                const targetItem = questItems.find(item =>
                  item.id === objective.targetId &&
                  isInProximity(player.position, item.position, 1)
                );

                if (targetItem) {
                  // Increase progress count and check if complete
                  const newProgress = (objective.currentProgress || 0) + 1;
                  const isComplete = newProgress >= (objective.count || 1);

                  // Remove the item from the world
                  updatedQuestItems = updatedQuestItems.filter(item => item.id !== targetItem.id);

                  // Add the item to player inventory
                  const inventoryItem: Item = {
                    ...targetItem,
                    position: undefined // Remove position from inventory items
                  };
                  updatedInventory.push(inventoryItem);

                  toast({
                    title: "Item Collected",
                    description: `You found: ${targetItem.name}`,
                    duration: 3000,
                  });

                  if (isComplete) {
                    toast({
                      title: "Quest Update",
                      description: `Objective completed: ${objective.description}`,
                      duration: 3000,
                    });
                  } else {
                    toast({
                      title: "Quest Update",
                      description: `Progress: ${newProgress}/${objective.count}`,
                      duration: 3000,
                    });
                  }

                  questUpdated = true;
                  return {
                    ...objective,
                    currentProgress: newProgress,
                    completed: isComplete
                  };
                }
              }
              break;

            case 'interact':
              // Check if player is interacting with the target NPC
              if (prev.activeDialogue.active && prev.activeDialogue.npc) {
                const npc = prev.activeDialogue.npc;
                if (objective.targetId === npc.id) {
                  // Only complete if all other objectives are done
                  const otherObjectivesComplete = quest.objectives
                    .filter(obj => obj.id !== objective.id)
                    .every(obj => obj.completed);

                  if (otherObjectivesComplete) {
                    toast({
                      title: "Quest Update",
                      description: `Objective completed: ${objective.description}`,
                      duration: 3000,
                    });

                    questUpdated = true;
                    return { ...objective, completed: true };
                  }
                }
              }
              break;
          }

          // If we get here, the objective is not completed
          questObjectivesCompleted = false;
          return objective;
        });

        // Check if all objectives are completed
        if (questObjectivesCompleted && !quest.completed) {
          updatedQuest.completed = true;

          // Find the NPC who gave the quest
          const questNPC = npcs.find(npc => npc.id === quest.npcId);

          toast({
            title: "Quest Completed!",
            description: `${quest.title} has been completed.`,
            duration: 5000,
          });

          // Play completion sound and set up delayed dialogue (8 seconds)
          AudioManager.getInstance().playNextQuestCompletionTrack(() => {
            // After 8 seconds, this callback will be executed
            // Find the current NPC from the latest state to ensure we have the latest data
            setGameState(latestState => {
              const npcForDelayedDialogue = latestState.npcs.find(n => n.id === quest.npcId);
              const latestCompletedQuest = latestState.completedQuests.find(q => q.id === quest.id);

              if (npcForDelayedDialogue && latestCompletedQuest) {
                // Return updated state to activate dialogue without sending greeting
                return {
                  ...latestState,
                  activeDialogue: {
                    npc: npcForDelayedDialogue,
                    active: true,
                    currentResponseIndex: 0
                  },
                  currentConversationHistory: []
                };
              }
              return latestState;
            });
          });

          // Move to completed quests
          updatedQuests = updatedQuests.filter(q => q.id !== quest.id);
          updatedCompletedQuests.push(quest);

          // Add reward if applicable
          if (quest.reward) {
            updatedInventory.push(quest.reward);
          }

          // Remove related quest items from inventory
          if (quest.relatedQuestItemIds.length > 0) {
            updatedInventory = updatedInventory.filter(item =>
              !quest.relatedQuestItemIds.includes(item.id)
            );
          }

          // Award XP for the quest
          const questXp = quest.xpReward || 0;
          const totalXp = player.xp + questXp;

          // Handle level ups from quest XP
          const levelUpResult = handleLevelUp(player.level, totalXp);

          // Update player state with new level and XP
          player.level = levelUpResult.newLevel;
          player.xp = levelUpResult.finalXp;
          player.nextLevelXp = levelUpResult.nextLevelXpThreshold;

          // Show XP gained notification
          toast({
            title: "Experience Gained",
            description: `+${questXp} XP`,
            duration: 3000,
          });

          // Update UI state for level up
          if (levelUpResult.newLevel > player.level) {
            gameState.uiState.showLevelUp = true;
          }
        }

        return updatedQuest;
      });

      // Move completed quests to the completedQuests array
      const stillActiveQuests = updatedQuests.filter(q => !q.completed);
      const newCompletedQuests = [
        ...prev.completedQuests,
        ...updatedQuests.filter(q => q.completed)
      ];

      // Only update state if something changed
      if (questUpdated) {
        return {
          ...prev,
          activeQuests: stillActiveQuests,
          completedQuests: newCompletedQuests,
          questItems: updatedQuestItems,
          inventory: updatedInventory
        };
      }

      return prev;
    });
  }, [gameState.npcs, gameState.questItems, gameState.hiddenQuestItems, gameState.activeQuests,
    sendAIGreeting, toast, handleLevelUp]);

  // Function to check if a position is walkable
  const isTileWalkable = (position: Position): boolean => {
    const { x, y } = position;
    // Check bounds
    if (x < 0 || y < 0 || x >= gameState.gameMap[0]?.length || y >= gameState.gameMap.length) {
      return false;
    }
    // Check if the tile is walkable
    return gameState.gameMap[y][x].walkable;
  };

  // Function to check if a position has at least one accessible side
  const hasAccessibleSide = (position: Position): boolean => {
    const { x, y } = position;

    // Check if the position itself is walkable
    if (!isTileWalkable(position)) return false;

    // Check if at least one adjacent tile is walkable
    // We need to check all four directions: up, right, down, left
    const adjacentPositions = [
      { x, y: y - 1 }, // Up
      { x: x + 1, y }, // Right
      { x, y: y + 1 }, // Down
      { x: x - 1, y }  // Left
    ];

    // Return true if at least one adjacent tile is walkable
    return adjacentPositions.some(pos => isTileWalkable(pos));
  };

  // Function to find a valid position for a quest item
  const findValidQuestItemPosition = (maxAttempts: number = 30): Position => {
    // Get map dimensions
    const width = gameState.gameMap[0]?.length || 50;
    const height = gameState.gameMap.length || 50;

    let attempts = 0;
    while (attempts < maxAttempts) {
      // Generate random coordinates (avoid edges)
      const x = Math.floor(Math.random() * (width - 4)) + 2;
      const y = Math.floor(Math.random() * (height - 4)) + 2;

      // Check if the position is walkable and has at least one accessible side
      if (isTileWalkable({ x, y }) && hasAccessibleSide({ x, y })) {
        return { x, y };
      }

      attempts++;
    }

    // Fallback to a reasonable position if no valid position found
    // Try to find a position in the center area that meets our criteria
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (isTileWalkable({ x, y }) && hasAccessibleSide({ x, y })) {
          return { x, y };
        }
      }
    }

    return { x: centerX, y: centerY };
  };

  // Function to reveal quest items when a quest is activated
  const revealQuestItems = (questId: string, relatedItemIds: string[]) => {
    setGameState(prev => {
      // Find the hidden items related to this quest
      const itemsToReveal = prev.hiddenQuestItems.filter(item =>
        relatedItemIds.includes(item.id)
      ).map(item => {
        // Check if the item's position is walkable and accessible
        const { x, y } = item.position;

        // Verify position is within map bounds, walkable, and has at least one accessible side
        const isPositionValid =
          x >= 0 &&
          y >= 0 &&
          x < prev.gameMap[0]?.length &&
          y < prev.gameMap.length &&
          prev.gameMap[y][x].walkable &&
          hasAccessibleSide({ x, y });

        if (!isPositionValid) {
          // Find a new valid position for the item
          let newPosition: Position;
          const width = prev.gameMap[0]?.length || 50;
          const height = prev.gameMap.length || 50;

          // Try to find a valid position with multiple attempts
          let attempts = 0;
          const maxAttempts = 30;
          let foundValidPosition = false;

          while (attempts < maxAttempts && !foundValidPosition) {
            // Generate random coordinates (avoid edges)
            const newX = Math.floor(Math.random() * (width - 4)) + 2;
            const newY = Math.floor(Math.random() * (height - 4)) + 2;

            // Check if the position is valid (in bounds, walkable, and accessible)
            if (newX >= 0 &&
              newY >= 0 &&
              newX < width &&
              newY < height &&
              prev.gameMap[newY][newX].walkable &&
              hasAccessibleSide({ x: newX, y: newY })) {
              newPosition = { x: newX, y: newY };
              foundValidPosition = true;
              break;
            }

            attempts++;
          }

          // If we couldn't find a valid position, try the center area
          if (!foundValidPosition) {
            const centerX = Math.floor(width / 2);
            const centerY = Math.floor(height / 2);

            // Check a 11x11 area around the center
            for (let dy = -5; dy <= 5 && !foundValidPosition; dy++) {
              for (let dx = -5; dx <= 5 && !foundValidPosition; dx++) {
                const checkX = centerX + dx;
                const checkY = centerY + dy;

                if (checkX >= 0 &&
                  checkY >= 0 &&
                  checkX < width &&
                  checkY < height &&
                  prev.gameMap[checkY][checkX].walkable &&
                  hasAccessibleSide({ x: checkX, y: checkY })) {
                  newPosition = { x: checkX, y: checkY };
                  foundValidPosition = true;
                  break;
                }
              }
            }
          }

          // Last resort fallback - use the player position + offset
          if (!foundValidPosition) {
            // Try positions around the player until we find one that works
            const playerX = prev.player.position.x;
            const playerY = prev.player.position.y;

            for (let dy = -2; dy <= 2 && !foundValidPosition; dy++) {
              for (let dx = -2; dx <= 2 && !foundValidPosition; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip player's exact position

                const checkX = Math.min(width - 2, Math.max(1, playerX + dx));
                const checkY = Math.min(height - 2, Math.max(1, playerY + dy));

                if (checkX >= 0 &&
                  checkY >= 0 &&
                  checkX < width &&
                  checkY < height &&
                  prev.gameMap[checkY][checkX].walkable &&
                  hasAccessibleSide({ x: checkX, y: checkY })) {
                  newPosition = { x: checkX, y: checkY };
                  foundValidPosition = true;
                  break;
                }
              }
            }

            // If still no valid position, use a position next to player even if not ideal
            if (!foundValidPosition) {
              newPosition = {
                x: Math.min(width - 2, Math.max(1, prev.player.position.x + 1)),
                y: Math.min(height - 2, Math.max(1, prev.player.position.y + 1))
              };
              console.warn(`Could not find optimal position for quest item ${item.id}, using fallback position`);
            }
          }

          console.log(`Repositioning quest item ${item.id} from (${item.position.x},${item.position.y}) to (${newPosition.x},${newPosition.y})`);

          // Return a new item with the updated position
          return {
            ...item,
            position: newPosition
          };
        }

        return item;
      });

      if (itemsToReveal.length === 0) return prev; // No items to reveal

      // Move items from hidden to visible
      return {
        ...prev,
        questItems: [...prev.questItems, ...itemsToReveal],
        hiddenQuestItems: prev.hiddenQuestItems.filter(item =>
          !relatedItemIds.includes(item.id)
        )
      };
    });
  };

  // Helper function to find a valid position for a quest item
  const findValidPositionForQuestItem = (gameMap: Tile[][]): Position => {
    const width = gameMap[0]?.length || 50;
    const height = gameMap.length || 50;

    // Helper function to check if a position has at least one accessible side
    const hasAccessibleSide = (x: number, y: number): boolean => {
      // Check if the position itself is walkable
      if (x < 0 || y < 0 || x >= width || y >= height || !gameMap[y][x].walkable) return false;

      // Check if at least one adjacent tile is walkable
      const adjacentPositions = [
        { x, y: y - 1 }, // Up
        { x: x + 1, y }, // Right
        { x, y: y + 1 }, // Down
        { x: x - 1, y }  // Left
      ];

      return adjacentPositions.some(pos => {
        const { x: adjX, y: adjY } = pos;
        return adjX >= 0 && adjY >= 0 && adjX < width && adjY < height && gameMap[adjY][adjX].walkable;
      });
    };

    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      // Generate random coordinates (avoid edges)
      const x = Math.floor(Math.random() * (width - 4)) + 2;
      const y = Math.floor(Math.random() * (height - 4)) + 2;

      // Check if the tile is walkable and has at least one accessible side
      if (x >= 0 && y >= 0 && x < width && y < height && gameMap[y][x].walkable && hasAccessibleSide(x, y)) {
        return { x, y };
      }

      attempts++;
    }

    // Fallback to a reasonable position
    // Check the center position and nearby tiles until a walkable one is found
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && y >= 0 && x < width && y < height && gameMap[y][x].walkable && hasAccessibleSide(x, y)) {
          return { x, y };
        }
      }
    }

    // Last resort fallback
    return { x: centerX, y: centerY };
  };

  // Function to interact with nearby NPCs
  const interactWithNPC = useCallback((npcId: string) => {
    const targetNpc = gameState.npcs.find(n => n.id === npcId);
    if (!targetNpc) return;

    // Check if the NPC's quiz has been passed
    if (!targetNpc.hasPassedQuiz) {
      // Get a dynamic quiz for this NPC's topic (excluding completed ones)
      const dynamicQuiz = getDynamicQuizForTopic(targetNpc.quizTopic, targetNpc.completedQuizzes);

      if (!dynamicQuiz) {
        console.error('No quiz available for NPC', npcId);
        return;
      }

      // Activate the quiz for this NPC with the dynamic quiz data
      setGameState(prev => ({
        ...prev,
        activeQuiz: {
          npcId,
          active: true,
          playerAnswer: '',
          currentQuiz: dynamicQuiz
        }
      }));

      toast({
        title: "Python Quiz",
        description: `Answer correctly to unlock interaction with ${targetNpc.name}`,
        duration: 3000,
      });

      return;
    }

    // Continue with normal NPC interaction if quiz is passed
    setGameState(prev => {
      const npc = prev.npcs.find(n => n.id === npcId);
      if (!npc) return prev;

      let updatedActiveQuests = [...prev.activeQuests];
      const updatedCompletedQuests = [...prev.completedQuests];
      let updatedInventory = [...prev.inventory];
      let questTurnedIn = false;
      let questReward: Item | null = null;
      let newQuestAccepted = false;
      let newQuestItemIds: string[] = [];
      let completedQuestTitle = "";
      let completedQuest: Quest | null = null;

      // Track player level and XP
      let playerLevel = prev.player.level;
      let playerXp = prev.player.xp;
      let playerNextLevelXp = prev.player.nextLevelXp;
      let playerLeveledUp = false;

      // First check if this NPC is involved in any active quest completion
      updatedActiveQuests.forEach(quest => {
        if (quest.npcId === npcId) {
          // Check if this is the final "return to NPC" objective
          const finalObjective = quest.objectives.find(obj =>
            obj.type === 'interact' && obj.targetId === npcId
          );

          if (finalObjective && !finalObjective.completed) {
            // Check if all other objectives are completed
            const otherObjectivesComplete = quest.objectives
              .filter(obj => obj.id !== finalObjective.id)
              .every(obj => obj.completed);

            if (otherObjectivesComplete) {
              // All objectives are complete, mark this quest for completion
              quest.objectives = quest.objectives.map(obj => ({
                ...obj,
                completed: true
              }));
              quest.completed = true;
              questTurnedIn = true;
              completedQuestTitle = quest.title;
              completedQuest = quest;

              // Play completion sound and set up delayed dialogue (8 seconds)
              AudioManager.getInstance().playNextQuestCompletionTrack(() => {
                // After 8 seconds, this callback will be executed
                // Find the current NPC from the latest state to ensure we have the latest data
                setGameState(latestState => {
                  const npcForDelayedDialogue = latestState.npcs.find(n => n.id === npcId);
                  const latestCompletedQuest = latestState.completedQuests.find(q => q.id === quest.id);

                  if (npcForDelayedDialogue && latestCompletedQuest) {
                    // Return updated state to activate dialogue without sending greeting
                    return {
                      ...latestState,
                      activeDialogue: {
                        npc: npcForDelayedDialogue,
                        active: true,
                        currentResponseIndex: 0
                      },
                      currentConversationHistory: []
                    };
                  }
                  return latestState;
                });
              });

              // Move to completed quests
              updatedActiveQuests = updatedActiveQuests.filter(q => q.id !== quest.id);
              updatedCompletedQuests.push(quest);

              // Add reward if applicable
              if (quest.reward) {
                questReward = quest.reward;
                updatedInventory.push(quest.reward);
              }

              // Remove related quest items from inventory
              if (quest.relatedQuestItemIds.length > 0) {
                updatedInventory = updatedInventory.filter(item =>
                  !quest.relatedQuestItemIds.includes(item.id)
                );
              }

              // Award XP for the quest
              const questXp = quest.xpReward || 0;
              const totalXp = playerXp + questXp;

              // Handle level ups from quest XP
              const levelUpResult = handleLevelUp(playerLevel, totalXp);

              // Update tracking variables based on level-up results
              playerLevel = levelUpResult.newLevel;
              playerXp = levelUpResult.finalXp; // Use the final XP from the result
              playerNextLevelXp = levelUpResult.nextLevelXpThreshold; // Use the correct next threshold

              // Check if a level up actually occurred
              if (levelUpResult.newLevel > prev.player.level) {
                playerLeveledUp = true;
              }

              // Show XP gained notification
              toast({
                title: "Experience Gained",
                description: `+${questXp} XP`,
                duration: 3000,
              });
            }
          }
        }
      });

      // If player just completed a quest with this NPC, set a delayed interaction
      // but don't start dialogue immediately
      if (questTurnedIn) {
        toast({
          title: "Quest Completed!",
          description: questReward
            ? `You received: ${questReward.name}`
            : "Thanks for your help!",
          duration: 5000,
        });

        // Set up a delayed interaction with this NPC
        const timeoutId = window.setTimeout(() => {
          // After 8 seconds, trigger the NPC dialogue
          setGameState(latestState => {
            // Check the current NPC in the delayed interaction to ensure it's still valid
            if (latestState.pendingNpcInteraction.npcId === npcId) {
              // Get the current state of the NPC
              const currentNpc = latestState.npcs.find(n => n.id === npcId);
              if (!currentNpc) return latestState; // Safety check

              // Update the state to start dialogue
              return {
                ...latestState,
                activeDialogue: {
                  npc: currentNpc,
                  active: true,
                  currentResponseIndex: 0
                },
                currentConversationHistory: [], // Reset conversation history
                pendingNpcInteraction: { npcId: null, timeoutId: null } // Clear the pending interaction
              };
            }
            return latestState;
          });

          // No longer finding NPC for a second dialogue
        }, 8000); // 8 second delay

        // Return updated state with pending interaction
        const updatedState = {
          ...prev,
          player: {
            ...prev.player,
            level: playerLevel,
            xp: playerXp,
            nextLevelXp: playerNextLevelXp
          },
          activeQuests: updatedActiveQuests,
          completedQuests: updatedCompletedQuests,
          inventory: updatedInventory,
          uiState: {
            ...prev.uiState,
            showLevelUp: playerLeveledUp
          },
          pendingNpcInteraction: {
            npcId,
            timeoutId
          }
        };

        // If a new quest was accepted, reveal its quest items
        if (newQuestAccepted && newQuestItemIds.length > 0) {
          // Find the hidden items related to this quest
          const itemsToReveal = prev.hiddenQuestItems.filter(item =>
            newQuestItemIds.includes(item.id)
          );

          if (itemsToReveal.length > 0) {
            // Move items from hidden to visible
            return {
              ...updatedState,
              questItems: [...prev.questItems, ...itemsToReveal],
              hiddenQuestItems: prev.hiddenQuestItems.filter(item =>
                !newQuestItemIds.includes(item.id)
              )
            };
          }
        }

        return updatedState;
      }

      // If NPC has a new quest and it's not already active or completed
      if (npc.quest &&
        !prev.activeQuests.some(q => q.id === npc.quest?.id) &&
        !prev.completedQuests.some(q => q.id === npc.quest?.id)) {

        // Create enhanced quest with objectives based on the NPC's quest type
        const enhancedQuest = enhanceQuestWithObjectives(npc.quest, npc.id, prev.questItems);

        // Add the enhanced quest to active quests
        updatedActiveQuests = [...updatedActiveQuests, enhancedQuest];

        // Mark that a new quest was accepted, and which items should be revealed
        newQuestAccepted = true;
        newQuestItemIds = enhancedQuest.relatedQuestItemIds;

        // Show quest activation notification
        toast({
          title: `New Quest: ${enhancedQuest.title}`,
          description: enhancedQuest.description,
          duration: 5000,
        });
      }

      // For normal (non-quest-completion) interactions, proceed with dialogue immediately
      if (!questTurnedIn) {
        // Set the AI response loading state
        const npcWithLoading = {
          ...npc,
          dialogue: ["..."]  // Start with an empty loading state
        };

        const updatedState = {
          ...prev,
          player: {
            ...prev.player,
            level: playerLevel,
            xp: playerXp,
            nextLevelXp: playerNextLevelXp
          },
          activeDialogue: {
            npc: npcWithLoading,
            active: true,
            currentResponseIndex: 0
          },
          activeQuests: updatedActiveQuests,
          completedQuests: updatedCompletedQuests,
          inventory: updatedInventory,
          currentConversationHistory: [], // Reset conversation history
          uiState: {
            ...prev.uiState,
            showLevelUp: playerLeveledUp
          }
        };

        // Generate AI response immediately for normal interactions
        setTimeout(() => {
          sendAIGreeting(npc);
        }, 0);

        // If a new quest was accepted, reveal its quest items
        if (newQuestAccepted) {
          // Find the hidden items related to this quest
          const itemsToReveal = prev.hiddenQuestItems.filter(item =>
            newQuestItemIds.includes(item.id)
          );

          if (itemsToReveal.length > 0) {
            // Move items from hidden to visible
            return {
              ...updatedState,
              questItems: [...prev.questItems, ...itemsToReveal],
              hiddenQuestItems: prev.hiddenQuestItems.filter(item =>
                !newQuestItemIds.includes(item.id)
              )
            };
          }
        }

        return updatedState;
      }

      return prev;
    });

  }, [gameState.npcs, gameState.questItems, gameState.hiddenQuestItems, gameState.activeQuests,
    sendAIGreeting, toast, handleLevelUp]);

  // Generate AI quest completion greeting
  const sendQuestCompletionGreeting = useCallback(async (npc: NPC, quest: Quest) => {
    try {
      // Add an 8 second delay before the NPC speaks
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Prepare context-aware quest completion prompt
      const prompt = `
You are ${npc.name} in the game "Mystic Realms", a fantasy RPG. 
${npc.personality || "You are a friendly and helpful NPC."}

Game context:
- The player has just completed the quest "${quest.title}"
- You should express gratitude and satisfaction with their work
- Mention the impact of their actions on the world
- If there's a reward, mention it briefly
- Stay in character and match your personality description
- Keep your response concise (2-3 sentences max)

Respond as ${npc.name} would in character, with a brief, grateful acknowledgment of the completed quest.
      `;

      // Define response schema for structured output
      const responseSchema = {
        type: "object",
        properties: {
          response: {
            type: "string",
            description: "The NPC's quest completion greeting"
          }
        },
        required: ["response"]
      };

      // Prepare payload for Gemini API
      const payload = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: responseSchema
        }
      };

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      let aiGreeting = "";

      try {
        // Extract the AI response from the JSON structure
        if (data.candidates &&
          data.candidates[0]?.content?.parts &&
          data.candidates[0].content.parts[0]?.functionResponse?.response) {
          aiGreeting = data.candidates[0].content.parts[0].functionResponse.response;
        } else if (data.candidates &&
          data.candidates[0]?.content?.parts &&
          data.candidates[0].content.parts[0]?.text) {
          // Parse the text if it's in JSON format
          const textContent = data.candidates[0].content.parts[0].text;
          try {
            const jsonResponse = JSON.parse(textContent);
            if (jsonResponse.response) {
              aiGreeting = jsonResponse.response;
            }
          } catch (e) {
            // If not valid JSON, use the text directly if it's not too long
            if (textContent.length < 200) {
              aiGreeting = textContent;
            }
          }
        }
      } catch (e) {
        console.error("Error parsing AI quest completion greeting:", e);
      }

      if (aiGreeting) {
        // Speak the AI greeting
        speakText(aiGreeting, npc, { flush: true });

        // Update the NPC dialogue with the AI greeting
        setGameState(prev => {
          const updatedNpcs = prev.npcs.map(n => {
            if (n.id === npc.id) {
              return {
                ...n,
                dialogue: [aiGreeting, ...n.dialogue] // Add as first dialogue entry
              };
            }
            return n;
          });

          return {
            ...prev,
            npcs: updatedNpcs,
            activeDialogue: {
              ...prev.activeDialogue,
              npc: {
                ...prev.activeDialogue.npc!,
                dialogue: [aiGreeting]
              }
            },
            currentConversationHistory: [...prev.currentConversationHistory, `${npc.name}: ${aiGreeting}`]
          };
        });
      } else {
        // Fallback to a generic quest completion message
        const fallbackMessage = `Thank you for completing the quest "${quest.title}"! Your help has made a real difference.`;
        speakText(fallbackMessage, npc, { flush: true });

        setGameState(prev => {
          const updatedNpcs = prev.npcs.map(n => {
            if (n.id === npc.id) {
              return {
                ...n,
                dialogue: [fallbackMessage, ...n.dialogue]
              };
            }
            return n;
          });

          return {
            ...prev,
            npcs: updatedNpcs,
            activeDialogue: {
              ...prev.activeDialogue,
              npc: {
                ...prev.activeDialogue.npc!,
                dialogue: [fallbackMessage]
              }
            },
            currentConversationHistory: [...prev.currentConversationHistory, `${npc.name}: ${fallbackMessage}`]
          };
        });
      }
    } catch (error) {
      console.error("Error generating AI quest completion greeting:", error);

      // Fallback to a generic quest completion message
      const fallbackMessage = `Thank you for completing the quest "${quest.title}"! Your help has made a real difference.`;
      speakText(fallbackMessage, npc, { flush: true });

      setGameState(prev => {
        const updatedNpcs = prev.npcs.map(n => {
          if (n.id === npc.id) {
            return {
              ...n,
              dialogue: [fallbackMessage, ...n.dialogue]
            };
          }
          return n;
        });

        return {
          ...prev,
          npcs: updatedNpcs,
          activeDialogue: {
            ...prev.activeDialogue,
            npc: {
              ...prev.activeDialogue.npc!,
              dialogue: [fallbackMessage]
            }
          },
          currentConversationHistory: [...prev.currentConversationHistory, `${npc.name}: ${fallbackMessage}`]
        };
      });
    }
  }, [speakText]);

  // Enhance a basic quest with objectives based on the quest type and NPC
  const enhanceQuestWithObjectives = (quest: Quest, npcId: string, questItems: QuestItem[]): Quest => {
    // Start with a copy of the quest
    const enhancedQuest: Quest = {
      ...quest,
      active: true,
      objectives: [],
      relatedQuestItemIds: [],
      npcId
    };

    // Generate objectives based on quest ID
    switch (quest.id) {
      case 'quest1': // The Fading Crystals (Elder Mystic)
        // Objectives: Find the two crystals and return them to the Elder
        enhancedQuest.objectives = [
          {
            id: 'q1_obj1',
            description: 'Find the Fading Crystal',
            type: 'collect',
            targetId: 'questItem1', // Blue crystal
            completed: false,
            currentProgress: 0,
            count: 1
          },
          {
            id: 'q1_obj2',
            description: 'Find the Ancient Crystal',
            type: 'collect',
            targetId: 'questItem2', // Green crystal
            completed: false,
            currentProgress: 0,
            count: 1
          },
          {
            id: 'q1_obj3',
            description: 'Return to the Elder Mystic',
            type: 'interact',
            targetId: 'npc1',
            completed: false
          }
        ];
        // Items that should appear in the world for this quest
        enhancedQuest.relatedQuestItemIds = ['questItem1', 'questItem2'];
        break;

      case 'quest2': // Beast Hunt (Ranger Thorne)
        // Objectives: Hunt the Shadow Wolf and Stone Bear, collect their trophies
        enhancedQuest.objectives = [
          {
            id: 'q2_obj1',
            description: 'Defeat the Shadow Wolf and collect its fang',
            type: 'collect',
            targetId: 'questItem4_1', // Shadow Wolf Fang
            completed: false,
            currentProgress: 0,
            count: 1
          },
          {
            id: 'q2_obj2',
            description: 'Defeat the Stone Bear and collect its claw',
            type: 'collect',
            targetId: 'questItem4_2', // Stone Bear Claw
            completed: false,
            currentProgress: 0,
            count: 1
          },
          {
            id: 'q2_obj3',
            description: 'Return to Ranger Thorne with the trophies',
            type: 'interact',
            targetId: 'npc3',
            completed: false
          }
        ];
        // Items that should appear in the world for this quest
        enhancedQuest.relatedQuestItemIds = ['questItem4_1', 'questItem4_2'];
        break;

      case 'quest3': // Alchemical Wonders (Alchemist Vex)
        // Objectives: Collect 3 firebloom petals and return to Vex
        enhancedQuest.objectives = [
          {
            id: 'q3_obj1',
            description: 'Collect firebloom petals',
            type: 'collect',
            targetId: 'questItem3_1', // We use any petal ID, but match by name
            completed: false,
            currentProgress: 0,
            count: 3
          },
          {
            id: 'q3_obj2',
            description: 'Return to Alchemist Vex',
            type: 'interact',
            targetId: 'npc4',
            completed: false
          }
        ];
        // Items that should appear in the world for this quest (all three petals)
        enhancedQuest.relatedQuestItemIds = ['questItem3_1', 'questItem3_2', 'questItem3_3'];
        break;

      case 'quest4': // The Lost Map Piece (Merchant Ryla)
        // Objectives: Find the map piece and return to Ryla
        enhancedQuest.objectives = [
          {
            id: 'q4_obj1',
            description: 'Find the missing map piece',
            type: 'collect',
            targetId: 'questItem5', // The map piece item
            completed: false,
            currentProgress: 0,
            count: 1
          },
          {
            id: 'q4_obj2',
            description: 'Return to Merchant Ryla',
            type: 'interact',
            targetId: 'npc2', // Ryla's ID
            completed: false
          }
        ];
        // Item that should appear in the world for this quest
        enhancedQuest.relatedQuestItemIds = ['questItem5'];
        break;

      default:
        // Generic quest structure if we don't have a specific template
        enhancedQuest.objectives = [
          {
            id: `${quest.id}_obj1`,
            description: `Complete ${quest.title}`,
            type: 'interact',
            targetId: npcId,
            completed: false
          }
        ];
    }

    return enhancedQuest;
  };

  // Function to update player position based on held keys
  const updatePlayerPosition = useCallback(() => {
    setGameState(prev => {
      // Don't allow movement during dialogue, quiz, or level up animation (if implemented)
      if (prev.activeDialogue.active || prev.activeQuiz.active /* || prev.uiState.isLevelUpAnimationActive */) {
        // Ensure isMoving is false if blocked
        if (prev.player.isMoving) {
          return { ...prev, player: { ...prev.player, isMoving: false } };
        }
        return prev;
      }

      const currentTime = performance.now();
      let dx = 0;
      let dy = 0;
      let newDirection = prev.player.direction;
      let isTryingToMove = false;

      // Determine movement direction based on held keys
      if (heldKeys.has('w') || heldKeys.has('arrowup')) {
        dy = -1; // Move one tile up
        newDirection = 'up';
        isTryingToMove = true;
      } else if (heldKeys.has('s') || heldKeys.has('arrowdown')) {
        dy = 1; // Move one tile down
        newDirection = 'down';
        isTryingToMove = true;
      } else if (heldKeys.has('a') || heldKeys.has('arrowleft')) {
        dx = -1; // Move one tile left
        newDirection = 'left';
        isTryingToMove = true;
      } else if (heldKeys.has('d') || heldKeys.has('arrowright')) {
        dx = 1; // Move one tile right
        newDirection = 'right';
        isTryingToMove = true;
      }

      // If no movement keys are held
      if (!isTryingToMove) {
        if (prev.player.isMoving) {
          return { ...prev, player: { ...prev.player, isMoving: false } };
        }
        return prev; // No changes needed
      }

      // Calculate potential new grid position (only move one tile)
      const potentialNewX = prev.player.position.x + dx;
      const potentialNewY = prev.player.position.y + dy;

      // Check bounds and walkability
      const canMove =
        potentialNewX >= 0 && potentialNewX < (prev.gameMap[0]?.length || 0) &&
        potentialNewY >= 0 && potentialNewY < prev.gameMap.length &&
        prev.gameMap[potentialNewY][potentialNewX].walkable;

      if (canMove) {
        // Check for collision with NPCs
        const npcCollision = prev.npcs.some(npc =>
          npc.position.x === potentialNewX && npc.position.y === potentialNewY
        );

        if (!npcCollision) {
          // Check cooldown
          if (currentTime - lastMoveTimeRef.current >= moveCooldown) {
            // Valid move and cooldown passed: Update position and reset cooldown timer
            lastMoveTimeRef.current = currentTime;
            return {
              ...prev,
              player: {
                ...prev.player,
                position: { x: potentialNewX, y: potentialNewY },
                targetPosition: { x: potentialNewX, y: potentialNewY }, // Update target position 
                isMoving: true, // Start/continue moving animation
                direction: newDirection,
                sprite: `player_${newDirection}`
              }
            };
          } else {
            // Valid move but cooldown active: Keep moving state, update direction
            return {
              ...prev,
              player: {
                ...prev.player,
                isMoving: true, // Keep showing moving sprite/animation
                direction: newDirection,
                sprite: `player_${newDirection}`
              }
            };
          }
        }
      }

      // If move is invalid (wall, NPC, bounds, or already on cooldown for a valid tile),
      // stop moving state but update direction.
      return {
        ...prev,
        player: {
          ...prev.player,
          isMoving: false, // Stop moving state if blocked or waiting for cooldown
          direction: newDirection,
          sprite: `player_${newDirection}`
        }
      };
    });
    // No dependency on lastMoveTimeRef here, it's managed internally via ref
  }, [heldKeys, setGameState, moveCooldown]);

  // New function to update visual position (animate toward actual position)
  const updateVisualPosition = useCallback(() => {
    setGameState(prev => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000; // time in seconds
      lastFrameTimeRef.current = currentTime;

      const { visualPosition, position } = prev.player;

      // Calculate the distance between visual and actual position
      const dx = position.x - visualPosition.x;
      const dy = position.y - visualPosition.y;

      // If already at the target, no need to update
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
        return prev;
      }

      // Move visualPosition toward position based on animation speed and delta time
      const newVisualPosition = {
        x: visualPosition.x + dx * Math.min(1, animationSpeed * deltaTime),
        y: visualPosition.y + dy * Math.min(1, animationSpeed * deltaTime)
      };

      return {
        ...prev,
        player: {
          ...prev.player,
          visualPosition: newVisualPosition
        }
      };
    });
  }, [animationSpeed]);

  // Game loop for smooth movement
  useEffect(() => {
    const gameLoop = (timestamp: number) => {
      updatePlayerPosition(); // Update grid position based on input
      updateVisualPosition(); // Smoothly animate visual position toward grid position
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    lastFrameTimeRef.current = performance.now(); // Initialize last frame time
    // Start the game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    // Cleanup function to cancel the loop when the component unmounts
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [updatePlayerPosition, updateVisualPosition]);

  // Function to continue to the next dialogue line
  const continueDialogue = useCallback(() => {
    setGameState(prev => {
      if (!prev.activeDialogue.npc || !prev.activeDialogue.active) return prev;

      const nextIndex = prev.activeDialogue.currentResponseIndex + 1;
      const npcDialogue = prev.activeDialogue.npc.dialogue;

      // If there are more dialogue lines
      if (nextIndex < npcDialogue.length) {
        // Speak the next dialogue line
        speakText(npcDialogue[nextIndex], prev.activeDialogue.npc, { flush: true });

        return {
          ...prev,
          activeDialogue: {
            ...prev.activeDialogue,
            currentResponseIndex: nextIndex
          }
        };
      } else {
        // End the dialogue if there are no more lines
        return {
          ...prev,
          activeDialogue: {
            npc: null,
            active: false,
            currentResponseIndex: 0
          }
        };
      }
    });
  }, [speakText]);

  // Function to end dialogue
  const endDialogue = useCallback(() => {
    setGameState(prev => {
      const currentNpc = prev.activeDialogue.npc;

      return {
        ...prev,
        // Reset quiz passing status for the current NPC so they can give new quizzes
        npcs: currentNpc ? prev.npcs.map(npc =>
          npc.id === currentNpc.id
            ? { ...npc, hasPassedQuiz: false }
            : npc
        ) : prev.npcs,
        activeDialogue: {
          npc: null,
          active: false,
          currentResponseIndex: 0
        }
      };
    });

    // Check for quest progress
    checkForQuestProgress();
  }, [checkForQuestProgress]);

  // Toggle inventory panel
  const toggleInventory = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        inventoryOpen: !prev.uiState.inventoryOpen,
        questLogOpen: false // Close quest log if it's open
      }
    }));
  }, []);

  // Toggle quest log panel
  const toggleQuestLog = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        questLogOpen: !prev.uiState.questLogOpen,
        inventoryOpen: false // Close inventory if it's open
      }
    }));
  }, []);

  // Toggle tutorial visibility
  const toggleTutorial = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        showTutorial: !prev.uiState.showTutorial
      }
    }));
  }, []);

  // Accept a quest
  const acceptQuest = useCallback((questId: string) => {
    setGameState(prev => {
      const npc = prev.npcs.find(n => n.quest?.id === questId);
      if (!npc || !npc.quest) return prev;

      // Add the quest to active quests if it's not already there
      if (!prev.activeQuests.some(q => q.id === questId)) {
        return {
          ...prev,
          activeQuests: [...prev.activeQuests, npc.quest]
        };
      }

      return prev;
    });
  }, []);

  // Send player message to AI for response
  const sendPlayerMessage = useCallback(async (message: string) => {
    // Get current NPC
    const npc = gameState.activeDialogue.npc;
    if (!npc) return;

    // Update conversation history with player's message
    setGameState(prev => ({
      ...prev,
      currentConversationHistory: [...prev.currentConversationHistory, `Player: ${message}`]
    }));

    // Show loading/typing indicator in the dialogue UI
    setGameState(prev => {
      const updatedNpc = { ...prev.activeDialogue.npc! };
      return {
        ...prev,
        activeDialogue: {
          ...prev.activeDialogue,
          npc: {
            ...updatedNpc,
            dialogue: [...updatedNpc.dialogue, "...typing..."]
          },
          currentResponseIndex: updatedNpc.dialogue.length
        }
      };
    });

    try {
      // Prepare prompt with context
      const conversationContext = gameState.currentConversationHistory.join("\n");

      // Enhanced prompt to allow for more open-ended conversation
      const prompt = `
You are ${npc.name} in the game "Mystic Realms", a fantasy RPG. 
${npc.personality || "You are a friendly and helpful NPC."}

Game context:
- You are part of a fantasy world with quests, items, and adventures
- You can discuss any topic the player brings up, but should gently guide them back to their quest objectives if they seem off-track for too long
- You have knowledge about the game world and can provide hints and guidance
- You should stay in character at all times

Previous conversation:
${conversationContext}

The player just said: "${message}"

Respond as ${npc.name} would in character, in a brief, conversational way (max 2-3 sentences). If the player has been chatting about off-topic subjects for a while, subtly remind them of their quest or objectives, but don't force it.
      `;

      // Define response schema for structured output
      const responseSchema = {
        type: "object",
        properties: {
          response: {
            type: "string",
            description: "The NPC's response text"
          },
          isRedirectingToQuest: {
            type: "boolean",
            description: "Whether this response is attempting to redirect the player to their quest objectives"
          }
        },
        required: ["response"]
      };

      // Prepare payload for Gemini API
      const payload = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: responseSchema
        }
      };

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      let aiResponse = "I'm not sure how to respond to that.";
      let isRedirectingToQuest = false;

      try {
        // Extract the AI response from the JSON structure
        if (data.candidates &&
          data.candidates[0]?.content?.parts &&
          data.candidates[0].content.parts[0]?.functionResponse?.response) {
          aiResponse = data.candidates[0].content.parts[0].functionResponse.response;
          isRedirectingToQuest = data.candidates[0].content.parts[0].functionResponse.isRedirectingToQuest || false;
        } else if (data.candidates &&
          data.candidates[0]?.content?.parts &&
          data.candidates[0].content.parts[0]?.text) {
          // Parse the text if it's in JSON format
          const textContent = data.candidates[0].content.parts[0].text;
          try {
            const jsonResponse = JSON.parse(textContent);
            if (jsonResponse.response) {
              aiResponse = jsonResponse.response;
              isRedirectingToQuest = jsonResponse.isRedirectingToQuest || false;
            }
          } catch (e) {
            // If not valid JSON, use the text directly if it's not too long
            if (textContent.length < 200) {
              aiResponse = textContent;
            }
          }
        }
      } catch (e) {
        console.error("Error parsing AI response:", e);
      }

      // Speak the AI response
      speakText(aiResponse, npc, { flush: true });

      // Update the dialogue in the UI
      setGameState(prev => {
        // First, update the NPC's dialogue array in both the activeDialogue and npcs state
        const updatedNpcs = prev.npcs.map(n => {
          if (n.id === npc.id) {
            // Create a copy of the NPC's dialogue
            const updatedDialogue = [...n.dialogue];
            // Replace the typing indicator with the real response
            if (updatedDialogue[updatedDialogue.length - 1] === "...typing...") {
              updatedDialogue[updatedDialogue.length - 1] = aiResponse;
            } else {
              // If there's no typing indicator (shouldn't happen), add the response
              updatedDialogue.push(aiResponse);
            }
            return {
              ...n,
              dialogue: updatedDialogue
            };
          }
          return n;
        });

        // Get the updated NPC with new dialogue
        const updatedActiveNpc = updatedNpcs.find(n => n.id === npc.id);

        return {
          ...prev,
          npcs: updatedNpcs,
          activeDialogue: {
            ...prev.activeDialogue,
            npc: updatedActiveNpc,
            currentResponseIndex: updatedActiveNpc?.dialogue.length ? updatedActiveNpc.dialogue.length - 1 : 0
          },
          currentConversationHistory: [...prev.currentConversationHistory, `${npc.name}: ${aiResponse}`]
        };
      });

    } catch (error) {
      console.error("Error getting AI response:", error);

      // Update with a fallback response
      const fallbackResponse = "I'm sorry, I'm having trouble understanding. Perhaps we can talk about something else?";
      speakText(fallbackResponse, npc, { flush: true });

      // Update the dialogue in the UI with the fallback response
      setGameState(prev => {
        // Update the NPC's dialogue array in both the activeDialogue and npcs state
        const updatedNpcs = prev.npcs.map(n => {
          if (n.id === npc.id) {
            // Create a copy of the NPC's dialogue
            const updatedDialogue = [...n.dialogue];
            // Replace the typing indicator with the fallback response
            if (updatedDialogue[updatedDialogue.length - 1] === "...typing...") {
              updatedDialogue[updatedDialogue.length - 1] = fallbackResponse;
            } else {
              // If there's no typing indicator, add the fallback response
              updatedDialogue.push(fallbackResponse);
            }
            return {
              ...n,
              dialogue: updatedDialogue
            };
          }
          return n;
        });

        // Get the updated NPC with new dialogue
        const updatedActiveNpc = updatedNpcs.find(n => n.id === npc.id);

        return {
          ...prev,
          npcs: updatedNpcs,
          activeDialogue: {
            ...prev.activeDialogue,
            npc: updatedActiveNpc,
            currentResponseIndex: updatedActiveNpc?.dialogue.length ? updatedActiveNpc.dialogue.length - 1 : 0
          },
          currentConversationHistory: [...prev.currentConversationHistory, `${npc.name}: ${fallbackResponse}`]
        };
      });
    }
  }, [gameState.activeDialogue.npc, gameState.npcs, gameState.currentConversationHistory, speakText]);

  // Add this function to handle direct item interaction (when pressing E near an item)
  const interactWithItem = useCallback(() => {
    setGameState(prev => {
      const { player, questItems, inventory, activeQuests } = prev;

      // Find nearest quest item within interaction range
      const nearbyItem = questItems.find(item =>
        isInProximity(player.position, item.position, 1) // 1 tile radius
      );

      if (!nearbyItem) return prev; // No nearby items

      // Check if this item is needed for any active quest
      const relevantQuest = activeQuests.find(quest =>
        quest.relatedQuestItemIds.includes(nearbyItem.id)
      );

      if (!relevantQuest) {
        // Generic item collection if not part of a quest
        toast({
          title: "Item Found",
          description: `You found: ${nearbyItem.name}`,
          duration: 3000,
        });

        // Add to inventory and remove from world
        const inventoryItem: Item = {
          ...nearbyItem,
          position: undefined // Remove position from inventory items
        };

        return {
          ...prev,
          inventory: [...inventory, inventoryItem],
          questItems: questItems.filter(item => item.id !== nearbyItem.id)
        };
      }

      // Handle quest-specific item collection
      let updatedQuests = [...activeQuests];
      let questUpdated = false;

      // Find the specific objective this item relates to
      updatedQuests = updatedQuests.map(quest => {
        if (quest.id !== relevantQuest.id) return quest;

        const updatedQuest = { ...quest };

        // Update the correct objective
        updatedQuest.objectives = quest.objectives.map(objective => {
          if (objective.completed) return objective;

          if (objective.type === 'collect') {
            // Special case for firebloom petals (multiple items with same name)
            if (quest.id === 'quest3' && objective.id === 'q3_obj1' && nearbyItem.name === 'Firebloom Petal') {
              const newProgress = (objective.currentProgress || 0) + 1;
              const isComplete = newProgress >= (objective.count || 1);

              questUpdated = true;

              // Show appropriate notification
              if (isComplete) {
                toast({
                  title: "Quest Update",
                  description: `Objective completed: ${objective.description}`,
                  duration: 3000,
                });
              } else {
                toast({
                  title: "Quest Update",
                  description: `Progress: ${newProgress}/${objective.count}`,
                  duration: 3000,
                });
              }

              return {
                ...objective,
                currentProgress: newProgress,
                completed: isComplete
              };
            }
            // Regular case - direct item ID matching
            else if (objective.targetId === nearbyItem.id) {
              const newProgress = (objective.currentProgress || 0) + 1;
              const isComplete = newProgress >= (objective.count || 1);

              questUpdated = true;

              // Show appropriate notification
              if (isComplete) {
                toast({
                  title: "Quest Update",
                  description: `Objective completed: ${objective.description}`,
                  duration: 3000,
                });
              } else {
                toast({
                  title: "Quest Update",
                  description: `Progress: ${newProgress}/${objective.count}`,
                  duration: 3000,
                });
              }

              return {
                ...objective,
                currentProgress: newProgress,
                completed: isComplete
              };
            }
          }

          return objective;
        });

        return updatedQuest;
      });

      // Common notification for item collection
      toast({
        title: "Item Collected",
        description: `You found: ${nearbyItem.name}`,
        duration: 3000,
      });

      // Add item to inventory and remove from world
      const inventoryItem: Item = {
        ...nearbyItem,
        position: undefined // Remove position from inventory items
      };

      return {
        ...prev,
        activeQuests: updatedQuests,
        inventory: [...inventory, inventoryItem],
        questItems: questItems.filter(item => item.id !== nearbyItem.id)
      };
    });
  }, []);

  // Process voice commands
  const processVoiceCommand = useCallback((command: string) => {
    const normalizedCommand = command.toLowerCase().trim();

    // If in dialogue, treat most commands as messages to the NPC 
    // except for a few specific navigation commands
    if (gameState.activeDialogue.active) {
      // Still handle these specific commands even in dialogue mode
      if (normalizedCommand.includes('close') || normalizedCommand.includes('exit') ||
        normalizedCommand === 'end' || normalizedCommand === 'leave' ||
        normalizedCommand === 'goodbye') {
        endDialogue();
      } else if (normalizedCommand.includes('continue') || normalizedCommand.includes('next')) {
        continueDialogue();
      } else {
        // Treat all other voice input as chat with the NPC
        sendPlayerMessage(command);
        return; // Exit early to avoid processing other commands
      }
      return;
    }

    // If not in dialogue, process normal game commands

    // Handle movement commands
    if (normalizedCommand.includes('go up') || normalizedCommand.includes('move up') || normalizedCommand === 'up') {
      // movePlayer('up'); // Removed - Movement handled by game loop
    } else if (normalizedCommand.includes('go down') || normalizedCommand.includes('move down') || normalizedCommand === 'down') {
      // movePlayer('down'); // Removed - Movement handled by game loop
    } else if (normalizedCommand.includes('go left') || normalizedCommand.includes('move left') || normalizedCommand === 'left') {
      // movePlayer('left'); // Removed - Movement handled by game loop
    } else if (normalizedCommand.includes('go right') || normalizedCommand.includes('move right') || normalizedCommand === 'right') {
      // movePlayer('right'); // Removed - Movement handled by game loop
    }
    // Handle interaction commands
    else if (normalizedCommand.includes('talk') || normalizedCommand.includes('speak') || normalizedCommand.includes('interact')) {
      // Find the nearest NPC
      const nearbyNPC = gameState.npcs.find(npc =>
        isInProximity(gameState.player.position, npc.position, 1)
      );

      if (nearbyNPC) {
        interactWithNPC(nearbyNPC.id);
      } else {
        toast({
          title: "No one nearby",
          description: "Move closer to someone to talk",
          duration: 3000,
        });
      }
    }
    // Handle item collection commands
    else if (normalizedCommand.includes('pick up') || normalizedCommand.includes('collect') ||
      normalizedCommand.includes('grab') || normalizedCommand.includes('take')) {
      // Try to pick up nearby items
      interactWithItem();
    }
    // Handle quest commands
    else if (normalizedCommand.includes('complete quest') || normalizedCommand.includes('finish quest') ||
      normalizedCommand.includes('turn in') || normalizedCommand.includes('submit quest')) {
      // Find the nearest NPC
      const nearbyNPC = gameState.npcs.find(npc =>
        isInProximity(gameState.player.position, npc.position, 1)
      );

      if (nearbyNPC) {
        // Check if this NPC is related to any completable quest
        const completableQuest = gameState.activeQuests.find(quest => {
          if (quest.npcId !== nearbyNPC.id) return false;

          // Check if all non-interaction objectives are complete
          const allOtherObjectivesComplete = quest.objectives
            .filter(obj => obj.type !== 'interact')
            .every(obj => obj.completed);

          return allOtherObjectivesComplete;
        });

        if (completableQuest) {
          interactWithNPC(nearbyNPC.id);
          toast({
            title: "Completing quest",
            description: `Turning in quest: ${completableQuest.title}`,
            duration: 3000,
          });
        } else {
          toast({
            title: "Cannot complete quest",
            description: "No completable quests for this NPC",
            duration: 3000,
          });
        }
      } else {
        toast({
          title: "No quest giver nearby",
          description: "Move closer to a quest giver",
          duration: 3000,
        });
      }
    }
    // Handle UI commands
    else if (normalizedCommand.includes('inventory') || normalizedCommand.includes('items')) {
      toggleInventory();
    } else if (normalizedCommand.includes('quest') || normalizedCommand.includes('missions')) {
      toggleQuestLog();
    } else if (normalizedCommand.includes('close') || normalizedCommand.includes('exit')) {
      // Close any open UI panels
      if (gameState.uiState.inventoryOpen || gameState.uiState.questLogOpen) {
        setGameState(prev => ({
          ...prev,
          uiState: {
            ...prev.uiState,
            inventoryOpen: false,
            questLogOpen: false,
            showLevelUp: prev.uiState.showLevelUp // Preserve this value
          }
        }));
      }
    } else if (normalizedCommand === 'tutorial') {
      toggleTutorial();
    }
  }, [gameState.npcs, gameState.player.position, gameState.activeDialogue.active,
  gameState.uiState.inventoryOpen, gameState.uiState.questLogOpen, gameState.activeQuests,
    // movePlayer, // Removed
    interactWithNPC, interactWithItem, toggleInventory, toggleQuestLog,
    continueDialogue, endDialogue, sendPlayerMessage, toggleTutorial]);

  // Voice recognition setup
  const startVoiceRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Say a command",
          duration: 3000,
        });
      };

      recognition.onresult = (event) => {
        const command = event.results[0][0].transcript;
        toast({
          title: "Command received",
          description: command,
          duration: 2000,
        });
        processVoiceCommand(command);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        toast({
          title: "Voice recognition error",
          description: event.error,
          variant: "destructive",
          duration: 3000,
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();

      // Store the recognition instance to stop it later
      window.currentRecognition = recognition;
    } else {
      toast({
        title: "Voice recognition not supported",
        description: "Your browser doesn't support the Web Speech API",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [processVoiceCommand]);

  // Stop voice recognition
  const stopVoiceRecognition = useCallback(() => {
    if (window.currentRecognition) {
      window.currentRecognition.stop();
      setIsListening(false);
    }
  }, []);

  // Define closeQuiz before it's used in handleKeyDown or submitQuizAnswer
  const closeQuiz = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      activeQuiz: {
        npcId: null,
        active: false,
        playerAnswer: '',
        currentQuiz: null
      }
    }));
  }, [setGameState]);

  // Listen for keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Skip handling arrow keys when quiz is active to allow cursor movement in input field
      const isQuizActive = gameState.activeQuiz.active;
      if (isQuizActive &&
        (key === 'arrowleft' || key === 'arrowright' || key === 'arrowup' || key === 'arrowdown')) {
        return; // Let the default browser behavior handle cursor movement
      }

      // Handle non-movement keys first (only trigger once per press)
      if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        // Skip input if dialogue is active (except Escape/Space/Enter)
        const isDialogueActive = gameState.activeDialogue.active;
        if (isDialogueActive) {
          if (key === 'escape') {
            e.preventDefault();
            endDialogue();
          } else if (key === ' ' || key === 'enter') {
            e.preventDefault();
            continueDialogue();
          }
          return;
        }

        // Skip input if quiz is active (except Escape)
        if (isQuizActive) {
          if (key === 'escape') {
            e.preventDefault();
            closeQuiz();
            toast({
              title: "Quiz Cancelled",
              description: "You can try again later.",
              duration: 3000,
            });
          }
          return;
        }

        // Close tutorial if it's open with ESC
        const isTutorialOpen = gameState.uiState.showTutorial;
        if (isTutorialOpen) {
          if (key === 'escape') {
            e.preventDefault();
            toggleTutorial();
            return;
          }
          // Skip other input if tutorial is open
          return;
        }

        // Skip input if any UI window is open (except Escape)
        const isInventoryOpen = gameState.uiState.inventoryOpen;
        const isQuestLogOpen = gameState.uiState.questLogOpen;
        if (isInventoryOpen || isQuestLogOpen) {
          if (key === 'escape') {
            e.preventDefault();
            if (isInventoryOpen) toggleInventory();
            else if (isQuestLogOpen) toggleQuestLog();
          }
          return;
        }

        // Handle single-press actions
        switch (key) {
          case 'e': // Interact
            e.preventDefault();
            {
              // Check if there's a nearby NPC to interact with
              const nearbyNPC = gameState.npcs.find(npc =>
                isInProximity(gameState.player.position, npc.position, 1)
              );

              if (nearbyNPC) {
                interactWithNPC(nearbyNPC.id);
              } else {
                interactWithItem();
              }
            }
            break;
          case 'i': // Inventory
            e.preventDefault();
            toggleInventory();
            break;
          case 'q': // Quest log
            e.preventDefault();
            toggleQuestLog();
            break;
          case 'h': // Help/Tutorial
            e.preventDefault();
            toggleTutorial();
            break;
          case 'v': // Voice command activation
            e.preventDefault();
            startVoiceRecognition();
            break;
          case 'escape': // General escape (closes UI if open, handled above)
            e.preventDefault();
            // If no UI is open, Escape doesn't do anything here currently
            break;
        }
      } else {
        // Handle movement keys (add to set)
        // Don't prevent default for arrow keys if quiz is active (to allow cursor movement)
        if (key.startsWith('arrow') && !isQuizActive) {
          e.preventDefault();
        }

        // Don't add movement keys to held keys if quiz is active
        if (!isQuizActive && !heldKeys.has(key)) {
          setHeldKeys(prev => new Set(prev).add(key));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Remove movement keys from the set on keyup
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        setHeldKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete(key);
          return newKeys;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    // Remove movePlayer
    gameState.player.position,
    gameState.npcs,
    gameState.activeDialogue.active,
    gameState.uiState.inventoryOpen,
    gameState.uiState.questLogOpen,
    gameState.activeQuiz.active,
    interactWithNPC,
    interactWithItem,
    toggleInventory,
    toggleQuestLog,
    continueDialogue,
    endDialogue,
    stopVoiceRecognition,
    isInProximity,
    toast,
    closeQuiz,
    startVoiceRecognition,
    heldKeys // Add heldKeys as dependency
  ]);

  // Initialize speech synthesis voices when available
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices - this is needed especially for Chrome
      const populateVoiceList = () => {
        window.speechSynthesis.getVoices();
      };

      populateVoiceList();

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoiceList;
      }
    }
  }, []);

  // Effect to handle interaction trigger after quiz completion
  useEffect(() => {
    if (gameState.npcToInteractAfterQuiz) {
      const npcId = gameState.npcToInteractAfterQuiz;

      // Trigger interaction
      interactWithNPC(npcId);

      // Reset the trigger state
      setGameState(prev => ({
        ...prev,
        npcToInteractAfterQuiz: null
      }));
    }
    // Depend on the trigger state and the interaction function itself
  }, [gameState.npcToInteractAfterQuiz, interactWithNPC, setGameState]);

  // Check for quest progress whenever player position changes
  useEffect(() => {
    checkForQuestProgress();
  }, [gameState.player.position, gameState.activeDialogue.active, checkForQuestProgress]);

  // Add a new function to handle quiz submission
  const submitQuizAnswer = useCallback((answer: string) => {
    // Get the active quiz NPC ID and quiz data from the state
    const { npcId, currentQuiz } = gameState.activeQuiz;
    if (!npcId || !currentQuiz) return; // Exit if no quiz is active

    // Find the corresponding NPC object
    const targetNpc = gameState.npcs.find(n => n.id === npcId);
    if (!targetNpc) return; // Exit if NPC not found

    // Check if the submitted answer is correct against the current quiz's expected output
    if (answer.trim() === currentQuiz.expectedOutput.trim()) {
      // Answer is correct: update state
      setGameState(prev => ({
        ...prev,
        // Update the specific NPC to track completed quiz and temporarily pass
        npcs: prev.npcs.map(n =>
          n.id === npcId
            ? {
              ...n,
              hasPassedQuiz: true,
              completedQuizzes: [...n.completedQuizzes, currentQuiz.id]
            }
            : n
        ),
        // Deactivate the quiz UI
        activeQuiz: {
          npcId: null,
          active: false,
          playerAnswer: '',
          currentQuiz: null
        },
        // Set the flag to trigger interaction after this state update
        npcToInteractAfterQuiz: npcId
      }));

      // Show success message
      toast({
        title: "Correct!",
        description: `You may now speak with ${targetNpc.name}.`,
        duration: 3000,
      });

    } else {
      // Answer is incorrect: show feedback
      toast({
        title: "Incorrect",
        description: "Try again or press ESC to cancel.",
        duration: 3000,
      });
    }
    // Dependencies for the useCallback hook
  }, [gameState.activeQuiz, gameState.npcs, setGameState, toast]);

  // Simulate a key press (for UI buttons)
  const simulateKeyPress = useCallback((key: string) => {
    setHeldKeys(prev => new Set(prev).add(key.toLowerCase()));
  }, []);

  // Simulate a key release (for UI buttons)
  const simulateKeyRelease = useCallback((key: string) => {
    setHeldKeys(prev => {
      const newKeys = new Set(prev);
      newKeys.delete(key.toLowerCase());
      return newKeys;
    });
  }, []);

  // Manual save function - supports multiple slots
  const manualSave = useCallback(async (slotName: string = 'autosave', displayName?: string) => {
    const currentState = gameStateRef.current;
    
    try {
      if (user) {
        console.log('[ManualSave] Saving to Firebase slot:', slotName);
        await saveGame(user.uid, currentState, slotName, displayName);
        toast({
          title: "Game Saved!",
          description: displayName || (slotName === 'autosave' ? "Auto-saved to cloud." : `Saved as "${slotName}".`),
          duration: 2000,
        });
      } else {
        saveToLocalStorage(currentState, 'local_autosave');
        toast({
          title: "Game Saved!",
          description: "Saved locally (sign in for cloud saves).",
          duration: 2000,
        });
      }
    } catch (error: any) {
      console.error('[ManualSave] Failed:', error);
      saveToLocalStorage(currentState, 'local_autosave');
      toast({
        title: "Cloud Save Failed",
        description: error.message || "Saved locally instead.",
        duration: 3000,
      });
    }
  }, [user]);

  // Load a specific save slot
  const loadSaveSlot = useCallback(async (slotName: string) => {
    if (!user) {
      toast({
        title: "Not Logged In",
        description: "Please log in to load saves.",
        duration: 3000,
      });
      return;
    }

    try {
      console.log('[LoadSlot] Loading save slot:', slotName);
      const savedGame = await loadGame(user.uid, slotName);
      
      if (!savedGame || !savedGame.mapData) {
        toast({
          title: "Load Failed",
          description: "Save not found or corrupted.",
          duration: 3000,
        });
        return;
      }

      const map = getMapFromSave(savedGame);
      const loadedState = savedGame.game;
      const npcPositions = savedGame.npcPositions || {};
      
      // Create NPCs with saved positions
      const npcs = initialState.npcs.map(npc => ({
        ...npc,
        position: npcPositions[npc.id] || { x: 25, y: 25 },
      }));

      const playerPos = loadedState.player?.position || { x: 25, y: 25 };

      setGameState(prev => ({
        ...prev,
        gameMap: map,
        player: {
          ...prev.player,
          position: { x: playerPos.x, y: playerPos.y },
          targetPosition: { x: playerPos.x, y: playerPos.y },
          visualPosition: { x: playerPos.x, y: playerPos.y },
          isMoving: false,
          direction: loadedState.player?.direction || 'down',
          level: loadedState.player?.level || 1,
          xp: loadedState.player?.xp || 0,
          nextLevelXp: loadedState.player?.nextLevelXp || 100,
          sprite: loadedState.player?.sprite || 'player_down',
        },
        inventory: loadedState.inventory || [],
        activeQuests: loadedState.activeQuests || [],
        completedQuests: loadedState.completedQuests || [],
        questItems: loadedState.questItems || prev.questItems,
        hiddenQuestItems: loadedState.hiddenQuestItems || prev.hiddenQuestItems,
        npcs: npcs.map(npc => {
          const savedNpc = loadedState.npcs?.find((n: any) => n.id === npc.id);
          return savedNpc ? { ...npc, hasPassedQuiz: savedNpc.hasPassedQuiz, completedQuizzes: savedNpc.completedQuizzes || [] } : npc;
        }),
        uiState: {
          ...prev.uiState,
          showTutorial: loadedState.uiState?.showTutorial ?? false,
        },
      }));

      toast({
        title: "Game Loaded!",
        description: `Loaded "${savedGame.displayName || slotName}" - Level ${loadedState.player?.level || 1}`,
        duration: 2000,
      });
      
      console.log('[LoadSlot] ✅ Successfully loaded save slot:', slotName);
    } catch (error: any) {
      console.error('[LoadSlot] Failed:', error);
      toast({
        title: "Load Failed",
        description: error.message || "Could not load save.",
        duration: 3000,
      });
    }
  }, [user]);

  return (
    <GameContext.Provider value={{
      gameState,
      // movePlayer, // Removed: Replaced by game loop logic
      interactWithNPC,
      continueDialogue,
      endDialogue,
      toggleInventory,
      toggleQuestLog,
      toggleTutorial,
      acceptQuest,
      processVoiceCommand,
      startVoiceRecognition,
      stopVoiceRecognition,
      isListening,
      sendPlayerMessage,
      checkForQuestProgress,
      interactWithItem,
      submitQuizAnswer,
      closeQuiz,
      simulateKeyPress,
      simulateKeyRelease,
      manualSave,
      loadSaveSlot
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
