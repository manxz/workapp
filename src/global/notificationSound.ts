/**
 * Notification Sound Utility
 * 
 * Embedded base64 MP3 sound for message notifications.
 * No external URLs - sound is always available.
 */

let audio: HTMLAudioElement | null = null;
let audioUnlocked = false;

// Base64-embedded notification sound (simple beep)
// This is a minimal valid MP3 file
const SOUND_DATA =
  "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAA5TEFNRTMuMTAwAZYAAAAAAAAAABQ4JAVbQgAAOAAAgYZlFeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQxAAABvgGP8YAABCW+8z4gAAEVUdXZAAB///////////////////////////////PP+LJIpYAAAAAAAAAAAAAAP/7kMQJAAfcXlP8AAAQyAu3f4AAABcQRp4AAAARRRERERERE//////////////////////////RERERERERERE//uQxAgABqQCU/wAAADPgEv/gAAARERERERERERERERERERERERERERERP///////////////////////+AAAAAAAAAAAAAAAP/7kMQKgAb0UlPzgAAQyQBLPnAAABERERERERERERERERERERERERERERE//////////////////////////w==";

// Alternative: Use Web Audio API for a simple beep
let audioContext: AudioContext | null = null;

/**
 * Create a pleasant notification sound using Web Audio API
 * Two-tone "ding" sound (like a message notification)
 */
function playBeepWithWebAudio() {
  try {
    if (!audioContext) {
      return false;
    }
    
    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const now = audioContext.currentTime;
    
    // Create two oscillators for a pleasant two-tone "ding"
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // First tone: 800Hz (high note)
    osc1.frequency.setValueAtTime(800, now);
    osc1.type = 'sine';
    
    // Second tone: 600Hz (lower note) - creates a pleasant harmony
    osc2.frequency.setValueAtTime(600, now);
    osc2.type = 'sine';
    
    // Volume envelope: quick attack, gentle decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    // Play both tones
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
    
    return true;
  } catch (error) {
    console.error('[NotificationSound] Error playing sound:', error);
    return false;
  }
}

/**
 * Setup notification sound (call once on app mount)
 */
export function setupNotificationSound() {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Set up HTML Audio element (fallback)
    audio = new Audio(SOUND_DATA);
    audio.volume = 0.45;
    
    // Initialize Web Audio API context (primary method)
    if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Unlock audio on first user interaction (required for autoplay)
    const unlockAudio = () => {
      if (audioUnlocked) return;
      
      // Resume Web Audio API context
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Prime HTML Audio element
      if (audio) {
        audio.play().then(() => {
          audio!.pause();
          audio!.currentTime = 0;
        }).catch(() => {
          // Ignore unlock errors - Web Audio API is the primary method
        });
      }
      
      audioUnlocked = true;
      
      // Remove listeners after unlocking
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    
    // Listen for first user interaction
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    
  } catch (error) {
    console.error('[NotificationSound] Failed to initialize:', error);
  }
}

/**
 * Play notification sound
 * Prefers Web Audio API (more reliable), falls back to HTML Audio
 */
export function playNotificationSound() {
  if (!audioUnlocked) {
    return;
  }
  
  // Try Web Audio API first (more reliable)
  if (audioContext) {
    const success = playBeepWithWebAudio();
    if (success) {
      return;
    }
  }
  
  // Fallback to HTML Audio
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Ignore playback errors
    });
  }
}


