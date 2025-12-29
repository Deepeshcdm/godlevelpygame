import React, { useState } from 'react';
import { useGame, Quest, QuestObjective } from '../GameContext';

const QuestLogPanel: React.FC = () => {
  const { gameState } = useGame();
  const { activeQuests, completedQuests, player } = gameState;
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    uncompleted: true,
    completed: false
  });
  const [selectedQuest, setSelectedQuest] = useState<string | null>(null);

  // Calculate XP percentage for progress bar
  const xpPercentage = Math.min(100, Math.round((player.xp / player.nextLevelXp) * 100));
  
  // Calculate XP needed for next level, ensuring it's not negative
  const xpNeeded = Math.max(0, player.nextLevelXp - player.xp);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Toggle quest selection
  const toggleQuest = (questId: string) => {
    setSelectedQuest(prev => prev === questId ? null : questId);
  };

  // Render an individual objective
  const renderObjective = (objective: QuestObjective) => {
    return (
      <div key={objective.id} className="ml-6 mt-1 flex items-start gap-2">
        <div className={`flex-shrink-0 w-4 h-4 mt-0.5 ${objective.completed ? 'text-green-500' : 'text-mystic-400'}`}>
          {objective.completed ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 8.625a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM12 18.75a1.125 1.125 0 110-2.25 1.125 1.125 0 010 2.25z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <span className={`text-sm ${objective.completed ? 'text-mystic-400 line-through' : 'text-mystic-300'}`}>
          {objective.description}
          {objective.type === 'collect' && objective.count && objective.currentProgress !== undefined && (
            <span className="ml-1 text-xs">
              ({objective.currentProgress}/{objective.count})
            </span>
          )}
        </span>
      </div>
    );
  };

  // Render quest details
  const renderQuestDetails = (quest: Quest) => {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-sm text-mystic-300">{quest.description}</p>
        
        {quest.objectives && quest.objectives.length > 0 && (
          <div className="space-y-1">
            {quest.objectives.map(obj => renderObjective(obj))}
          </div>
        )}
        
        {quest.reward && (
          <div className="mt-2 text-xs px-2 py-1 rounded bg-mystic-700 text-mystic-300 inline-block">
            Reward: {quest.reward.name}
          </div>
        )}
      </div>
    );
  };

  // Render an individual quest
  const renderQuest = (quest: Quest, isCompleted: boolean) => {
    const isSelected = selectedQuest === quest.id;
    
    return (
      <div 
        key={quest.id}
        className={`p-3 rounded-md transition-colors ${
          isCompleted 
            ? 'bg-mystic-800 hover:bg-mystic-700' 
            : 'bg-mystic-800 hover:bg-mystic-700'
        }`}
      >
        <div 
          className="flex items-start space-x-3 cursor-pointer"
          onClick={() => toggleQuest(quest.id)}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isCompleted ? 'bg-green-500 text-white' : 'bg-mystic-500 text-white'
          }`}>
            {isCompleted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${isCompleted ? 'text-mystic-300' : 'text-white'}`}>
              {quest.title}
              {!isCompleted && (
                <span className="ml-2 text-xs font-normal text-emerald-400">
                  — {quest.xpReward} XP
                </span>
              )}
            </h3>
            {isSelected && renderQuestDetails(quest)}
          </div>
          <div className={`transform transition-transform ${isSelected ? 'rotate-90' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-mystic-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  // Render a collapsible section
  const renderSection = (title: string, quests: Quest[], sectionKey: string, isCompleted: boolean) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div className="mb-4">
        <div 
          className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-mystic-800 rounded-md"
          onClick={() => toggleSection(sectionKey)}
        >
          <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-mystic-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <h3 className="text-mystic-400 font-semibold text-sm uppercase">{title}</h3>
          <span className="text-xs text-mystic-500">({quests.length})</span>
        </div>
        
        {isExpanded && (
          <div className="mt-2 space-y-2 pl-4">
            {quests.map(quest => renderQuest(quest, isCompleted))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-mystic-900 border-2 border-mystic-700 rounded-lg shadow-lg p-4 max-h-96 overflow-hidden flex flex-col">
      <h2 className="text-xl font-bold text-white mb-3 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Quest Log
      </h2>
      
      {/* Player Stats Section */}
      <div className="bg-mystic-800 rounded-md p-3 mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-mystic-300 font-semibold">Level {player.level}</span>
          <span className="text-mystic-400 text-xs">{player.xp} / {player.nextLevelXp} XP</span>
        </div>
        <div className="w-full bg-mystic-700 rounded-full h-2 mb-1">
          <div 
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${xpPercentage}%` }}
          ></div>
        </div>
        <div className="text-right text-xs text-mystic-400">
          {xpNeeded} XP to level {player.level + 1}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto game-scrollbar">
        {activeQuests.length > 0 || completedQuests.length > 0 ? (
          <>
            {activeQuests.length > 0 && renderSection('Uncompleted', activeQuests, 'uncompleted', false)}
            {completedQuests.length > 0 && renderSection('Completed', completedQuests, 'completed', true)}
          </>
        ) : (
          <div className="text-center py-6 text-mystic-400">
            <p>No quests in your log</p>
            <p className="text-sm mt-1">Talk to NPCs to discover quests</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestLogPanel;
