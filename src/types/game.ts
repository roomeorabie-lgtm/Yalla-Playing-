export type CategoryKey = 'name' | 'animal' | 'plant' | 'object' | 'country';

export interface CategoryInfo {
  key: CategoryKey;
  label: string;
  icon: string;
  placeholder: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { key: 'name', label: 'اسم ولد أو بنت', icon: '👤', placeholder: 'اكتب إجابتك' },
  { key: 'animal', label: 'حيوان', icon: '🐾', placeholder: 'اكتب إجابتك' },
  { key: 'plant', label: 'نبات', icon: '🌿', placeholder: 'اكتب إجابتك' },
  { key: 'object', label: 'جماد', icon: '📦', placeholder: 'اكتب إجابتك' },
  { key: 'country', label: 'بلد', icon: '🌍', placeholder: 'اكتب إجابتك' },
];

export const ARABIC_LETTERS = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ',
  'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص',
  'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق',
  'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'
] as const;

export type GameStage = 
  | 'LOBBY' 
  | 'CHOOSING_LETTER' 
  | 'PLAYING' 
  | 'ROUND_RESULTS' 
  | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isConnected: boolean;
  totalScore: number;
  hasSubmitted: boolean;
}

export type AnswersMap = Record<CategoryKey, string>;

export interface CategoryScoreResult {
  answer: string;
  points: number; // 0, 5, or 10
  status: 'UNIQUE' | 'DUPLICATE' | 'INVALID_LETTER' | 'EMPTY' | 'MANUAL';
  duplicateWithNames?: string[];
  reason?: string;
}

export interface PlayerRoundScore {
  playerId: string;
  answers: Record<CategoryKey, CategoryScoreResult>;
  roundTotal: number;
}

export interface RoomState {
  code: string;
  targetScore: 150 | 250 | 450;
  stage: GameStage;
  currentRound: number;
  hostId: string;
  letterPickerId: string;
  currentLetter: string | null;
  usedLetters: string[];
  players: Player[];
  submissionsCount: number;
  totalActivePlayers: number;
  roundScores: Record<string, PlayerRoundScore>;
  winner: Player | null;
  countdownSeconds: number | null; // 5 -> 4 -> 3 -> 2 -> 1 -> 0
  firstSubmitterName: string | null;
}

export const AVATAR_OPTIONS = [
  { id: 'girl1', emoji: '👧' },
  { id: 'boy1', emoji: '👦' },
  { id: 'woman', emoji: '👩' },
  { id: 'man', emoji: '👨' },
  { id: 'queen', emoji: '👑' },
  { id: 'star', emoji: '⭐' },
  { id: 'fire', emoji: '🔥' },
  { id: 'sparkles', emoji: '✨' },
  { id: 'flower', emoji: '🌸' },
  { id: 'rocket', emoji: '🚀' },
  { id: 'cat', emoji: '🐱' },
  { id: 'crown2', emoji: '🪅' },
];
