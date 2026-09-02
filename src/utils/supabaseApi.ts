import { getSupabase } from '../lib/supabase';
import type { DailyWorkout } from '../types';

// Fallback to local storage if Supabase is not configured
const getLocalWorkouts = (): DailyWorkout[] => {
  const saved = localStorage.getItem('training_workouts');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  }
  return [];
};

const saveLocalWorkouts = (workouts: DailyWorkout[]) => {
  localStorage.setItem('training_workouts', JSON.stringify(workouts));
};

export const fetchWorkouts = async (): Promise<DailyWorkout[]> => {
  const supabase = getSupabase();
  if (!supabase) {
    return getLocalWorkouts();
  }

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching workouts:', error);
    return getLocalWorkouts(); // Fallback on error
  }

  return data.map(item => ({
    id: item.id,
    date: item.date,
    bodyPart: item.body_part,
    exercises: item.exercises
  }));
};

export const saveWorkout = async (workout: DailyWorkout): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) {
    const local = getLocalWorkouts();
    const existingIndex = local.findIndex(w => w.id === workout.id);
    if (existingIndex >= 0) {
      local[existingIndex] = workout;
    } else {
      local.unshift(workout);
    }
    saveLocalWorkouts(local);
    return true;
  }

  const { error } = await supabase
    .from('workouts')
    .upsert({
      id: workout.id,
      date: workout.date,
      body_part: workout.bodyPart,
      exercises: workout.exercises
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error saving workout (falling back to local):', error);
    const local = getLocalWorkouts();
    const existingIndex = local.findIndex(w => w.id === workout.id);
    if (existingIndex >= 0) {
      local[existingIndex] = workout;
    } else {
      local.unshift(workout);
    }
    saveLocalWorkouts(local);
    return true;
  }
  return true;
};

export const deleteWorkout = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) {
    const local = getLocalWorkouts().filter(w => w.id !== id);
    saveLocalWorkouts(local);
    return true;
  }

  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting workout (falling back to local):', error);
    const local = getLocalWorkouts().filter(w => w.id !== id);
    saveLocalWorkouts(local);
    return true;
  }
  return true;
};

// --- Body Weights ---

const getLocalWeights = (): import('../types').BodyWeightLog[] => {
  const saved = localStorage.getItem('training_weights');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  }
  return [];
};

const saveLocalWeights = (weights: import('../types').BodyWeightLog[]) => {
  localStorage.setItem('training_weights', JSON.stringify(weights));
};

export const fetchWeights = async (): Promise<import('../types').BodyWeightLog[]> => {
  const supabase = getSupabase();
  if (!supabase) {
    return getLocalWeights();
  }

  const { data, error } = await supabase
    .from('body_weights')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching weights:', error);
    return getLocalWeights();
  }

  return data.map(item => ({
    id: item.id,
    date: item.date,
    weight: item.weight
  }));
};

export const saveWeight = async (weightLog: import('../types').BodyWeightLog): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) {
    const local = getLocalWeights();
    const existingIndex = local.findIndex(w => w.date === weightLog.date);
    if (existingIndex >= 0) {
      local[existingIndex] = weightLog;
    } else {
      local.push(weightLog);
      local.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    saveLocalWeights(local);
    return true;
  }

  const { error } = await supabase
    .from('body_weights')
    .upsert({
      id: weightLog.id,
      date: weightLog.date,
      weight: weightLog.weight
    }, { onConflict: 'date' }); // Use date as unique conflict key

  if (error) {
    console.error('Error saving weight (falling back to local):', error);
    const local = getLocalWeights();
    const existingIndex = local.findIndex(w => w.date === weightLog.date);
    if (existingIndex >= 0) {
      local[existingIndex] = weightLog;
    } else {
      local.push(weightLog);
      local.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    saveLocalWeights(local);
    return true;
  }
  return true;
};
