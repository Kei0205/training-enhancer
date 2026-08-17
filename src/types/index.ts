export interface WorkoutSet {
  weight: string; // can be "50kg" or "45lb"
  reps: number;
}

export interface ExerciseLog {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

export interface DailyWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  bodyPart: string; // e.g. "胸", "背中", "足", "肩・腕"
  exercises: ExerciseLog[];
}

export interface BodyWeightLog {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number;
}
