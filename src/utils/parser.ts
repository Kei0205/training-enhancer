import type { DailyWorkout, ExerciseLog, WorkoutSet } from '../types';

// Supabase's workouts.id column is a uuid, so ids must be real UUIDs
const generateId = () => crypto.randomUUID();

// Strips markdown decoration and list markers the AI sometimes adds
const cleanLine = (line: string) =>
  line
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/, '')
    .replace(/^[・•]\s*|^-\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/[＊×✕]/g, '*')
    .trim();

// "7/6肩、腕", "2026/7/6 胸", "7月6日 背中", "7-6 足"
const HEADER_RE = /^(?:(\d{4})[/年-])?(\d{1,2})(?:\/|月|-)(\d{1,2})日?\s*[（(]?[月火水木金土日]?[)）]?\s*(.*)$/;

// "55*10*3", "55lb*10", "25lr*10*2", "-50*5", "55 x 10 x 3"
const SET_RE = /(-?[0-9]+(?:\.[0-9]+)?\s*(?:kg|lbs|lb|lr)?)\s*[*xX]\s*(\d+)(?:\s*[*xX]\s*(\d+))?/gi;

// Picks the year that puts the date closest to today (handles Dec → Jan suggestions)
const inferYear = (month: number, day: number) => {
  const now = new Date();
  const candidates = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  return candidates.reduce((best, y) => {
    const diff = Math.abs(new Date(y, month - 1, day).getTime() - now.getTime());
    const bestDiff = Math.abs(new Date(best, month - 1, day).getTime() - now.getTime());
    return diff < bestDiff ? y : best;
  });
};

const parseSets = (text: string): WorkoutSet[] => {
  const sets: WorkoutSet[] = [];
  for (const m of text.matchAll(SET_RE)) {
    const weight = m[1].replace(/\s+/g, '');
    const reps = parseInt(m[2]);
    const setsCount = m[3] ? parseInt(m[3]) : 1;
    for (let s = 0; s < setsCount; s++) {
      sets.push({ weight, reps });
    }
  }
  return sets;
};

export const parseAIWorkoutText = (text: string): DailyWorkout | null => {
  try {
    const lines = text.split('\n').map(cleanLine).filter(l => l.length > 0);
    if (lines.length < 2) return null;

    // Line 1: Date and BodyPart
    const headerMatch = lines[0].match(HEADER_RE);
    if (!headerMatch) return null;

    const month = parseInt(headerMatch[2]);
    const day = parseInt(headerMatch[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const year = headerMatch[1] ? parseInt(headerMatch[1]) : inferYear(month, day);
    const bodyPart = headerMatch[4].replace(/^[\s:：]+/, '').trim() || '全身';
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const exercises: ExerciseLog[] = [];
    let currentExerciseName = '';
    let currentSets: WorkoutSet[] = [];

    const pushCurrent = () => {
      if (currentExerciseName) {
        exercises.push({
          id: generateId(),
          name: currentExerciseName,
          sets: currentSets.length > 0 ? currentSets : [{ weight: '', reps: 10 }]
        });
      }
      currentExerciseName = '';
      currentSets = [];
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const firstSet = line.search(/-?[0-9]+(?:\.[0-9]+)?\s*(?:kg|lbs|lb|lr)?\s*[*xX]\s*\d/i);

      if (firstSet === -1) {
        // No set pattern: a new exercise name
        pushCurrent();
        currentExerciseName = line;
      } else if (firstSet === 0) {
        // Sets only, belonging to the current exercise
        if (currentExerciseName) currentSets.push(...parseSets(line));
      } else {
        // "ベンチプレス: 35*10*3" — name and sets on one line
        pushCurrent();
        currentExerciseName = line.slice(0, firstSet).replace(/[\s:：、,]+$/, '').trim();
        currentSets = parseSets(line.slice(firstSet));
      }
    }
    pushCurrent();

    if (exercises.length === 0) return null;

    return {
      id: generateId(),
      date: dateStr,
      bodyPart,
      exercises
    };

  } catch (e) {
    console.error('Failed to parse workout', e);
    return null;
  }
};
