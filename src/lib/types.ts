export type Role = 'student' | 'admin';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  role: Role;
  avatar: string;
  xp: number;
  streak: number;
  best_streak: number;
  last_active: string | null;
  is_blocked: boolean;
  created_at: string;
  stream: string | null;
}

export interface Comic {
  id: string;
  title: string;
  description: string;
  category: string;
  cover_url: string | null;
  pdf_path: string;
  pages: number | null;
  published: boolean;
  created_at: string;
}

export interface Book extends Comic {
  author: string;
}

export type ItemType = 'comic' | 'book';

export type GameType =
  | 'quiz' | 'pairs' | 'code_puzzle' | 'find_mistake'
  | 'true_false' | 'drag_drop' | 'computer_parts' | 'maze';

export interface Game {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: GameType;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xp_reward: number;
  data: any;
  published: boolean;
  sort: number;
  created_at: string;
}

export interface GameResult {
  id: string;
  game_id: string;
  score: number;
  max_score: number;
  xp_earned: number;
  created_at: string;
}

export interface ReadingProgress {
  item_type: ItemType;
  item_id: string;
  last_page: number;
  total_pages: number;
  completed: boolean;
  updated_at: string;
}

export interface Achievement {
  code: string;
  title: string;
  description: string;
  icon: string;
  sort: number;
}

export interface EarnedAchievement { code: string; title: string; icon: string }

export interface RewardResult {
  xp: number;
  bonus: number;
  achievements: EarnedAchievement[];
  completed_now?: boolean;
  best?: number;
}

export interface Missions { game: boolean; read: boolean; daily: boolean; bonus: boolean }

export interface MyStats {
  xp: number;
  level: number;
  streak: number;
  best_streak: number;
  rank: number;
  games_completed: number;
  games_total: number;
  comics_read: number;
  comics_total: number;
  books_read: number;
  books_total: number;
  missions: Missions;
  week: { day: string; xp: number }[];
}

export interface DailyChallenge {
  id: number;
  question: string;
  options: string[];
  xp: number;
  done: boolean;
  correct: boolean | null;
  answer: number | null;
  explanation: string | null;
}

export interface LeaderRow {
  rank: number;
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Settings {
  motivational_message: string;
  xp_comic: number;
  xp_book: number;
  xp_daily: number;
  xp_missions: number;
}

export interface StudentRow {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  created_at: string;
  xp: number;
  level: number;
  streak: number;
  last_active: string | null;
  is_blocked: boolean;
  games_completed: number;
  comics_read: number;
  books_read: number;
  pages_read: number;
}

export interface StudentDetail {
  profile: Profile & { level: number };
  results: { title: string; type: GameType; score: number; max_score: number; xp_earned: number; created_at: string }[];
  reading: { item_type: ItemType; title: string; last_page: number; total_pages: number; completed: boolean; updated_at: string }[];
  achievements: { code: string; title: string; icon: string; earned_at: string }[];
}

export interface AdminStats {
  students: number;
  active_today: number;
  comics: number;
  books: number;
  games: number;
  games_completed: number;
  xp_total: number;
  popular_comics: { title: string; readers: number; finished: number }[];
  popular_books: { title: string; readers: number }[];
  popular_games: { title: string; plays: number; avg_pct: number | null }[];
  activity: { day: string; users: number; events: number }[];
  levels: { level: number; count: number }[];
}

export interface ContentInput {
  id?: string;
  title: string;
  description: string;
  category: string;
  author?: string;
  published: boolean;
  pages: number | null;
  pdfFile?: File | null;
  coverFile?: Blob | null;
}

export interface SignUpInput {
  first_name: string;
  last_name: string;
  username: string;
  password: string;
  stream: string;
}

export type ProfilePatch = Partial<Pick<Profile, 'first_name' | 'last_name' | 'avatar' | 'stream'>>;

export type QuestionType = 'single' | 'multi';
/** single: `answer` is the correct option; multi: `answers` lists every correct option. `explain` is shown after the attempt. */
export interface TestQuestion { q: string; options: string[]; type?: QuestionType; answer: number; answers?: number[]; explain?: string | null }
/** A student's answer: option index (single), list of indexes (multi) or null. */
export type TestAnswer = number | number[] | null;
export type TestCorrect = number | number[];

export interface Test {
  id: string;
  author_id: string | null;
  title: string;
  description: string;
  questions: TestQuestion[];
  published: boolean;
  /** Anyone with the link can take it without an account. */
  public_link: boolean;
  share_code: string;
  created_at: string;
  updated_at: string;
}

/** A survey opened by its share link (no answers). */
export interface PublicTest { id: string; title: string; description: string; questions: { q: string; options: string[]; type?: QuestionType }[] }

/** A guest's result (no account). Kept in the browser by attempt_id so a refresh shows it again. */
export interface GuestResult {
  attempt_id: string; name?: string; score: number; max_score: number;
  answers: TestAnswer[]; correct: TestCorrect[]; explain?: (string | null)[]; created_at?: string;
}

/** Everyone who took a survey (students + link guests), and per-question stats. */
export interface TestOverviewRow { kind: 'student' | 'guest'; id: string; name: string; avatar: string | null; stream: string | null; score: number; max_score: number; created_at: string }
export interface TestQuestionStat { index: number; q: string; type: QuestionType; options: string[]; correct: TestCorrect; total: number; right: number; picks: number[] }
export interface TestOverview { rows: TestOverviewRow[]; questions: TestQuestionStat[] }

export interface GuestResultRow { id: string; name: string; score: number; max_score: number; created_at: string }

export interface MyTestRow {
  id: string;
  title: string;
  description: string;
  question_count: number;
  created_at: string;
  score: number | null;
  max_score: number | null;
  done_at: string | null;
}

export interface TestAttempt { score: number; max_score: number; answers: TestAnswer[]; correct: TestCorrect[]; explain?: (string | null)[]; created_at: string }

export interface TestForStudent {
  id: string;
  title: string;
  description: string;
  questions: { q: string; options: string[]; type?: QuestionType }[];
  attempt: TestAttempt | null;
}

export interface TestSubmitResult extends RewardResult { score: number; max_score: number; correct: TestCorrect[]; explain?: (string | null)[] }

export interface GroupRatingRow {
  rank: number;
  id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  stream: string | null;
  points: number;
  tests_done: number;
}

export interface TestResultRow {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  stream: string | null;
  score: number;
  max_score: number;
  created_at: string;
}

export interface Material {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  description: string;
  file_path: string;
  file_name: string;
  mime: string;
  size: number;
  created_at: string;
  url: string | null;
}

export interface MaterialInput { title: string; description: string; file: File }

export interface AdminUserRow {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  stream: string | null;
  created_at: string;
  xp: number;
  level: number;
  last_active: string | null;
  is_blocked: boolean;
  tests_done: number;
  test_points: number;
}

export interface ComicReview { rating: number; comment: string; updated_at: string }
export interface ComicRatingRow { comic_id: string; avg_rating: number; reviews: number; comments: number }
export interface ComicReviewRow {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  stream: string | null;
  rating: number;
  comment: string;
  updated_at: string;
}

export type SuggestionTopic = 'comic' | 'material' | 'platform';
export interface SuggestionInput { topic: SuggestionTopic; target_id: string | null; body: string }
export interface Suggestion {
  id: string;
  user_id: string | null;
  author_name: string;
  stream: string | null;
  topic: SuggestionTopic;
  target_id: string | null;
  target_title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}
