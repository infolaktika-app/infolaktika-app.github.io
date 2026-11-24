import type { TestAnswer, TestCorrect, TestQuestion } from './types';

export const LETTERS = 'ABCD';

export const isMulti = (q: { type?: string }) => q.type === 'multi';

/** Correct answer of a question: an index (single) or a sorted list of indexes (multi). */
export function correctOf(q: TestQuestion): TestCorrect {
  return isMulti(q) ? [...new Set(q.answers ?? [])].sort((a, b) => a - b) : q.answer;
}

/** Keeps only a valid answer for the question type (same rules as the database). */
export function cleanAnswer(q: { type?: string }, a: unknown): TestAnswer {
  const ok = (x: unknown) => typeof x === 'number' && [0, 1, 2, 3].includes(x);
  if (isMulti(q)) {
    if (!Array.isArray(a) || !a.length || !a.every(ok)) return null;
    return [...new Set(a as number[])].sort((x, y) => x - y);
  }
  return ok(a) ? (a as number) : null;
}

export function sameAnswer(a: TestAnswer | undefined, c: TestCorrect | undefined): boolean {
  if (a === null || a === undefined || c === undefined) return false;
  if (Array.isArray(c)) {
    if (!Array.isArray(a)) return false;
    const x = [...new Set(a)].sort((p, q) => p - q);
    return x.length === c.length && x.every((v, i) => v === c[i]);
  }
  return a === c;
}

export const hasAnswer = (a: TestAnswer | undefined) => (Array.isArray(a) ? a.length > 0 : a !== null && a !== undefined);

export const includesOpt = (a: TestAnswer | TestCorrect | undefined, j: number) => (Array.isArray(a) ? a.includes(j) : a === j);

/** Demo mode has no AI: a short, honest template explanation. */
export function demoExplain(q: TestQuestion): string {
  const c = correctOf(q);
  const list = (Array.isArray(c) ? c : [c]).map((i) => `${LETTERS[i]} — «${q.options[i]}»`).join(', ');
  return `Дұрыс жауап${Array.isArray(c) && c.length > 1 ? 'тар' : ''}: ${list}. (Демо режимі: нақты сайтта мұнда сұрақтың неге осылай екені қысқаша түсіндіріледі.)`;
}
