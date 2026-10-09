import { addDays, todayIso } from "@/lib/utils";
import type { Flashcard, SrsState } from "@/lib/types";

export function initialSrsState(today = todayIso()): SrsState {
  return { ease: 2.5, interval: 0, repetitions: 0, due: today, lapses: 0 };
}

/** SM-2 review. Quality is 0–5. A score below 3 is a lapse. */
export function reviewCard(state: SrsState, quality: number, today = todayIso()): SrsState {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let ease = state.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  if (q < 3) {
    return {
      ease,
      interval: 1,
      repetitions: 0,
      due: addDays(today, 1),
      lapses: state.lapses + 1,
    };
  }

  const repetitions = state.repetitions + 1;
  let interval = 1;
  if (repetitions === 1) interval = 1;
  else if (repetitions === 2) interval = 6;
  else interval = Math.round(state.interval * ease);

  return {
    ease,
    interval,
    repetitions,
    due: addDays(today, interval),
    lapses: state.lapses,
  };
}

export function isDue(state: SrsState | undefined, today = todayIso()): boolean {
  if (!state) return true;
  return state.due <= today;
}

export function weakOrganIds(attempts: { organId: string; correct: boolean }[]): string[] {
  const stats = new Map<string, { correct: number; total: number }>();
  for (const attempt of attempts) {
    const row = stats.get(attempt.organId) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (attempt.correct) row.correct += 1;
    stats.set(attempt.organId, row);
  }
  return [...stats.entries()]
    .filter(([, row]) => row.total >= 2 && row.correct / row.total < 0.7)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .map(([organId]) => organId);
}

export function queueFlashcards(
  cards: Flashcard[],
  states: Record<string, SrsState>,
  weakOrgans: string[],
  today = todayIso(),
): Flashcard[] {
  const weak = new Set(weakOrgans);
  return cards
    .filter((card) => isDue(states[card.id], today))
    .sort((a, b) => {
      const aw = weak.has(a.organId) ? 0 : 1;
      const bw = weak.has(b.organId) ? 0 : 1;
      if (aw !== bw) return aw - bw;
      const ad = states[a.id]?.due ?? today;
      const bd = states[b.id]?.due ?? today;
      return ad.localeCompare(bd) || a.id.localeCompare(b.id);
    });
}
