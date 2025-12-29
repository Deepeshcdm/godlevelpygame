
import React, { useState } from 'react';
import { useGame } from '../GameContext';
import { useAuth } from '../../../contexts/AuthContext';
import InventoryPanel from './InventoryPanel';
import QuestLogPanel from './QuestLogPanel';
import DialogueBox from './DialogueBox';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../ui/dialog';

const GameUI: React.FC = () => {
  const { gameState, manualSave } = useGame();
  const { user } = useAuth();
  const { uiState, activeDialogue } = gameState;
  
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [slotName, setSlotName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // When dialogue is active, prevent keyboard events from propagating
  React.useEffect(() => {
    if (activeDialogue.active) {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Prevent inventory shortcuts when dialogue is active
        if (e.key === 'i' || e.key === 'q' || e.key === ' ') {
          e.stopPropagation();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown, true);
      return () => window.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [activeDialogue.active]);

  const handleQuickSave = async () => {
    setIsSaving(true);
    await manualSave('autosave', 'Auto Save');
    setIsSaving(false);
  };

  const handleSaveToSlot = async () => {
    if (!slotName.trim()) return;
    setIsSaving(true);
    const sanitizedSlot = slotName.trim().toLowerCase().replace(/\s+/g, '_');
    await manualSave(sanitizedSlot, slotName.trim());
    setSaveDialogOpen(false);
    setSlotName('');
    setIsSaving(false);
  };

  return (
    <>
      {/* Account and Save buttons in top-left corner */}
      <div className="absolute top-4 left-4 z-40 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/account'}
          className="bg-slate-800/80 hover:bg-slate-700/80 text-white"
        >
          {user?.displayName || user?.email?.split('@')[0] || 'Account'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleQuickSave}
          disabled={isSaving}
          className="bg-green-800/80 hover:bg-green-700/80 text-white"
        >
          {isSaving ? '💾 Saving...' : '💾 Quick Save'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
          className="bg-blue-800/80 hover:bg-blue-700/80 text-white"
        >
          📁 Save As...
        </Button>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save Game</DialogTitle>
            <DialogDescription>
              Enter a name for this save slot. You can load it later from your Account page.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Before Boss Fight"
              value={slotName}
              onChange={(e) => setSlotName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveToSlot()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveToSlot} disabled={!slotName.trim() || isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventory panel */}
      {uiState.inventoryOpen && (
        <div className="absolute top-4 right-4 z-30 w-80 animate-slideIn">
          <InventoryPanel />
        </div>
      )}
      
      {/* Quest log panel */}
      {uiState.questLogOpen && (
        <div className="absolute top-16 left-4 z-30 w-80 animate-slideIn">
          <QuestLogPanel />
        </div>
      )}
      
      {/* Dialogue box */}
      {activeDialogue.active && activeDialogue.npc && (
        <DialogueBox />
      )}
    </>
  );
};

export default GameUI;
