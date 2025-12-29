// Define the available tracks
const QUEST_COMPLETION_TRACKS = [
  'Luffy\'s.mp3',
  'Zoro.mp3',
  'nami.mp3',
  'usopp\'s.mp3'
] as const;

class AudioManager {
  private static instance: AudioManager;
  private availableTracks: string[];
  private audio: HTMLAudioElement | null = null;
  private currentDelayCallback: number | null = null;

  private constructor() {
    this.availableTracks = [...QUEST_COMPLETION_TRACKS];
    this.shuffleTracks();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private shuffleTracks(): void {
    // Fisher-Yates shuffle algorithm
    for (let i = this.availableTracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.availableTracks[i], this.availableTracks[j]] = 
      [this.availableTracks[j], this.availableTracks[i]];
    }
  }

  public playNextQuestCompletionTrack(delayCallback?: () => void, delayMs: number = 8000): void {
    // Clear any existing delayed callback
    if (this.currentDelayCallback !== null) {
      window.clearTimeout(this.currentDelayCallback);
      this.currentDelayCallback = null;
    }

    // If all tracks have been played, reset and shuffle
    if (this.availableTracks.length === 0) {
      this.availableTracks = [...QUEST_COMPLETION_TRACKS];
      this.shuffleTracks();
    }

    // Get the next track
    const track = this.availableTracks.pop();
    if (!track) return;

    // Stop any currently playing audio
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    // Create and play new audio
    this.audio = new Audio(`/Track/${track}`);
    this.audio.play().catch(error => {
      console.error('Error playing audio:', error);
    });

    // Set up the delayed callback if provided
    if (delayCallback) {
      this.currentDelayCallback = window.setTimeout(() => {
        delayCallback();
        this.currentDelayCallback = null;
      }, delayMs);
    }
  }

  public stopCurrentTrack(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    // Clear any delayed callback
    if (this.currentDelayCallback !== null) {
      window.clearTimeout(this.currentDelayCallback);
      this.currentDelayCallback = null;
    }
  }
}

export default AudioManager; 