import { test } from 'node:test';
import { deepEqual, equal, throws, ok } from 'node:assert/strict';
import { builtIn } from '../src/vision/catalog.ts';
import { completeSet, dateKey, duration, number, plan, restTime, toggleClock, waterEstimate, weekStart, type Active, type Profile, type Workout } from '../src/vision/domain.ts';

const profile: Profile = { name: 'Teste', age: 28, weight: 72, height: 175, goal: 'Força', level: 2,
  equipment: ['Barra fixa', 'Paralelas'], days: [1, 3, 5], limits: [], notes: '', pushups: 16, plank: 45 };
const monday = new Date(2026, 10, 23, 8);
test('personaliza sessão conforme agenda, equipamentos, resultado inicial e limitações', () => {
  const moves = plan(profile, builtIn, [], monday);
  ok(moves.some(m => m.exercise.id === 'pullup'));
  ok(moves.some(m => m.exercise.id === 'dip'));
  const beginner = plan({ ...profile, equipment: [], pushups: 0 }, builtIn, [], monday);
  ok(beginner.every(m => !m.exercise.gear));
  ok(beginner.some(m => m.exercise.id === 'wall'));
  const limited = plan({ ...profile, limits: ['Ombros'] }, builtIn, [], monday);
  ok(limited.every(m => !m.exercise.avoid.includes('Ombros')));
  deepEqual(plan({ ...profile, notes: 'Restrição não mapeada' }, builtIn, [], monday), []);
});
test('progride após duas sessões completas, mantendo a meta se houve falha', () => {
  const moves = plan(profile, builtIn, [], monday);
  const move = moves[0];
  const workouts: Workout[] = [1, 2].map(i => ({
    day: dateKey(monday), id: 'workout:' + i, title: 'Força', moves, seconds: 300,
    sets: Array.from({ length: move.sets }, () => ({ id: move.exercise.id, amount: move.target, target: move.target })),
  }));
  equal(plan(profile, builtIn, workouts, monday)[0].target, move.target + 1);
  workouts[1].sets[0].amount = 0;
  equal(plan(profile, builtIn, workouts, monday)[0].target, move.target);
});
test('preserva cronômetro e descanso ao pausar e retomar', () => {
  const moves = [{ ...plan(profile, builtIn, [], monday)[0], sets: 2 }];
  const active: Active = { title: 'Força', moves, started: 1000, clock: 1000, elapsed: 0, index: 0, set: 0, sets: [], restLeft: 0, restUntil: 0 };
  const first = completeSet(active, 7, 11000);
  equal(first.set, 1);
  equal(restTime(first, 11000), 90);
  throws(() => completeSet(first, 7, 12000));
  const paused = toggleClock(first, 21000);
  equal(duration(paused, 71000), 20);
  equal(restTime(paused, 71000), 80);
  const resumed = toggleClock(paused, 71000);
  const finished = completeSet(resumed, 7, 151000);
  equal(finished.index, 1);
  equal(duration(finished, 151000), 100);
  equal(finished.sets.length, 2);
});
test('valida campos em português e calcula a semana local', () => {
  equal(number('72,5', 25, 400), 72.5);
  throws(() => number('3,1', 1, 7, true));
  throws(() => number('1e3', 0, 2000));
  equal(weekStart(new Date(2026, 10, 29)), '2026-11-23');
});

test('estima água pelo peso recente e deixa perfis fora da faixa com meta manual', () => {
  equal(waterEstimate(28, 72), 2500);
  equal(waterEstimate(28, 100), 3500);
  equal(waterEstimate(17, 72), undefined);
  equal(waterEstimate(65, 72), undefined);
  equal(waterEstimate(28, 101), undefined);
});
