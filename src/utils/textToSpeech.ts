/**
 * Web Speech API Utility for Text-to-Speech (TTS)
 * Works natively in all modern browsers without external paid APIs.
 */

// Strip LaTeX and Markdown for clean speech
function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    // LaTeX math symbols
    .replace(/\$\$(.*?)\$\$/gs, '$1')
    .replace(/\$(.*?)\$/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 taqsim $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'ildiz ostida $1')
    .replace(/\^2/g, ' kvadrat')
    .replace(/\^3/g, ' kub')
    .replace(/\\cdot/g, ' ko\'paytirilgan ')
    .replace(/\\times/g, ' ko\'paytirilgan ')
    .replace(/\\div/g, ' bo\'lingan ')
    .replace(/\\pm/g, ' musbat yoki manfiy ')
    // HTML tags & Markdown
    .replace(/<[^>]*>/g, '')
    .replace(/[*_#`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export const tts = {
  speak: (
    text: string,
    options?: {
      lang?: string;
      rate?: number;
      onEnd?: () => void;
      onError?: () => void;
    }
  ) => {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API brauzerda mavjud emas');
      return;
    }

    // Stop ongoing speech
    window.speechSynthesis.cancel();

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = options?.lang || 'uz-UZ';
    utterance.rate = options?.rate || 0.95; // Qulay tushunish tezligi

    // Attempt to pick an appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const uzVoice = voices.find(v => v.lang.startsWith('uz') || v.lang.includes('Uzbek'));
    const ruVoice = voices.find(v => v.lang.startsWith('ru'));
    const enVoice = voices.find(v => v.lang.startsWith('en'));

    if (uzVoice) utterance.voice = uzVoice;
    else if (options?.lang?.startsWith('en') && enVoice) utterance.voice = enVoice;
    else if (ruVoice) utterance.voice = ruVoice;

    utterance.onend = () => {
      currentUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = () => {
      currentUtterance = null;
      options?.onError?.();
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  },

  stop: () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    currentUtterance = null;
  },

  isSpeaking: () => {
    return !!currentUtterance && 'speechSynthesis' in window && window.speechSynthesis.speaking;
  },
};
