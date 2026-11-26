export const levels = ['Iniciante', 'Intermediário', 'Avançado'] as const;
export const goals = ['Força', 'Hipertrofia', 'Resistência', 'Habilidades', 'Emagrecimento'];
export const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const equipment = ['Barra fixa', 'Paralelas', 'Elástico'];
export const limits = ['Punhos', 'Ombros', 'Joelhos', 'Lombar'];
export type Profile = {
  name: string; age: number; weight: number; height: number; waist?: number;
  goal: string; level: number; days: number[]; equipment: string[];
  limits: string[]; notes: string; pushups: number; plank: number; photo?: string;
};
export type Exercise = {
  id: string; name: string; group: string; level: number; gear: string;
  avoid: string[]; timed: boolean; steps: string[]; video?: string;
};
export type Move = { exercise: Exercise; sets: number; target: number; rest: number };
export type Workout = { title: string; moves: Move[]; id: string; day: string; seconds: number; sets: { id: string; amount: number; target: number }[] };
export type Measure = { day: string; weight: number; waist?: number };
export type Meal = { day: string; name: string; calories: number; protein: number; carbs: number; fat: number };
export type Targets = { water: number; calories: number; workouts: number };
export type Active = { title: string; moves: Move[]; index: number; set: number; sets: Workout['sets']; started: number; elapsed: number; clock: number | null; restUntil: number; restLeft: number };
export type Reminder = { day: number; hour: number; minute: number; notification?: string };
export type Data = {
  profile: Profile; workout: Workout; measure: Measure; meal: Meal; water: { day: string; ml: number };
  targets: Targets; active: Active | null; reminder: Reminder;
};
export type Kind = keyof Data;
export type Entry<K extends Kind = Kind> = { key: string; kind: K; value: Data[K] | null; pending?: boolean };
export const targets: Targets = { water: 2000, calories: 2000, workouts: 3 };
export function dateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export function weekStart(date = new Date()) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return dateKey(monday);
}
export function number(text: string, min: number, max: number, integer = false) {
  if (!/^\d+(?:[.,]\d+)?$/.test(text.trim())) throw new Error('Confira os valores numéricos.');
  const result = Number(text.replace(',', '.'));
  if (!Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result))) {
    throw new Error(`Use um valor ${integer ? 'inteiro ' : ''}entre ${min} e ${max}.`);
  }
  return result;
}
export function plan(profile: Profile, catalog: Exercise[], workouts: Workout[], day = new Date()): Move[] {
  // Free text restrictions need review before making a prescription.
  if (profile.notes.trim()) return [];
  const days = [...profile.days].sort((a, b) => (a + 6) % 7 - (b + 6) % 7);
  const slot = Math.max(0, days.indexOf(day.getDay()));
  const pushLevel = profile.pushups < 5 ? 0 : profile.level;
  const eligible = catalog.filter(e =>
    e.level <= (e.group === 'Empurrar' ? pushLevel : profile.level) &&
    (!e.gear || profile.equipment.includes(e.gear)) &&
    !e.avoid.some(limit => profile.limits.includes(limit)));
  const groups = profile.goal === 'Habilidades' ? ['Core', 'Puxar', 'Empurrar', 'Pernas'] : ['Empurrar', 'Puxar', 'Pernas', 'Core'];
  return groups.flatMap(group => {
    const pool = eligible.filter(e => e.group === group).sort((a, b) => b.level - a.level);
    const exercise = pool[slot % pool.length];
    if (!exercise) return [];
    const recent = workouts.filter(w => w.sets.some(s => s.id === exercise.id)).slice(0, 2);
    const last = recent[0]?.sets.filter(s => s.id === exercise.id) ?? [];
    const initial = exercise.timed
      ? Math.max(5, Math.min(30, Math.floor(profile.plank / 2)))
      : group === 'Empurrar' ? Math.max(3, Math.min(10, Math.floor(profile.pushups / 2))) : 6 + profile.level * 2;
    const baseline = last.length ? Math.max(...last.map(s => s.target)) : initial;
    const successful = recent.length === 2 && recent.every(w => {
      const series = w.sets.filter(s => s.id === exercise.id);
      return series.length >= 2 && series.every(s => s.target === baseline && s.amount >= s.target);
    });
    return [{
      exercise, target: Math.min(exercise.timed ? 60 : 20, baseline + (successful ? (exercise.timed ? 5 : 1) : 0)),
      sets: profile.goal === 'Hipertrofia' || profile.level === 2 ? 3 : 2,
      rest: profile.goal === 'Força' ? 90 : profile.goal === 'Resistência' ? 40 : 60,
    }];
  });
}
export function duration(active: Active, now: number) {
  return Math.floor((active.elapsed + (active.clock === null ? 0 : Math.max(0, now - active.clock))) / 1000);
}
export function restTime(active: Active, now: number) {
  return Math.ceil((active.clock === null ? active.restLeft : Math.max(0, active.restUntil - now)) / 1000);
}
export function toggleClock(active: Active, now: number): Active {
  if (active.clock === null) return { ...active, clock: now, restUntil: now + active.restLeft, restLeft: 0 };
  return { ...active, elapsed: active.elapsed + Math.max(0, now - active.clock), clock: null, restLeft: Math.max(0, active.restUntil - now) };
}
export function completeSet(active: Active, amount: number, now: number): Active {
  const move = active.moves[active.index];
  if (!move || active.clock === null || restTime(active, now) || !Number.isInteger(amount) || amount < 0) {
    throw new Error('Retome o treino e aguarde o descanso para registrar a série.');
  }
  const next = active.set + 1 >= move.sets;
  const index = active.index + Number(next);
  return {
    ...active, index, set: next ? 0 : active.set + 1,
    sets: [...active.sets, { id: move.exercise.id, amount, target: move.target }],
    restUntil: index < active.moves.length ? now + move.rest * 1000 : 0,
  };
}
export const performance = (ratio: number) => ratio >= 1 ? '#59A5FF' : ratio >= .75 ? '#00E676' : ratio >= .5 ? '#FAD05B' : ratio >= .25 ? '#FF9D55' : '#FF686F';
