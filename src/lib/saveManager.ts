import { db } from './firebaseClient';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';

// Save file schema version for migration support
const SAVE_VERSION = '2.0'; // Updated to include map storage

// Debug flag - set to true to see save/load logs
const DEBUG_SAVES = true;

function debugLog(...args: any[]) {
  if (DEBUG_SAVES) {
    console.log('[SaveManager]', ...args);
  }
}

// Compressed tile representation (terrain only, walkable is derived)
const TERRAIN_MAP: { [key: string]: string } = {
  'grass': 'g',
  'water': 'w',
  'stone': 's',
  'path': 'p',
  'wall': 'W',
  'tree': 't',
  'bridge': 'b',
};

const TERRAIN_REVERSE: { [key: string]: string } = {
  'g': 'grass',
  'w': 'water',
  's': 'stone',
  'p': 'path',
  'W': 'wall',
  't': 'tree',
  'b': 'bridge',
};

// Compress map to a string for efficient storage
function compressMap(gameMap: any[][]): string {
  if (!gameMap || !gameMap.length) return '';
  
  const rows: string[] = [];
  for (const row of gameMap) {
    let rowStr = '';
    for (const tile of row) {
      rowStr += TERRAIN_MAP[tile.terrain] || 'g';
    }
    rows.push(rowStr);
  }
  return rows.join('|');
}

// Decompress map string back to tile array
function decompressMap(compressed: string): any[][] {
  if (!compressed) return [];
  
  const rows = compressed.split('|');
  const map: any[][] = [];
  
  for (const rowStr of rows) {
    const row: any[] = [];
    for (const char of rowStr) {
      const terrain = TERRAIN_REVERSE[char] || 'grass';
      const walkable = terrain !== 'water' && terrain !== 'wall' && terrain !== 'tree';
      row.push({ terrain, walkable });
    }
    map.push(row);
  }
  
  return map;
}

export interface GameSaveData {
  version: string;
  saveId: string;
  userId: string;
  slotName: string;
  timestamp: string;
  displayName?: string; // Optional display name for the save
  mapData: string; // Compressed map data
  npcPositions: { [key: string]: { x: number; y: number } }; // NPC positions on this map
  game: {
    player: {
      position: { x: number; y: number };
      direction: 'up' | 'down' | 'left' | 'right';
      level: number;
      xp: number;
      nextLevelXp: number;
      sprite: string;
    };
    inventory: Array<{
      id: string;
      name: string;
      description: string;
      type: string;
      value: number;
      sprite: string;
    }>;
    activeQuests: Array<any>;
    completedQuests: Array<any>;
    questItems: Array<any>;
    hiddenQuestItems: Array<any>;
    npcs: Array<{
      id: string;
      hasPassedQuiz: boolean;
      completedQuizzes: string[];
    }>;
    uiState: {
      showTutorial: boolean;
    };
  };
}

export interface SaveMetadata {
  saveId: string;
  userId: string;
  slotName: string;
  displayName?: string;
  timestamp: string;
  playerLevel: number;
  playerXp: number;
  playerPosition: { x: number; y: number };
}

/**
 * Save game state to Firestore with full map data
 */
export async function saveGame(
  userId: string,
  gameState: any,
  slotName: string = 'autosave',
  displayName?: string
): Promise<string> {
  debugLog('saveGame called with userId:', userId, 'slotName:', slotName);
  
  if (!userId) {
    debugLog('ERROR: No userId provided');
    throw new Error('No userId provided');
  }
  
  if (!gameState || !gameState.player) {
    debugLog('ERROR: Invalid gameState', gameState);
    throw new Error('Invalid game state');
  }

  try {
    const saveId = `${userId}_${slotName}`;
    const timestamp = new Date().toISOString();

    debugLog('Building save data with map...');
    debugLog('Player position:', gameState.player.position);
    debugLog('Map size:', gameState.gameMap?.length, 'x', gameState.gameMap?.[0]?.length);

    // Compress the map for storage
    const mapData = compressMap(gameState.gameMap);
    debugLog('Compressed map size:', mapData.length, 'characters');

    // Extract NPC positions
    const npcPositions: { [key: string]: { x: number; y: number } } = {};
    for (const npc of gameState.npcs || []) {
      npcPositions[npc.id] = { x: npc.position.x, y: npc.position.y };
    }

    const saveData: GameSaveData = {
      version: SAVE_VERSION,
      saveId,
      userId,
      slotName,
      timestamp,
      displayName: displayName || (slotName === 'autosave' ? 'Auto Save' : `Save ${slotName}`),
      mapData,
      npcPositions,
      game: {
        player: {
          position: { x: gameState.player.position.x, y: gameState.player.position.y },
          direction: gameState.player.direction,
          level: gameState.player.level,
          xp: gameState.player.xp,
          nextLevelXp: gameState.player.nextLevelXp,
          sprite: gameState.player.sprite,
        },
        inventory: (gameState.inventory || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          type: item.type,
          value: item.value,
          sprite: item.sprite,
        })),
        activeQuests: gameState.activeQuests || [],
        completedQuests: gameState.completedQuests || [],
        questItems: (gameState.questItems || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          type: item.type,
          value: item.value,
          sprite: item.sprite,
          position: { x: item.position.x, y: item.position.y },
        })),
        hiddenQuestItems: (gameState.hiddenQuestItems || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          type: item.type,
          value: item.value,
          sprite: item.sprite,
          position: { x: item.position.x, y: item.position.y },
        })),
        npcs: (gameState.npcs || []).map((npc: any) => ({
          id: npc.id,
          hasPassedQuiz: npc.hasPassedQuiz || false,
          completedQuizzes: npc.completedQuizzes || [],
        })),
        uiState: {
          showTutorial: gameState.uiState?.showTutorial ?? false,
        },
      },
    };

    debugLog('Save data built, writing to Firestore...');

    const saveRef = doc(db, 'saves', saveId);
    await setDoc(saveRef, saveData);

    debugLog('✅ Game saved successfully:', saveId);
    return saveId;
  } catch (error: any) {
    debugLog('❌ Error saving game:', error.message, error.code, error);
    console.error('Error saving game:', error);
    throw error;
  }
}

/**
 * Load game state from Firestore
 */
export async function loadGame(
  userId: string,
  slotName: string = 'autosave'
): Promise<GameSaveData | null> {
  debugLog('loadGame called with userId:', userId, 'slotName:', slotName);
  
  try {
    const saveId = `${userId}_${slotName}`;
    debugLog('Looking for document:', saveId);
    
    const saveRef = doc(db, 'saves', saveId);
    const saveDoc = await getDoc(saveRef);

    if (!saveDoc.exists()) {
      debugLog('No save found:', saveId);
      return null;
    }

    const saveData = saveDoc.data() as GameSaveData;
    debugLog('✅ Save data loaded:', {
      saveId: saveData.saveId,
      timestamp: saveData.timestamp,
      playerPosition: saveData.game?.player?.position,
      playerLevel: saveData.game?.player?.level,
      hasMapData: !!saveData.mapData,
      mapDataLength: saveData.mapData?.length || 0,
    });

    return saveData;
  } catch (error: any) {
    debugLog('❌ Error loading game:', error.message, error.code);
    console.error('Error loading game:', error);
    throw new Error('Failed to load game');
  }
}

/**
 * Decompress and return the map from save data
 */
export function getMapFromSave(saveData: GameSaveData): any[][] {
  if (!saveData.mapData) {
    debugLog('No map data in save');
    return [];
  }
  return decompressMap(saveData.mapData);
}

/**
 * List all saves for a user
 */
export async function listSaves(userId: string): Promise<SaveMetadata[]> {
  debugLog('listSaves called for userId:', userId);
  try {
    const savesRef = collection(db, 'saves');
    const q = query(
      savesRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const saves: SaveMetadata[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as GameSaveData;
      saves.push({
        saveId: data.saveId,
        userId: data.userId,
        slotName: data.slotName,
        displayName: data.displayName,
        timestamp: data.timestamp,
        playerLevel: data.game?.player?.level || 1,
        playerXp: data.game?.player?.xp || 0,
        playerPosition: data.game?.player?.position || { x: 0, y: 0 },
      });
    });

    // Sort by timestamp, autosave first
    saves.sort((a, b) => {
      if (a.slotName === 'autosave') return -1;
      if (b.slotName === 'autosave') return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    debugLog('Found saves:', saves.length);
    return saves;
  } catch (error: any) {
    debugLog('Error listing saves:', error.message, error.code);
    console.error('Error listing saves:', error);
    throw new Error('Failed to list saves');
  }
}

/**
 * Delete a save
 */
export async function deleteSave(userId: string, slotName: string): Promise<void> {
  try {
    const saveId = `${userId}_${slotName}`;
    const saveRef = doc(db, 'saves', saveId);
    await deleteDoc(saveRef);
    debugLog('Save deleted successfully:', saveId);
  } catch (error: any) {
    debugLog('Error deleting save:', error.message);
    console.error('Error deleting save:', error);
    throw new Error('Failed to delete save');
  }
}

/**
 * Check if user has any saves (to determine if this is first login)
 */
export async function hasAnySaves(userId: string): Promise<boolean> {
  try {
    const saves = await listSaves(userId);
    return saves.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Save to localStorage as a fallback
 */
export function saveToLocalStorage(gameState: any, slotName: string = 'local_autosave'): void {
  try {
    const timestamp = new Date().toISOString();
    const mapData = compressMap(gameState.gameMap);
    
    const npcPositions: { [key: string]: { x: number; y: number } } = {};
    for (const npc of gameState.npcs || []) {
      npcPositions[npc.id] = { x: npc.position.x, y: npc.position.y };
    }

    const saveData = {
      version: SAVE_VERSION,
      slotName,
      timestamp,
      mapData,
      npcPositions,
      game: {
        player: gameState.player,
        inventory: gameState.inventory,
        activeQuests: gameState.activeQuests,
        completedQuests: gameState.completedQuests,
        questItems: gameState.questItems,
        hiddenQuestItems: gameState.hiddenQuestItems,
        npcs: (gameState.npcs || []).map((npc: any) => ({
          id: npc.id,
          hasPassedQuiz: npc.hasPassedQuiz,
          completedQuizzes: npc.completedQuizzes || [],
        })),
        uiState: gameState.uiState,
      },
    };

    localStorage.setItem(`game_save_${slotName}`, JSON.stringify(saveData));
    debugLog('Game saved to localStorage:', slotName);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

/**
 * Load from localStorage
 */
export function loadFromLocalStorage(slotName: string = 'local_autosave'): any | null {
  try {
    const saved = localStorage.getItem(`game_save_${slotName}`);
    if (!saved) return null;

    const saveData = JSON.parse(saved);
    debugLog('Game loaded from localStorage:', slotName);
    return saveData;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
}

// Export the decompress function for use in GameContext
export { decompressMap };
