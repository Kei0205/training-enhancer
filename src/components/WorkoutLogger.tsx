import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, Check, Dumbbell, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import type { DailyWorkout } from '../types';
import { fetchWorkouts, saveWorkout, deleteWorkout } from '../utils/supabaseApi';

const BODY_PARTS = ['胸', '背中', '足', '肩・腕', '全身', 'オフ'];

const EXERCISE_SUGGESTIONS: Record<string, string[]> = {
  '胸': ['チェストプレス', 'ベンチプレス', 'インクラインベンチプレス', 'ペックフライ', 'ケーブルクロスオーバー', 'ディップマシン'],
  '背中': ['ラットプルダウン', 'シーテッドロー', 'ベントオーバーロー', 'デッドリフト', 'チンニング', 'ローロー', 'シーテッドミッドロー'],
  '足': ['スクワット', 'レッグプレス', 'レッグエクステンション', 'レッグカール', 'カーフレイズ', 'インナータイ', 'アウタータイ', 'スクワットマシン'],
  '肩・腕': ['ショルダープレス', 'サイドレイズ', 'フロントレイズ', 'プリーチャーカール', 'ダンベルカール', 'ケーブルプレスダウン', 'フレンチプレス', 'デルトイドフライ'],
  '全身': ['バーピー', 'クリーン', 'スナッチ'],
};
const WorkoutLogger: React.FC = () => {
  const [workouts, setWorkouts] = useState<DailyWorkout[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({});
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const newWorkout: DailyWorkout = {
      id: generateId(),
      date: dateStr,
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

  // Calendar render helpers
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "d";
    const rows = [];

    let days = [];
    let day = startDate;
    let formattedDate = "";

    // Header (Mon, Tue, etc.)
    const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const headerRow = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }} key="header">
        {weekDays.map(wd => (
          <div key={wd} style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {wd}
          </div>
        ))}
      </div>
    );

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dateStr = format(cloneDay, 'yyyy-MM-dd');
        
        // Find workouts for this day
        const dayWorkouts = workouts.filter(w => w.date === dateStr);
        
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        
        days.push(
          <div
            key={day.toString()}
            onClick={() => setSelectedDate(cloneDay)}
            style={{
              padding: '0.5rem',
              minHeight: '60px',
              background: isSelected ? 'var(--accent-primary)' : (isCurrentMonth ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'),
              color: isSelected ? 'white' : 'var(--text-primary)',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: isSelected ? '0 4px 12px rgba(56, 189, 248, 0.4)' : '0 2px 5px rgba(0,0,0,0.02)',
              border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.5)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? 700 : 500, alignSelf: 'flex-end' }}>
              {formattedDate}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              {dayWorkouts.map(dw => (
                <div key={dw.id} style={{ 
                  fontSize: '0.7rem', 
                  background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--accent-light)', 
                  color: isSelected ? 'white' : 'var(--accent-hover)',
                  padding: '2px 4px', 
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {dw.bodyPart}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }} key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={20} />
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="action-button secondary" style={{ padding: '0.5rem' }} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft size={20} />
            </button>
            <button className="action-button secondary" style={{ padding: '0.5rem' }} onClick={() => {
              const now = new Date();
              setCurrentMonth(now);
              setSelectedDate(now);
            }}>
              Today
            </button>
            <button className="action-button secondary" style={{ padding: '0.5rem' }} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        {headerRow}
        {rows}
      </div>
    );
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedWorkouts = workouts.filter(w => w.date === selectedDateStr);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Workout Logger</h2>
      </div>

      {renderCalendar()}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
          {format(selectedDate, 'MMM d, yyyy')}
        </h3>
        <button className="action-button primary" onClick={handleAddWorkout}>
          <Plus size={18} />
          Add Workout
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {selectedWorkouts.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <Dumbbell size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>No workouts on this date.</p>
            <p>Click "Add Workout" to log something!</p>
          </div>
        ) : (
          selectedWorkouts.map(workout => {
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
                          list={`exercises-for-${workout.id}`}
                          placeholder="Exercise Name (e.g. Bench Press)"
                          value={exercise.name}
                          onChange={e => handleUpdateExercise(workout.id, exercise.id, e.target.value)}
                          style={{ flex: 1, marginRight: '1rem', fontWeight: 600, fontSize: '1.05rem', padding: '0.5rem 0.75rem' }}
                        />
                        <datalist id={`exercises-for-${workout.id}`}>
                          {(EXERCISE_SUGGESTIONS[workout.bodyPart] || []).map(suggestion => (
                            <option key={suggestion} value={suggestion} />
                          ))}
                        </datalist>
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
                  <button 
                    className="action-button primary" 
                    onClick={() => toggleEdit(workout.id)} 
                    title="Done Editing"
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
                  >
                    <Check size={18} /> Done
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WorkoutLogger;
