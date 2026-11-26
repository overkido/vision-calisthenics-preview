import { test } from 'node:test';
import { deepEqual, equal, match, throws } from 'node:assert/strict';
import { nutritionInsight, parseGoalDate, portion, sumNutrition } from '../src/vision/nutrition.ts';
import type { Meal } from '../src/vision/domain.ts';

test('calcula a porção e acompanha a meta escolhida pelo usuário', () => {
  const item = portion({ name: 'Frango', category: 'Proteína animal', grams: 150, calories: 160, protein: 30, carbs: 0, fat: 3 });
  const total = sumNutrition([item]);
  deepEqual(total, { calories: 240, protein: 45, carbs: 0, fat: 4.5 });
  const meal: Meal = { ...total, day: '2026-11-26', name: 'Almoço', ingredients: [item] };
  match(nutritionInsight([meal], { focus: 'Acompanhar proteínas', protein: 60 }), /Faltam 15 g.*Frango/);
  match(nutritionInsight([meal], { focus: 'Acompanhar proteínas', protein: 45 }), /atingiu/);
});
test('rejeita prazos impossíveis ou vencidos', () => {
  equal(parseGoalDate('15/12/2026','2026-11-26'),'2026-12-15');
  throws(() => parseGoalDate('31/11/2026','2026-11-26'));
  throws(() => parseGoalDate('15/11/2026','2026-11-26'));
});
