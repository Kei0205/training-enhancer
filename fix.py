import re

with open('src/components/WorkoutLogger.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. ToggleEdit
content = content.replace(
    'const toggleEdit = (id: string) => setEditingIds(prev => ({ ...prev, [id]: !prev[id] }));',
    '''const toggleEdit = async (id: string) => {
    if (editingIds[id]) {
      const target = workouts.find(w => w.id === id);
      if (target) await saveWorkout(target);
    }
    setEditingIds(prev => ({ ...prev, [id]: !prev[id] }));
  };'''
)

# 2. Remove automatic saves
content = re.sub(
    r'const target = updated\.find\(w => w\.id === workoutId\);\s*if \(target\) await saveWorkout\(target\);',
    '',
    content
)

# 3. UUID
content = content.replace(
    'const generateId = () => Math.random().toString(36).substring(2, 9);',
    'const generateId = () => crypto.randomUUID();'
)

# 4. Date parsing in AI generator
content = content.replace(
    'const dateObj = new Date(workout.date);\n    const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;',
    'const [, month, day] = workout.date.split(\'-\');\n    const dateStr = `${parseInt(month, 10)}/${parseInt(day, 10)}`;'
)

# 5. lbs to kg
content = content.replace('placeholder="lbs"', 'placeholder="kg"')

with open('src/components/WorkoutLogger.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
