import re

with open('src/utils/supabaseApi.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# fetchWorkouts
content = content.replace(
    '''  return data.map(item => ({
    id: item.id,
    date: item.date,
    bodyPart: item.body_part,
    exercises: item.exercises
  }));''',
    '''  const parsedData = data.map(item => ({
    id: item.id,
    date: item.date,
    bodyPart: item.body_part,
    exercises: item.exercises
  }));
  saveLocalWorkouts(parsedData);
  return parsedData;'''
)

# saveWorkout
content = content.replace(
    '''  if (error) {
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
  return true;''',
    '''  const local = getLocalWorkouts();
  const existingIndex = local.findIndex(w => w.id === workout.id);
  if (existingIndex >= 0) {
    local[existingIndex] = workout;
  } else {
    local.unshift(workout);
  }
  saveLocalWorkouts(local);

  if (error) {
    console.error('Error saving workout (falling back to local):', error);
    return false;
  }
  return true;'''
)

# deleteWorkout
content = content.replace(
    '''  if (error) {
    console.error('Error deleting workout (falling back to local):', error);
    const local = getLocalWorkouts().filter(w => w.id !== id);
    saveLocalWorkouts(local);
    return true;
  }
  return true;''',
    '''  const local = getLocalWorkouts().filter(w => w.id !== id);
  saveLocalWorkouts(local);

  if (error) {
    console.error('Error deleting workout (falling back to local):', error);
    return false;
  }
  return true;'''
)

# fetchWeights
content = content.replace(
    '''  return data.map(item => ({
    id: item.id,
    date: item.date,
    weight: item.weight
  }));''',
    '''  const parsedData = data.map(item => ({
    id: item.id,
    date: item.date,
    weight: item.weight
  }));
  saveLocalWeights(parsedData);
  return parsedData;'''
)

# saveWeight
content = content.replace(
    '''  if (error) {
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
  return true;''',
    '''  const local = getLocalWeights();
  const existingIndex = local.findIndex(w => w.date === weightLog.date);
  if (existingIndex >= 0) {
    local[existingIndex] = weightLog;
  } else {
    local.push(weightLog);
    local.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  saveLocalWeights(local);

  if (error) {
    console.error('Error saving weight (falling back to local):', error);
    return false;
  }
  return true;'''
)

content += '''
export const deleteWeight = async (id: string): Promise<boolean> => {
  const supabase = getSupabase();
  
  const local = getLocalWeights().filter(w => w.id !== id);
  saveLocalWeights(local);

  if (!supabase) {
    return true;
  }

  const { error } = await supabase
    .from('body_weights')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting weight (falling back to local):', error);
    return false;
  }
  return true;
};
'''

with open('src/utils/supabaseApi.ts', 'w', encoding='utf-8') as f:
    f.write(content)
