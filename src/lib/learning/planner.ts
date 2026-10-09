export interface PlannerInput {
  examDate: string;
  minutesPerDay: number;
  organIds: string[];
  startDate: string;
  previewDays?: number;
}

export interface StudyBlock {
  period: "Morning" | "Afternoon" | "Evening" | "Final recall";
  focus: string;
  task: string;
  minutes: number;
}

export interface StudyDay {
  date: string;
  organs: string[];
  blocks: StudyBlock[];
}

function shift(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function buildStudyPlan(input: PlannerInput): StudyDay[] {
  const organs = input.organIds.slice(0, 12);
  if (organs.length === 0) return [];
  const span = Math.max(1, Math.min(120, daysBetween(input.startDate, input.examDate)));
  const preview = Math.min(span, input.previewDays ?? 14);
  const minutes = Math.max(30, input.minutesPerDay);
  const weights = [0.25, 0.3, 0.3, 0.15];
  const labels: StudyBlock["period"][] = ["Morning", "Afternoon", "Evening", "Final recall"];
  const tasks = [
    "Review the treatment-evolution pathway and name the trial that changed each step.",
    "Revise PICO cards: population, intervention, comparator, and primary endpoint.",
    "Answer original MCQs and record every miss in the error notebook.",
    "Recall verified hazard ratios, medians, and doses. Leave pending figures unread.",
  ];

  return Array.from({ length: preview }, (_, index) => {
    const dayOrgans = [0, 1, 2].map((offset) => organs[(index * 3 + offset) % organs.length]);
    const unique = [...new Set(dayOrgans)];
    while (unique.length < 3) unique.push(organs[unique.length % organs.length]);
    const blocks = labels.map((period, blockIndex) => ({
      period,
      focus: unique[blockIndex % unique.length],
      task: tasks[blockIndex],
      minutes: Math.max(8, Math.round(minutes * weights[blockIndex])),
    }));
    return { date: shift(input.startDate, index), organs: unique.slice(0, 3), blocks };
  });
}
