export interface QuizData {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    hint: string;
    optionsExplanations: string[]; // Specific explanation for each option index
  }
  
  export type Topic = 'Logic' | 'Math' | 'General Knowledge' | 'Science';
  
  export interface QuizState {
    view: 'TOPIC_SELECTION' | 'SUBTOPIC_SELECTION' | 'LOADING' | 'QUIZ' | 'ERROR' | 'SUMMARY';
    selectedTopic: Topic | null;
    subTopic: string | null;
    quizData: QuizData | null;
    questionQueue: QuizData[]; // Array to buffer multiple upcoming questions
    selectedOption: string | null;
    errorMsg: string | null;
    currentQuestionIndex: number;
    totalQuestions: number;
    score: number;
    hintsRemaining: number;
    hintRevealed: boolean;
    // New Timing Fields
    startTime: number | null;
    quizDuration: number; // in seconds
  }