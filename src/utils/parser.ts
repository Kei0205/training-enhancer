import type { DailyWorkout, ExerciseLog, WorkoutSet } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const parseAIWorkoutText = (text: string): DailyWorkout | null => {
  try {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return null;

    // Line 1: Date and BodyPart (e.g. "7/6肩、腕" or "8/15 胸")
    const headerLine = lines[0];
    const headerMatch = headerLine.match(/^(\d{1,2})\/(\d{1,2})\s*(.*)$/);
    if (!headerMatch) return null;

    const month = parseInt(headerMatch[1]);
    const day = parseInt(headerMatch[2]);
    const bodyPart = headerMatch[3].trim() || '全身';

    const currentYear = new Date().getFullYear();
    const dateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const exercises: ExerciseLog[] = [];
    let currentExerciseName = '';
    let currentSets: WorkoutSet[] = [];

    // Parse the rest
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for weight*reps*sets pattern like "55*10*3" or "55*10"
      const setMatch = line.match(/^([0-9.]+)\s*\*?\s*(\d+)(?:\s*\*?\s*(\d+))?.*$/) || line.match(/^([0-9.]+(?:kg|lb|lr)?)\s*\*?\s*(\d+)(?:\s*\*?\s*(\d+))?.*$/i);
      
      if (setMatch && currentExerciseName) {
        const weight = setMatch[1];
        const reps = parseInt(setMatch[2]);
        const setsCount = setMatch[3] ? parseInt(setMatch[3]) : 1;
        
        for (let s = 0; s < setsCount; s++) {
          currentSets.push({ weight, reps });
        }
      } else if (!line.includes('*')) {
        // Assume it's a new exercise name if it doesn't have the sets pattern
        // Push the previous one if exists
        if (currentExerciseName) {
          exercises.push({
            id: generateId(),
            name: currentExerciseName,
            sets: currentSets.length > 0 ? currentSets : [{ weight: '', reps: 10 }]
          });
        }
        currentExerciseName = line;
        currentSets = [];
      }
    }

    // Push the last exercise
    if (currentExerciseName) {
      exercises.push({
        id: generateId(),
        name: currentExerciseName,
        sets: currentSets.length > 0 ? currentSets : [{ weight: '', reps: 10 }]
      });
    }

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
