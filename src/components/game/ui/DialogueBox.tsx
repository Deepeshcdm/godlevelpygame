import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../GameContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, Sparkles, Send, X, Mic } from 'lucide-react';

const DialogueBox: React.FC = () => {
  const { gameState, continueDialogue, endDialogue, sendPlayerMessage, acceptQuest } = useGame();
  const { activeDialogue } = gameState;
  const npc = activeDialogue.npc;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playerMessage, setPlayerMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [questCompleted, setQuestCompleted] = useState(false);
  // Removed local voice handling to avoid overlapping speech; GameContext manages TTS queue
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [showSparkle, setShowSparkle] = useState(false);
  const [sparklePosition, setSparklePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Function to add pauses and emphasis for Elder Mystic's speech pattern
  const processElderMysticText = (text: string): string => {
    // We can't use actual SSML with Web Speech API, so we'll modify the text
    // to simulate the pauses and emphasis

    // Add occasional pauses with ellipses and commas
    let processedText = text
      // Add pauses after sentences
      .replace(/\.\s+/g, '. ... ')
      // Add slight pauses after commas
      .replace(/,\s+/g, ', ... ')
      // Add emphasis to certain mystical words by adding spaces between letters
      // for a more dramatic effect
      .replace(/\b(magic|mystic|ancient|power|crystal|realm|wisdom)\b/gi, match => {
        // For Elder Mystic, emphasize mystical words
        return match.toUpperCase();
      });

    // Add a wise intro phrase occasionally
    if (Math.random() > 0.7 && !text.includes('...')) {
      const introductions = [
        "Hmm... ",
        "Listen carefully... ",
        "As the ancients would say... ",
        "The wisdom of ages tells us... ",
      ];
      const randomIntro = introductions[Math.floor(Math.random() * introductions.length)];
      processedText = randomIntro + processedText;
    }

    return processedText;
  };

  // Function for Merchant Ryla's composed speech pattern (Sagiri style)
  const processMerchantRylaText = (text: string): string => {
    // Sagiri speaks in a composed, professional manner with occasional pauses

    // Add measured pauses and a slightly formal tone
    let processedText = text
      // Short pauses after periods
      .replace(/\.\s+/g, '. ')
      // Minimal pauses after commas
      .replace(/,\s+/g, ', ')
      // Emphasize trade and business terms
      .replace(/\b(trade|deal|offer|price|item|artifact|rare|valuable)\b/gi, match => {
        return match;  // No capitalization, just keeping the emphasis subtle
      });

    // Add formal addressing occasionally
    if (Math.random() > 0.8 && !text.includes('...')) {
      const formalAddressing = [
        "Customer, ",
        "Traveler, ",
        "Adventurer, ",
        "If I may, ",
      ];
      const randomAddress = formalAddressing[Math.floor(Math.random() * formalAddressing.length)];
      processedText = randomAddress + processedText;
    }

    return processedText;
  };

  // Voice initialization removed; GameContext handles voice loading/selection

  // Text typing effect
  useEffect(() => {
    if (!npc || !npc.dialogue[activeDialogue.currentResponseIndex]) return;

    const text = npc.dialogue[activeDialogue.currentResponseIndex];

    // Reset state when a new message appears
    setDisplayedText('');

    // If text is the loading placeholder, don't apply typing effect
    if (text === "..." || text === "...thinking..." || text === "typing...") {
      setDisplayedText(text);
      setIsTyping(true);
      return;
    }

    let currentIndex = 0;
    setIsTyping(true);

    const typingInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, 30); // Adjust typing speed as needed

    return () => clearInterval(typingInterval);
  }, [npc, activeDialogue.currentResponseIndex, npc?.dialogue[activeDialogue.currentResponseIndex]]);

  // Removed local speech effect; GameContext already triggers queued speech.

  // Removed local speakText; GameContext handles voice playback centrally.

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      // Create a speech recognition instance
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      // Configure the speech recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      // Set up event handlers
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPlayerMessage(transcript);
        setTimeout(() => {
          sendPlayerMessage(transcript);
          setPlayerMessage('');
          setIsListening(false);
        }, 500);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [sendPlayerMessage]);

  // Start or stop voice recognition
  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Speech recognition error:', error);
        setIsListening(false);
      }
    }
  };

  const handleSubmitMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (playerMessage.trim() && !isTyping) {
      sendPlayerMessage(playerMessage);
      setPlayerMessage('');
    }
  };

  // Handle key press in the textarea - prevent default keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent global key handlers from firing
    e.stopPropagation();

    // If Enter is pressed without Shift, submit message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (playerMessage.trim() && !isTyping) {
        sendPlayerMessage(playerMessage);
        setPlayerMessage('');
      }
    }

    // If 'v' key is pressed, toggle voice recognition
    if (e.key === 'v' && !isTyping) {
      e.preventDefault();
      toggleVoiceRecognition();
    }
  };

  // Auto-focus the input when dialogue box appears
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Add global keyboard shortcut for voice activation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If 'v' key is pressed and dialogue is active, toggle voice recognition
      if (e.key === 'v' && npc && !isTyping) {
        toggleVoiceRecognition();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [npc, isTyping]);

  // Render the loading animation for the "..." placeholder
  const renderLoadingText = () => {
    if (npc?.dialogue[activeDialogue.currentResponseIndex] === "..." ||
      npc?.dialogue[activeDialogue.currentResponseIndex] === "...thinking...") {
      return (
        <div className="flex items-center space-x-2 text-mystic-300">
          <div className="w-2 h-2 bg-mystic-400 animate-pulse delay-0"></div>
          <div className="w-2 h-2 bg-mystic-400 animate-pulse delay-300"></div>
          <div className="w-2 h-2 bg-mystic-400 animate-pulse delay-600"></div>
          <span className="ml-2 text-sm italic">The mystic energies gather...</span>
        </div>
      );
    }

    return (
      <>
        {displayedText}
        {isTyping && <span className="animate-pulse">|</span>}
      </>
    );
  };

  // Check if a quest was just completed
  useEffect(() => {
    if (gameState.activeDialogue?.npc) {
      const npc = gameState.activeDialogue.npc;
      const completedQuest = gameState.activeQuests.find(quest =>
        quest.npcId === npc.id &&
        quest.objectives.every(obj => obj.completed) &&
        !quest.completed
      );

      setQuestCompleted(!!completedQuest);
    } else {
      setQuestCompleted(false);
    }
  }, [gameState.activeDialogue, gameState.activeQuests]);

  // Create random sparkles
  const createRandomSparkle = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;

    setSparklePosition({ x, y });
    setShowSparkle(true);

    setTimeout(() => {
      setShowSparkle(false);
      setTimeout(createRandomSparkle, Math.random() * 3000 + 1000);
    }, 700);
  }, []);

  // Start sparkle effect when dialogue is active
  useEffect(() => {
    if (npc) {
      createRandomSparkle();
    }
  }, [npc, createRandomSparkle]);

  if (!npc) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center">
      <div
        ref={containerRef}
        className="w-full bg-gradient-to-b from-mystic-900/95 to-mystic-950/95 relative overflow-hidden animate-dialogueAppear"
      >
        {/* Animated background pattern with shimmer effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          <div
            className="absolute top-0 left-0 w-full h-full bg-[url('/mystic-pattern.png')] animate-float"
            style={{
              backgroundImage: 'linear-gradient(45deg, transparent 0%, rgba(155, 135, 245, 0.1) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
          ></div>
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
            <div className="w-12 h-12 animate-sparkle">
              <Sparkles className="w-full h-full text-mystic-300" />
            </div>
          </div>
        )}

        {/* Decorative borders with glow effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-mystic-500 via-purple-500 to-mystic-500 animate-borderGlow"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-mystic-500 via-purple-500 to-mystic-500 animate-borderGlow"></div>

        {/* Animated runes with enhanced effect */}
        <div className="absolute top-0 left-[10%] w-1 h-20 overflow-hidden pointer-events-none">
          <div className="w-1 h-40 bg-gradient-to-b from-transparent via-mystic-400 to-transparent animate-runeFlow"></div>
        </div>
        <div className="absolute top-0 right-[10%] w-1 h-20 overflow-hidden pointer-events-none">
          <div className="w-1 h-40 bg-gradient-to-b from-transparent via-mystic-400 to-transparent animate-runeFlow delay-1000"></div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <div className="flex flex-col">
            {/* Header with NPC name and status */}
            <div className="flex items-center justify-between mb-4 relative">
              <div className="flex items-center">
                <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-mystic-300 to-purple-300 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)] flex items-center animate-mysticShimmer"
                  style={{
                    backgroundSize: '200% auto',
                    backgroundImage: 'linear-gradient(to right, #B9A4FF, #9B87F5, #B9A4FF)'
                  }}>
                  <span className="animate-pulse-glow inline-block mr-2">✧</span>
                  {npc.name}
                </h3>
                {questCompleted && (
                  <div className="ml-3 flex items-center bg-green-500/20 px-3 py-1 rounded-full animate-pulse-light">
                    <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">Quest Completed</span>
                  </div>
                )}
              </div>

              {/* Voice interaction indicator */}
              <div className="flex items-center bg-mystic-800/40 px-3 py-1 rounded-full">
                <Mic className="w-4 h-4 mr-1 text-mystic-300" />
                <span className="text-mystic-300 text-sm font-medium">Press V for voice</span>
              </div>
            </div>

            {/* Main dialogue area */}
            <div className="flex items-start space-x-4">
              {/* NPC Avatar with enhanced effects */}
              <div className="flex-shrink-0 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-mystic-500 to-purple-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-1000"></div>
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-mystic-400 to-purple-400 rounded-full opacity-75 animate-avatarPulse"></div>
                  <img
                    src={`/NPC Icon/${npc.name}${npc.name === "Elder Mystic" ? ".jpg" : ".png"}`}
                    alt={npc.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-mystic-500 shadow-lg transform group-hover:scale-105 transition duration-300 relative z-10"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Try the alternate extension if the first one fails
                      if (target.src.endsWith('.png')) {
                        target.src = `/NPC Icon/${npc.name}.jpg`;
                      } else if (target.src.endsWith('.jpg')) {
                        target.src = `/NPC Icon/${npc.name}.png`;
                      } else {
                        target.src = '/placeholder.svg';
                      }
                    }}
                  />
                  <div className="absolute -bottom-1 -right-1 bg-mystic-800 rounded-full p-1 border border-mystic-500">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Message Content with enhanced styling */}
              <div className="flex-grow animate-messageSlideIn">
                <div className="bg-gradient-to-br from-mystic-800/90 to-mystic-900/90 p-4 rounded-lg relative shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-shadow duration-300 border border-mystic-600/30">
                  <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-[10px] border-b-[10px] border-r-[10px] border-l-0 border-solid border-t-transparent border-b-transparent border-r-mystic-800"></div>
                  <div className="text-mystic-100 relative">
                    {renderLoadingText()}
                    {isTyping && (
                      <div className="absolute bottom-0 right-0 h-4 w-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-mystic-400"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Typing indicator with enhanced styling */}
                {isTyping && (
                  <div className="text-xs text-mystic-400 italic mt-1 pl-2 flex items-center animate-pulse">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    <span>Wait for NPC to finish...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Player response area with enhanced styling */}
            <form onSubmit={handleSubmitMessage} className="mt-6">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={playerMessage}
                  onChange={(e) => setPlayerMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isTyping ? "Wait for NPC to finish..." : isListening ? "Listening..." : "Type your response..."}
                  disabled={isTyping || isListening}
                  className={`w-full p-3 bg-mystic-800/80 text-white border border-mystic-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-mystic-400 focus:border-transparent min-h-[60px] max-h-[120px] placeholder-mystic-500 shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] transition-all duration-300 ${isTyping || isListening ? 'opacity-50' : 'hover:border-mystic-400'
                    }`}
                />
                <div className="absolute right-3 top-3 flex items-center space-x-2">
                  {/* Voice button */}
                  <button
                    type="button"
                    onClick={toggleVoiceRecognition}
                    disabled={isTyping}
                    className={`p-2 rounded-full flex items-center justify-center transition-all duration-300 ${isTyping
                        ? 'bg-mystic-700/50 text-mystic-400 cursor-not-allowed'
                        : isListening
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-gradient-to-r from-mystic-600 to-purple-600 text-white hover:from-mystic-500 hover:to-purple-500 hover:scale-105'
                      }`}
                    title="Voice Interaction (Press V)"
                  >
                    <Mic className="w-5 h-5" />
                    <span className="sr-only">Voice (V)</span>
                  </button>

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={isTyping || !playerMessage.trim() || isListening}
                    className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-all duration-300 ${isTyping || !playerMessage.trim() || isListening
                        ? 'bg-mystic-700/50 text-mystic-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-mystic-600 to-purple-600 text-white hover:from-mystic-500 hover:to-purple-500 hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transform'
                      }`}
                  >
                    <span>Send</span>
                    <Send className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>

              {/* Voice interaction status */}
              {isListening && (
                <div className="mt-2 text-sm text-center text-mystic-300 animate-pulse flex items-center justify-center">
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-3 bg-red-500 rounded-full animate-soundWave"></div>
                    <div className="w-1 h-5 bg-red-500 rounded-full animate-soundWave delay-75"></div>
                    <div className="w-1 h-7 bg-red-500 rounded-full animate-soundWave delay-150"></div>
                    <div className="w-1 h-5 bg-red-500 rounded-full animate-soundWave delay-75"></div>
                    <div className="w-1 h-3 bg-red-500 rounded-full animate-soundWave"></div>
                  </div>
                  <span className="ml-2">Listening... Speak now</span>
                </div>
              )}
            </form>

            {/* Control buttons with enhanced styling */}
            <div className="flex justify-between mt-4">
              <button
                onClick={endDialogue}
                className="px-4 py-2 bg-mystic-800/50 hover:bg-mystic-700/50 text-mystic-300 rounded-md flex items-center space-x-2 transition-all duration-300 hover:shadow-[0_0_10px_rgba(168,85,247,0.2)] transform hover:scale-105"
              >
                <span>End Conversation</span>
                <X className="w-4 h-4 ml-2" />
              </button>

              {activeDialogue.currentResponseIndex < npc.dialogue.length - 1 && (
                <button
                  onClick={continueDialogue}
                  disabled={isTyping}
                  className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-all duration-300 ${isTyping
                      ? 'bg-mystic-700/50 text-mystic-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-mystic-600 to-purple-600 text-white hover:from-mystic-500 hover:to-purple-500 hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transform'
                    }`}
                >
                  <span>Continue</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Quest information with enhanced styling */}
            {npc.quest && !gameState.completedQuests.some(q => q.id === npc.quest?.id) && (
              <div className="mt-6 transform hover:scale-[1.01] transition-transform duration-300">
                <div className="bg-gradient-to-br from-mystic-800/50 to-mystic-900/50 rounded-lg p-4 border border-mystic-700/50 shadow-[0_0_15px_rgba(0,0,0,0.3)] relative overflow-hidden">
                  {/* Decorative corner runes */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-mystic-400/30 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-mystic-400/30 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-mystic-400/30 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-mystic-400/30 rounded-br-lg"></div>

                  <div className="flex items-start relative z-10">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-mystic-300 to-purple-300 animate-mysticShimmer"
                        style={{
                          backgroundSize: '200% auto',
                          backgroundImage: 'linear-gradient(to right, #B9A4FF, #9B87F5, #B9A4FF)'
                        }}>
                        {npc.quest.title}
                      </h4>
                      <p className="text-sm text-mystic-200 mt-2 leading-relaxed">{npc.quest.description}</p>

                      {/* Rewards section with enhanced styling */}
                      <div className="mt-4 space-y-2">
                        <div className="text-sm text-mystic-300 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Rewards
                        </div>
                        {npc.quest.reward && (
                          <div className="flex items-center space-x-2 pl-6">
                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 animate-pulse"></div>
                            <span className="text-yellow-300 text-sm">{npc.quest.reward.name}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 pl-6">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-green-600 animate-pulse"></div>
                          <span className="text-green-300 text-sm">{npc.quest.xpReward} XP</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        {gameState.activeQuests.some(q => q.id === npc.quest?.id) ? (
                          <div className="text-sm text-mystic-400 italic flex items-center">
                            <div className="w-2 h-2 bg-mystic-500 rounded-full animate-pulse mr-2"></div>
                            Quest active
                          </div>
                        ) : (
                          <button
                            onClick={() => acceptQuest(npc.quest!.id)}
                            className="px-4 py-2 bg-gradient-to-r from-mystic-600 to-purple-600 text-white rounded-md hover:from-mystic-500 hover:to-purple-500 transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center space-x-2"
                          >
                            <span>Accept Quest</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogueBox;
