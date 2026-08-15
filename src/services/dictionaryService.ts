// ── Free Dictionary & Audio API Service ────────────────────────────────────
// Real native MP3 pronunciation audio & spelling words

export interface AudioSpellingItem {
  id: string;
  word: string;
  audioUrl: string;
  definition: string;
  phonetic: string;
}

const SAMPLE_WORDS = [
  'apple', 'planet', 'rocket', 'galaxy', 'energy', 'future', 'freedom',
  'system', 'science', 'nature', 'victory', 'genius', 'wonder', 'crystal'
];

export async function fetchAudioSpellingWord(word?: string): Promise<AudioSpellingItem> {
  const targetWord = word || SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${targetWord}`);
    if (!res.ok) throw new Error('Dictionary API failed');

    const data = await res.json();
    const entry = data[0];

    // Find audio URL
    let audioUrl = '';
    if (entry.phonetics) {
      const phon = entry.phonetics.find((p: any) => p.audio && p.audio.length > 0);
      if (phon) audioUrl = phon.audio;
    }

    const definition = entry.meanings?.[0]?.definitions?.[0]?.definition || "Inglizcha so'z talaffuziga diqqat qiling";
    const phonetic = entry.phonetic || `/${targetWord}/`;

    return {
      id: `audio_${targetWord}_${Date.now()}`,
      word: targetWord.toUpperCase(),
      audioUrl: audioUrl || `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${targetWord}--_us_1.mp3`,
      definition,
      phonetic,
    };
  } catch (error) {
    console.warn('[DictionaryService] Fetch error, returning fallback:', error);
    return {
      id: `fb_spell_${targetWord}`,
      word: targetWord.toUpperCase(),
      audioUrl: `https://ssl.gstatic.com/dictionary/static/sounds/oxford/${targetWord}--_us_1.mp3`,
      definition: "Inglizcha so'z talaffuzini tinglab, uni to'g'ri yozing",
      phonetic: `/${targetWord}/`,
    };
  }
}
