import { differenceInCalendarDays, parseISO, isValid, subDays, format } from 'date-fns';
import type { DailyWorkout, BodyWeightLog } from '../types';

const DETAIL_DAYS = 90;

const toTime = (date: string) => {
  const d = parseISO(date);
  return isValid(d) ? d.getTime() : 0;
};

const parseSetWeight = (weight: string | number) => {
  const wStr = typeof weight === 'string' ? weight : String(weight || 0);
  return parseFloat(wStr.replace(/[^0-9.]/g, '')) || 0;
};

const formatSigned = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;

// Builds the hidden context that is sent to the AI with each message,
// covering long-term trends rather than only the latest few sessions.
export const buildTrainingContext = (
  workouts: DailyWorkout[],
  weights: BodyWeightLog[],
  unit: 'lbs' | 'kg'
): string => {
  const today = new Date();
  const detailFrom = format(subDays(today, DETAIL_DAYS), 'yyyy-MM-dd');
  let text = '';

  // --- Body weight trend ---
  const sortedWeights = [...weights].filter(w => toTime(w.date) > 0).sort((a, b) => toTime(a.date) - toTime(b.date));
  text += `【体重の推移】（単位: ${unit}）\n`;
  if (sortedWeights.length === 0) {
    text += 'まだ記録がありません。\n';
  } else {
    const latest = sortedWeights[sortedWeights.length - 1];
    const first = sortedWeights[0];
    text += `最新: ${latest.date} ${latest.weight}${unit}\n`;

    // Closest record on or before N days ago, ignoring ones too far past that point
    const findOnOrBefore = (daysAgo: number) => {
      const target = format(subDays(today, daysAgo), 'yyyy-MM-dd');
      const earliest = format(subDays(today, daysAgo + Math.max(3, Math.round(daysAgo * 0.5))), 'yyyy-MM-dd');
      return [...sortedWeights].reverse().find(w => w.date <= target && w.date >= earliest);
    };
    [7, 30, 90].forEach(days => {
      const past = findOnOrBefore(days);
      if (past && past !== latest) {
        text += `${days}日前比: ${formatSigned(latest.weight - past.weight)}${unit}（${past.date} ${past.weight}${unit}）\n`;
      }
    });

    const spanDays = differenceInCalendarDays(parseISO(latest.date), parseISO(first.date));
    if (spanDays >= 7) {
      const perWeek = (latest.weight - first.weight) / spanDays * 7;
      text += `記録開始（${first.date} ${first.weight}${unit}）からの平均変化: ${formatSigned(perWeek)}${unit}/週\n`;
    }

    const recent = sortedWeights.filter(w => w.date >= detailFrom);
    if (recent.length > 0) {
      text += `直近${DETAIL_DAYS}日の記録: ` + recent.map(w => `${w.date.slice(5)} ${w.weight}`).join(', ') + '\n';
    }
  }

  // --- Per-exercise progression over the whole history ---
  const sortedWorkouts = [...workouts].filter(w => toTime(w.date) > 0).sort((a, b) => toTime(a.date) - toTime(b.date));
  const progress = new Map<string, { firstDate: string; firstBest: string; lastDate: string; lastBest: string; best: string; bestValue: number; sessions: number }>();
  sortedWorkouts.forEach(w => {
    (w.exercises || []).forEach(ex => {
      if (!ex?.name || !Array.isArray(ex.sets) || ex.sets.length === 0) return;
      const top = ex.sets.reduce((a, b) => (parseSetWeight(b.weight) > parseSetWeight(a.weight) ? b : a));
      const topText = `${top.weight}*${top.reps}`;
      const topValue = parseSetWeight(top.weight);
      const entry = progress.get(ex.name);
      if (!entry) {
        progress.set(ex.name, { firstDate: w.date, firstBest: topText, lastDate: w.date, lastBest: topText, best: topText, bestValue: topValue, sessions: 1 });
      } else {
        entry.lastDate = w.date;
        entry.lastBest = topText;
        entry.sessions += 1;
        if (topValue > entry.bestValue) {
          entry.best = topText;
          entry.bestValue = topValue;
        }
      }
    });
  });

  text += `\n【種目別の推移（全期間・各回の最高重量セット）】\n`;
  if (progress.size === 0) {
    text += 'まだ記録がありません。\n';
  } else {
    [...progress.entries()]
      .sort((a, b) => b[1].lastDate.localeCompare(a[1].lastDate))
      .forEach(([name, p]) => {
        text += `${name}: 初回 ${p.firstDate} ${p.firstBest} → 最新 ${p.lastDate} ${p.lastBest} / 自己ベスト ${p.best} / 計${p.sessions}回\n`;
      });
  }

  // --- Detailed log for recent period ---
  const recentWorkouts = sortedWorkouts.filter(w => w.date >= detailFrom).reverse();
  text += `\n【直近${DETAIL_DAYS}日のトレーニング記録】（計${recentWorkouts.length}回、新しい順）\n`;
  if (recentWorkouts.length === 0) {
    text += 'この期間の記録はありません。\n';
  } else {
    text += recentWorkouts.map(w => {
      let line = `${w.date} ${w.bodyPart}\n`;
      (w.exercises || []).forEach(ex => {
        if (ex?.name) {
          line += `${ex.name}: ` + ex.sets.map(s => `${s.weight}*${s.reps}`).join(', ') + '\n';
        }
      });
      return line;
    }).join('\n');
  }

  return text;
};
