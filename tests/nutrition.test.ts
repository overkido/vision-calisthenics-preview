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

import { coachReport } from '../src/vision/coachReport.ts';
test('relatório compara janelas locais adjacentes e preserva dias sem dados',()=>{
  const meal={name:'Feijão',protein:10,calories:100,carbs:12,fat:1};
  const meals=['2026-11-13','2026-11-14','2026-11-20','2026-11-20','2026-11-26','2026-11-27'].map(day=>({...meal,day}));
  const workouts=[{day:'2026-11-26',title:'A',id:'1',moves:[],sets:[],seconds:1200,partial:true}];
  const result=coachReport(meals,workouts,new Date(2026,10,26,18,0));
  equal(result.atual.diasComRefeicoes,2);equal(result.atual.proteinaPorDiaRegistrado,15);
  equal(result.anterior.refeicoes,2);equal(result.atual.minutosRegistrados,20);equal(result.atual.sessoesParciais,1);
  equal(coachReport([],[]).atual.kcalPorDiaRegistrado,null);
});
import { nextMeal } from '../src/vision/coachReport.ts';
test('troca orientação ao registrar treino e considera horário futuro',()=>{
  const today=new Date(2026,10,26,16,0);
  const report=coachReport([],[],today), routine={trainingTime:'18:30',preferences:''};
  match(nextMeal(report,[4],routine),/17h00/);
  report.hoje.treinos.push({nome:'A',minutos:30,parcial:false});
  match(nextMeal(report,[4],routine),/treino já está registrado/);
});
