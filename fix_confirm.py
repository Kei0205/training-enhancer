import re

with open('src/components/WorkoutLogger.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add confirmation to delete workout
content = content.replace(
    'const handleDeleteWorkout = async (id: string) => {\n    const success = await deleteWorkout(id);\n    if (success) {\n      setWorkouts(workouts.filter(w => w.id !== id));\n    }\n  };',
    '''const handleDeleteWorkout = async (id: string) => {
    if (!window.confirm("この記録を削除してもよろしいですか？")) return;
    const success = await deleteWorkout(id);
    if (success) {
      setWorkouts(workouts.filter(w => w.id !== id));
    }
  };'''
)

# Add confirmation to delete exercise
content = content.replace(
    'const handleDeleteExercise = async (workoutId: string, exerciseId: string) => {\n    const updated = workouts.map(w => {\n      if (w.id === workoutId) {\n        return {\n          ...w,\n          exercises: w.exercises.filter(e => e.id !== exerciseId)\n        };\n      }\n      return w;\n    });\n    setWorkouts(updated);\n    \n  };',
    '''const handleDeleteExercise = async (workoutId: string, exerciseId: string) => {
    if (!window.confirm("この種目を削除してもよろしいですか？")) return;
    const updated = workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.filter(e => e.id !== exerciseId)
        };
      }
      return w;
    });
    setWorkouts(updated);
  };'''
)

with open('src/components/WorkoutLogger.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
