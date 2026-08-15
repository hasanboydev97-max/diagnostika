// ── Open Trivia DB API Service ─────────────────────────────────────────────
// Real-time dynamic quiz questions across Science, IT, Math & General Knowledge

export interface TriviaQuestion {
  id: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correctAnswer: string;
  options: string[];
}

const CATEGORY_MAP: Record<string, number> = {
  science: 17,
  computers: 18,
  math: 19,
  geography: 22,
  history: 23,
  general: 9,
};

// HTML entity decoder helper
function decodeHTMLEntities(str: string): string {
  if (!str) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

export async function fetchOpenTriviaQuestions(
  categoryKey: string = 'science',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  amount: number = 10
): Promise<TriviaQuestion[]> {
  try {
    const categoryId = CATEGORY_MAP[categoryKey] || 17;
    const url = `https://opentdb.com/api.php?amount=${amount}&category=${categoryId}&difficulty=${difficulty}&type=multiple`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('API server bilan aloqa uzildi');

    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      throw new Error('Savollar topilmadi');
    }

    return data.results.map((item: any, index: number) => {
      const decodedQuestion = decodeHTMLEntities(item.question);
      const decodedCorrect = decodeHTMLEntities(item.correct_answer);
      const decodedIncorrect = item.incorrect_answers.map((ans: string) => decodeHTMLEntities(ans));

      const options = [decodedCorrect, ...decodedIncorrect].sort(() => Math.random() - 0.5);

      return {
        id: `triv_${index}_${Date.now()}`,
        category: item.category,
        difficulty: item.difficulty,
        question: decodedQuestion,
        correctAnswer: decodedCorrect,
        options,
      };
    });
  } catch (error) {
    console.warn('[OpenTriviaService] API call failed, generating fallback questions:', error);
    return getFallbackQuestions();
  }
}

function getFallbackQuestions(): TriviaQuestion[] {
  return [
    {
      id: 'fb_1',
      category: 'Science',
      difficulty: 'medium',
      question: 'Yer sharidagi eng yirik okean qaysi?',
      correctAnswer: 'Tinch okeani',
      options: ['Tinch okeani', 'Atlantika okeani', 'Hind okeani', 'Shimoliy Muz okeani'],
    },
    {
      id: 'fb_2',
      category: 'Science',
      difficulty: 'easy',
      question: 'Suvning kimyoviy formulasi nima?',
      correctAnswer: 'H2O',
      options: ['H2O', 'CO2', 'NaCl', 'O2'],
    },
    {
      id: 'fb_3',
      category: 'Computers',
      difficulty: 'medium',
      question: 'Kompyuterning markaziy protsessori qanday qisqartiriladi?',
      correctAnswer: 'CPU',
      options: ['CPU', 'RAM', 'GPU', 'HDD'],
    },
  ];
}
