import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Share2, Plus, Calendar as CalendarIcon, LayoutList, Download, FileUp } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, subMonths, addMonths, subWeeks, addWeeks, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts';
import type { DailyWorkout, BodyWeightLog } from '../types';
import { fetchWorkouts, fetchWeights, saveWeight } from '../utils/supabaseApi';

const Dashboard: React.FC = () => {
  const [workouts, setWorkouts] = useState<DailyWorkout[]>([]);
  const [weights, setWeights] = useState<BodyWeightLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [currentMonthStart, setCurrentMonthStart] = useState<Date>(startOfMonth(new Date()));
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const wData = await fetchWorkouts();
      setWorkouts(wData);
      const weightData = await fetchWeights();
      setWeights(weightData);
    };
    loadData();
  }, []);

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentMonthStart(subMonths(currentMonthStart, 1));
    else setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentMonthStart(addMonths(currentMonthStart, 1));
    else setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setCurrentMonthStart(startOfMonth(now));
    setCurrentWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
  };

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonthStart), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonthStart), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonthStart]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const workoutsThisMonth = useMemo(() => {
    return workouts.filter(w => {
      if (!w.date) return false;
      const d = parseISO(w.date);
      if (!isValid(d)) return false;
      return isSameMonth(d, currentMonthStart);
    }).length;
  }, [workouts, currentMonthStart]);

  const handleRestoreAutoBackup = () => {
    const workouts = localStorage.getItem('auto_backup_workouts');
    const weights = localStorage.getItem('auto_backup_weights');
    const date = localStorage.getItem('auto_backup_date');
    if (!workouts && !weights) { alert('自動バックアップデータがありません。明日以降に利用可能になります。'); return; }
    if (window.confirm(`前回の起動時（${date}）のデータを復元しますか？\n⚠️現在のデータは上書きされ、間違えて消してしまった直前の状態に戻せます。`)) {
      if (workouts) localStorage.setItem('training_workouts', workouts);
      if (weights) localStorage.setItem('training_weights', weights);
      alert('自動バックアップから復元しました！ページをリロードします。');
      window.location.reload();
    }
  };

  const handleExportData = () => {
    const workouts = localStorage.getItem('training_workouts') || '[]';
    const weights = localStorage.getItem('training_weights') || '[]';
    const data = { workouts: JSON.parse(workouts), weights: JSON.parse(weights) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training_enhancer_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.workouts) localStorage.setItem('training_workouts', JSON.stringify(data.workouts));
        if (data.weights) localStorage.setItem('training_weights', JSON.stringify(data.weights));
        alert('データをインポートしました！ページをリロードします。');
        window.location.reload();
      } catch (err) {
        alert('不正なバックアップファイルです。');
      }
    };
    reader.readAsText(file);
  };

  // The 7 days of the week containing the selected date for the volume chart
  const selectedWeekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [selectedDate]);

  // Volume Calculation
  const calculateVolume = (workout: DailyWorkout) => {
    if (!workout || !Array.isArray(workout.exercises)) return 0;
    return workout.exercises.reduce((total, ex) => {
      if (!ex || !Array.isArray(ex.sets)) return total;
      return total + ex.sets.reduce((setTotal, set) => {
        if (!set) return setTotal;
        const wStr = typeof set.weight === 'string' ? set.weight : String(set.weight || 0);
        const w = parseFloat(wStr.replace(/[^0-9.]/g, '')) || 0;
        return setTotal + (w * set.reps);
      }, 0);
    }, 0);
  };

  const selectedWorkout = useMemo(() => {
    if (!Array.isArray(workouts)) return undefined;
    return workouts.find(w => w.date === format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate, workouts]);

  const volumeChartData = useMemo(() => {
    return selectedWeekDays.map(date => {
      const dStr = format(date, 'yyyy-MM-dd');
      const w = Array.isArray(workouts) ? workouts.find(wo => wo.date === dStr) : undefined;
      return {
        dateStr: dStr,
        dayName: format(date, 'E', { locale: ja }),
        volume: w ? calculateVolume(w) : 0,
        isToday: isSameDay(date, new Date()),
        isSelected: isSameDay(date, selectedDate)
      };
    });
  }, [selectedWeekDays, workouts, selectedDate]);

  const totalWeeklyVolume = volumeChartData.reduce((acc, curr) => acc + curr.volume, 0);

  const weightChartData = useMemo(() => {
    if (!Array.isArray(weights) || weights.length === 0) return [];
    return weights.map(w => {
      if (!w.date) return { date: '', weight: w.weight };
      const d = parseISO(w.date);
      if (!isValid(d)) return { date: w.date, weight: w.weight };
      return {
        date: format(d, 'MM/dd'),
        weight: w.weight
      };
    });
  }, [weights]);

  const handleSaveWeight = async () => {
    if (!newWeight) return;
    const w = parseFloat(newWeight);
    if (isNaN(w)) return;
    
    const newLog: BodyWeightLog = {
      id: Date.now().toString(),
      date: format(selectedDate, 'yyyy-MM-dd'),
      weight: w
    };
    
    const success = await saveWeight(newLog);
    if (success) {
      const updated = await fetchWeights();
      setWeights(updated);
      setIsWeightModalOpen(false);
      setNewWeight('');
    }
  };

  const getExerciseSummary = (workout: DailyWorkout) => {
    if (!workout || !Array.isArray(workout.exercises)) return [];
    return workout.exercises.map(ex => {
      let maxWeight = 0;
      let totalVol = 0;
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(set => {
          if (!set) return;
          const wStr = typeof set.weight === 'string' ? set.weight : String(set.weight || 0);
          const w = parseFloat(wStr.replace(/[^0-9.]/g, '')) || 0;
          if (w > maxWeight) maxWeight = w;
          totalVol += w * set.reps;
        });
      }
      return { name: ex.name || '不明な種目', maxWeight, totalVol };
    });
  };

  const aiMessage = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const sortedWeights = [...(weights || [])].sort((a, b) => {
      const dA = parseISO(a.date);
      const dB = parseISO(b.date);
      return (isValid(dB) ? dB.getTime() : 0) - (isValid(dA) ? dA.getTime() : 0);
    });
    
    const lastWeight = sortedWeights[0];
    let weightMsg = '';
    let hasLoggedWeightToday = false;
    
    if (!lastWeight || !isValid(parseISO(lastWeight.date))) {
      weightMsg = 'まずは今日の体重を測って記録してみましょう！';
    } else {
      const todayTime = new Date();
      todayTime.setHours(0,0,0,0);
      const lastWeightTime = parseISO(lastWeight.date);
      lastWeightTime.setHours(0,0,0,0);
      
      const daysSinceWeight = Math.floor((todayTime.getTime() - lastWeightTime.getTime()) / (1000 * 3600 * 24));
      
      if (daysSinceWeight === 0) {
        hasLoggedWeightToday = true;
        weightMsg = `今日の体重は ${lastWeight.weight}kg ですね。バッチリ記録できています！`;
      } else if (daysSinceWeight <= 3) {
        weightMsg = `前回は${daysSinceWeight}日前に ${lastWeight.weight}kg でした。今日も忘れず測りましょう！`;
      } else {
        weightMsg = `体重を${daysSinceWeight}日間測っていません！現状を把握するためにも、今日測ってみませんか？`;
      }
    }

    const todayWorkout = Array.isArray(workouts) ? workouts.find(w => w.date === todayStr) : null;
    let workoutMsg = '';
    if (todayWorkout) {
      workoutMsg = '今日の筋トレもお疲れ様です！ゆっくり休んで筋肉を育てましょう💪';
    } else {
      const yesterdayStr = format(addDays(new Date(), -1), 'yyyy-MM-dd');
      const yesterdayWorkout = Array.isArray(workouts) ? workouts.find(w => w.date === yesterdayStr) : null;
      if (yesterdayWorkout) {
        workoutMsg = '昨日は筋トレ頑張りましたね！今日は無理せず回復にあててもOKです✨';
      } else {
        workoutMsg = '準備ができたら、今日もトレーニングを始めてみましょう！';
      }
    }

    return { weightMsg, workoutMsg, hasLoggedWeightToday };
  }, [weights, workouts]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* View Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', padding: '0 1rem' }}>
        <div style={{ display: 'flex', backgroundColor: 'var(--surface-color)', borderRadius: 'var(--radius-full)', padding: '0.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <button 
            onClick={() => setViewMode('week')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: 'none',
              backgroundColor: viewMode === 'week' ? 'white' : 'transparent',
              color: viewMode === 'week' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: viewMode === 'week' ? 700 : 600,
              boxShadow: viewMode === 'week' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            <LayoutList size={16} /> 週
          </button>
          <button 
            onClick={() => setViewMode('month')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', border: 'none',
              backgroundColor: viewMode === 'month' ? 'white' : 'transparent',
              color: viewMode === 'month' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: viewMode === 'month' ? 700 : 600,
              boxShadow: viewMode === 'month' ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}
          >
            <CalendarIcon size={16} /> 月
          </button>
        </div>
      </div>

      {/* AI Assistant Info Card */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.85)', borderLeft: '4px solid var(--accent-primary)' }}>
        <div style={{ flexShrink: 0 }}>
          <img src="/dog-icon.png" alt="AI Dog" style={{ width: '56px', height: '56px', borderRadius: '50%', boxShadow: 'var(--shadow-md)', border: '2px solid white', backgroundColor: 'white', objectFit: 'cover' }} />
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {aiMessage.workoutMsg}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>{aiMessage.weightMsg}</span>
            {!aiMessage.hasLoggedWeightToday && (
              <button 
                onClick={() => setIsWeightModalOpen(true)}
                style={{ 
                  background: 'var(--accent-primary)', color: 'white', border: 'none', 
                  padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', 
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(56, 189, 248, 0.3)'
                }}
              >
                📝 記録する
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0 1rem' }}>
        <button onClick={handlePrev} className="icon-button"><ChevronLeft size={24} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            {viewMode === 'month' ? format(currentMonthStart, 'yyyy年 M月') : format(currentWeekStart, 'yyyy年 M月')}
          </h2>
          {viewMode === 'month' && (
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.2rem' }}>
              今月の筋トレ：{workoutsThisMonth}回
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            onClick={handleToday}
            className="action-button secondary"
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', borderRadius: 'var(--radius-full)' }}
          >
            今日
          </button>
          <button onClick={handleNext} className="icon-button"><ChevronRight size={24} /></button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="glass-card" style={{ padding: '1.5rem 1rem', marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {['月', '火', '水', '木', '金', '土', '日'].map((day) => {
              let color = 'var(--text-secondary)';
              if (day === '土') color = '#38bdf8';
              if (day === '日') color = '#f43f5e';
              return (
                <div key={day} style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color }}>{day}</div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
            {calendarDays.map((date, i) => {
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              const hasWorkout = workouts.some(w => w.date === format(date, 'yyyy-MM-dd'));
              const inCurrentMonth = isSameMonth(date, currentMonthStart);
              
              return (
                <div 
                  key={i} 
                  onClick={() => setSelectedDate(date)}
                  style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '44px',
                    cursor: 'pointer',
                    opacity: inCurrentMonth ? 1 : 0.3
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : (isToday ? 'rgba(56, 189, 248, 0.2)' : 'transparent'),
                    color: isSelected ? 'white' : 'var(--text-primary)',
                    fontWeight: isSelected || hasWorkout ? 700 : 500,
                    border: isToday && !isSelected ? '2px solid var(--accent-primary)' : (hasWorkout && !isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent'),
                    position: 'relative'
                  }}>
                    {format(date, 'd')}
                    {hasWorkout && !isSelected && (
                      <div style={{ position: 'absolute', bottom: '-4px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 0.5rem', marginTop: '1.5rem' }}>
          {weekDays.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            const hasWorkout = workouts.some(w => w.date === format(date, 'yyyy-MM-dd'));
            const dayStr = format(date, 'E', { locale: ja });
            
            let color = 'var(--text-secondary)';
            if (dayStr === '土') color = '#38bdf8';
            if (dayStr === '日') color = '#f43f5e';

            return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(date)}
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color }}>{dayStr}</span>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isSelected ? 'var(--accent-primary)' : (isToday ? 'rgba(56, 189, 248, 0.2)' : 'transparent'),
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  fontWeight: isSelected ? 700 : 600,
                  border: isToday && !isSelected ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  position: 'relative'
                }}>
                  {format(date, 'd')}
                  {hasWorkout && !isSelected && (
                    <div style={{ position: 'absolute', bottom: '-4px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Volume Chart */}
      <div className="glass-card" style={{ padding: '2rem 1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>トレーニングボリューム</h3>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {totalWeeklyVolume.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>kg</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>選択した週の合計</p>
        
        <div style={{ height: '200px', width: '100%', marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                formatter={(value: any) => [`${value} kg`, 'Volume']}
              />
              <Bar 
                dataKey="volume" 
                radius={[4, 4, 4, 4]} 
                barSize={12}
              >
                {
                  volumeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isSelected ? 'var(--accent-primary)' : 'rgba(56, 189, 248, 0.4)'} />
                  ))
                }
              </Bar>
              <XAxis dataKey="dayName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Today's Training */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💪</span>
            {isSameDay(selectedDate, new Date()) ? '今日のトレーニング' : `${format(selectedDate, 'M/d')}のトレーニング`}
          </h3>
          <button className="action-button secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: 'var(--radius-full)' }}>
            <Share2 size={16} style={{ marginRight: '0.25rem' }} /> シェア
          </button>
        </div>

        {selectedWorkout ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {getExerciseSummary(selectedWorkout).map((ex, i) => (
              <div key={i} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{ex.name}</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', backgroundColor: 'var(--accent-primary)', color: 'white', borderRadius: '4px' }}>
                      {selectedWorkout.bodyPart}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Total: {ex.totalVol.toLocaleString()} vol.
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Max</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ex.maxWeight} kg</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            この日のトレーニング記録はありません。🐾
          </div>
        )}
      </div>

      {/* Weight Chart */}
      <div className="glass-card" style={{ padding: '2rem 1.5rem', marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🐈</span>
            体重推移
          </h3>
          <button 
            onClick={() => setIsWeightModalOpen(true)}
            className="action-button primary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: 'var(--radius-full)' }}
          >
            <Plus size={16} style={{ marginRight: '0.25rem' }} /> 記録
          </button>
        </div>

        {weightChartData.length > 0 ? (
          <div style={{ height: '250px', width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                  formatter={(value: any) => [`${value} kg`, 'Weight']}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="var(--accent-primary)" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--accent-primary)', strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            体重の記録がありません。「記録」ボタンから追加してください。
          </div>
        )}
      </div>

      {/* Weight Modal */}
      {isWeightModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '400px', padding: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>体重を記録 ({format(selectedDate, 'M/d')})</h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
              <input 
                type="number" 
                step="0.1"
                placeholder="0.0"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                style={{ flex: 1, fontSize: '1.5rem', textAlign: 'center', padding: '0.75rem' }}
                autoFocus
              />
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>kg</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setIsWeightModalOpen(false)}
                className="action-button secondary" 
                style={{ flex: 1 }}
              >
                キャンセル
              </button>
              <button 
                onClick={handleSaveWeight}
                className="action-button primary" 
                style={{ flex: 1 }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Settings */}
      <div className="glass-card" style={{ marginTop: '2rem', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
        <h3 className="card-title" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download className="h-6 w-6" style={{ color: '#0ea5e9' }} />
          データのバックアップ・復元
        </h3>
        
        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>⏱️ 自動バックアップ（1日保存）</h4>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
            毎日アプリを開いた時に、自動的にその時点のデータが「1日前」として保存されます。間違えてデータを消してしまった場合は、ここから昨日の状態に戻せます。
          </p>
          <button className="action-button secondary" onClick={handleRestoreAutoBackup} style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', fontWeight: 600 }}>
            昨日の状態に復元する
          </button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>💾 手動エクスポート</h4>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
            全てのデータをスマホ本体にファイルとして保存します。
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="action-button primary" onClick={handleExportData} style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}>
              <Download size={18} />
              ファイルに保存
            </button>
            
            <div>
              <input 
                type="file" 
                accept=".json" 
                id="import-file" 
                style={{ display: 'none' }} 
                onChange={handleImportData} 
              />
              <label htmlFor="import-file" className="action-button secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                <FileUp size={18} />
                ファイルから復元
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
