import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, Dumbbell } from 'lucide-react';
import type { DailyWorkout } from '../types';
import { fetchWorkouts, saveWorkout, deleteWorkout } from '../utils/supabaseApi';

const BODY_PARTS = ['胸', '背中', '足', '肩・腕', '全身', 'オフ'];

const WorkoutLogger: React.FC = () => {
  const [workouts, setWorkouts] = useState<DailyWorkout[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});

  const toggleEdit = (id: string) => setEditingIds(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    const data = await fetchWorkouts();
    setWorkouts(data);
  };

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleAddWorkout = async () => {
    const newWorkout: DailyWorkout = {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      bodyPart: '胸',
      exercises: []
    };
    const newWorkouts = [newWorkout, ...workouts];
    setWorkouts(newWorkouts);
    setEditingIds(prev => ({ ...prev, [newWorkout.id]: true }));
    await saveWorkout(newWorkout);
  };

  const handleDeleteWorkout = async (id: string) => {
    setWorkouts(workouts.filter(w => w.id !== id));
    await deleteWorkout(id);
  };

  const handleAddExercise = async (workoutId: string) => {
    const updated = workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: [...w.exercises, { id: generateId(), name: '', sets: [{ weight: '', reps: 10 }] }]
        };
      }
      return w;
    });
    setWorkouts(updated);
    const target = updated.find(w => w.id === workoutId);
    if (target) await saveWorkout(target);
  };

  const handleUpdateWorkout = async (workoutId: string, field: 'date' | 'bodyPart', value: string) => {
    const updated = workouts.map(w => w.id === workoutId ? { ...w, [field]: value } : w);
    setWorkouts(updated);
    const target = updated.find(w => w.id === workoutId);
    if (target) await saveWorkout(target);
  };

  const handleUpdateExercise = async (workoutId: string, exerciseId: string, name: string) => {
    const updated = workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(e => e.id === exerciseId ? { ...e, name } : e)
        };
      }
      return w;
    });
    setWorkouts(updated);
    const target = updated.find(w => w.id === workoutId);
    if (target) await saveWorkout(target);
  };

  const handleUpdateSet = async (workoutId: string, exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => {
    const updated = workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(e => {
            if (e.id === exerciseId) {
              const newSets = [...e.sets];
              newSets[setIndex] = { ...newSets[setIndex], [field]: field === 'reps' ? parseInt(value) || 0 : value };
              return { ...e, sets: newSets };
            }
            return e;
          })
        };
      }
      return w;
    });
    setWorkouts(updated);
    const target = updated.find(w => w.id === workoutId);
    if (target) await saveWorkout(target);
  };

  const handleAddSet = async (workoutId: string, exerciseId: string) => {
    const updated = workouts.map(w => {
      if (w.id === workoutId) {
        return {
          ...w,
          exercises: w.exercises.map(e => {
            if (e.id === exerciseId) {
              const lastSet = e.sets[e.sets.length - 1] || { weight: '', reps: 10 };
              return { ...e, sets: [...e.sets, { ...lastSet }] };
            }
            return e;
          })
        };
      }
      return w;
    });
    setWorkouts(updated);
    const target = updated.find(w => w.id === workoutId);
    if (target) await saveWorkout(target);
  };

  const handleDeleteExercise = async (workoutId: string, exerciseId: string) => {
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
    const target = updated.find(w => w.id === workoutId);
    if (target) await saveWorkout(target);
  };

  const generateAIFormat = (workout: DailyWorkout) => {
    const dateObj = new Date(workout.date);
    const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    
    let text = `${dateStr}${workout.bodyPart}\n`;
    
    workout.exercises.forEach(ex => {
      if (!ex.name) return;
      text += `${ex.name}\n`;
      
      const setGroups: { weight: string, reps: number, count: number }[] = [];
      ex.sets.forEach(s => {
        const lastGroup = setGroups[setGroups.length - 1];
        if (lastGroup && lastGroup.weight === s.weight && lastGroup.reps === s.reps) {
          lastGroup.count += 1;
        } else {
          setGroups.push({ weight: s.weight, reps: s.reps, count: 1 });
        }
      });
      
      const setStrings = setGroups.map(g => {
        if (g.count > 1) {
          return `${g.weight}*${g.reps}*${g.count}`;
        }
        return `${g.weight}*${g.reps}`;
      });
      
      text += `${setStrings.join(', ')}\n\n`;
    });
    
    return text.trim();
  };

  const handleCopy = (workout: DailyWorkout) => {
    const text = generateAIFormat(workout);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(workout.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Workout Logger</h2>
        <button className="action-button primary" onClick={handleAddWorkout}>
          <Plus size={18} />
          Add Workout
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {workouts.map(workout => {
          const isEditing = editingIds[workout.id];
          
          if (!isEditing) {
            return (
              <div key={workout.id} className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))', cursor: 'pointer' }} onClick={() => toggleEdit(workout.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    {workout.date.replace(/-/g, '/')} <span style={{ color: 'var(--accent-hover)', marginLeft: '0.5rem' }}>[{workout.bodyPart}]</span>
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="action-button secondary" 
                      onClick={(e) => { e.stopPropagation(); handleCopy(workout); }}
                      title="Copy in AI Format"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                    >
                      {copiedId === workout.id ? <Check size={16} className="text-success" style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                      Copy
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {workout.exercises.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>No exercises added</p>
                  ) : (
                    workout.exercises.map(ex => (
                      <div key={ex.id} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{ex.name || 'Unnamed Exercise'}:</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                          {ex.sets.map(s => `${s.weight}×${s.reps}`).join(', ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          }

          return (
          <div key={workout.id} className="glass-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input
                  type="date"
                  value={workout.date}
                  onChange={e => handleUpdateWorkout(workout.id, 'date', e.target.value)}
                  style={{ fontWeight: 600, width: '160px' }}
                />
                <select
                  value={workout.bodyPart}
                  onChange={e => handleUpdateWorkout(workout.id, 'bodyPart', e.target.value)}
                  style={{ fontWeight: 600, width: '120px' }}
                >
                  {BODY_PARTS.map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="action-button secondary" 
                  onClick={() => handleCopy(workout)}
                  title="Copy in AI Format"
                >
                  {copiedId === workout.id ? <Check size={18} className="text-success" style={{ color: 'var(--success)' }} /> : <Copy size={18} />}
                  Copy
                </button>
                <button 
                  className="action-button secondary" 
                  onClick={() => handleDeleteWorkout(workout.id)} 
                  style={{ color: 'var(--warning)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  className="action-button primary" 
                  onClick={() => toggleEdit(workout.id)} 
                  title="Done Editing"
                >
                  <Check size={18} /> Done
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {workout.exercises.map((exercise) => (
                <div key={exercise.id} style={{ 
                  background: 'rgba(255,255,255,0.6)', 
                  border: '1px solid rgba(255,255,255,0.9)',
                  padding: '1rem', 
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Exercise Name (e.g. Bench Press)"
                      value={exercise.name}
                      onChange={e => handleUpdateExercise(workout.id, exercise.id, e.target.value)}
                      style={{ flex: 1, marginRight: '1rem', fontWeight: 600, fontSize: '1.05rem', padding: '0.5rem 0.75rem' }}
                    />
                    <button 
                      onClick={() => handleDeleteExercise(workout.id, exercise.id)} 
                      style={{ color: 'var(--text-muted)', background: 'transparent', padding: '0.4rem', borderRadius: '50%' }}
                      title="Delete Exercise"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    {exercise.sets.map((set, sIndex) => (
                      <div key={sIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.4)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, width: '16px' }}>{sIndex + 1}.</span>
                        <input
                          type="text"
                          placeholder="lbs"
                          value={set.weight}
                          onChange={e => handleUpdateSet(workout.id, exercise.id, sIndex, 'weight', e.target.value)}
                          style={{ width: '60px', padding: '0.4rem', fontSize: '0.95rem', textAlign: 'center' }}
                        />
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem' }}>×</span>
                        <input
                          type="number"
                          placeholder="Reps"
                          value={set.reps}
                          onChange={e => handleUpdateSet(workout.id, exercise.id, sIndex, 'reps', e.target.value)}
                          style={{ width: '60px', padding: '0.4rem', fontSize: '0.95rem', textAlign: 'center' }}
                        />
                      </div>
                    ))}
                    <button 
                      onClick={() => handleAddSet(workout.id, exercise.id)}
                      style={{ 
                        fontSize: '0.85rem', color: 'var(--accent-hover)', background: 'transparent', fontWeight: 600,
                        padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(56, 189, 248, 0.5)'
                      }}
                    >
                      + Set
                    </button>
                  </div>
                </div>
              ))}

              <button 
                className="action-button secondary" 
                onClick={() => handleAddExercise(workout.id)}
                style={{ width: '100%', borderStyle: 'dashed', borderColor: 'var(--accent-primary)', color: 'var(--accent-hover)', background: 'rgba(255,255,255,0.5)' }}
              >
                <Plus size={18} />
                Add Exercise
              </button>
            </div>
          </div>
          );
        })}
        
        {workouts.length === 0 && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <Dumbbell size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>No workouts recorded yet.</p>
            <p>Click "Add Workout" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutLogger;
