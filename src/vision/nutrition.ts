import type { Meal, MealIngredient, NutritionGoal } from './domain';

export const mealTypes = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Outro'];
export const ingredientGroups = ['Proteína animal', 'Proteína vegetal', 'Carboidrato', 'Verdura ou legume', 'Fruta', 'Gordura', 'Outro'];
export const nutritionFocus = ['Organizar refeições', 'Apoiar o treino', 'Acompanhar proteínas', 'Acompanhar calorias'];

export function parseGoalDate(input: string, today: string) {
  const value = input.trim();
  if (!value) return undefined;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error('Use a data no formato DD/MM/AAAA.');
  const [,day,month,year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso || iso < today) throw new Error('Escolha uma data válida a partir de hoje.');
  return iso;
}
export const nutrients = ['calories', 'protein', 'carbs', 'fat'] as const;
export function sumNutrition(entries: Array<Pick<Meal, typeof nutrients[number]>>) {
  return entries.reduce((totals, entry) => {
    for (const key of nutrients) totals[key] += entry[key];
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
export function portion(input: MealIngredient): MealIngredient {
  const grams = input.grams / 100;
  return { ...input, calories: input.calories * grams, protein: input.protein * grams, carbs: input.carbs * grams, fat: input.fat * grams };
}
const format = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
export const serving = (value: number) => format.format(value);
export function nutritionInsight(meals: Meal[], goal?: NutritionGoal) {
  if (!meals.length) return 'Qual foi sua primeira refeição de hoje? Registre o prato ou os ingredientes para acompanhar seu dia.';
  const totals = sumNutrition(meals);
  const proteins = [...new Set(meals.flatMap(meal => (meal.ingredients ?? []).filter(ingredient => ingredient.category.startsWith('Proteína ')).map(ingredient => ingredient.name)))];
  const protein = goal?.protein ? (totals.protein < goal.protein
    ? `Você registrou ${serving(totals.protein)} g de proteína. Faltam ${serving(goal.protein - totals.protein)} g para a meta que você escolheu.`
    : `Você atingiu sua meta de proteína com ${serving(totals.protein)} g registrados hoje.`) : `Você registrou ${serving(totals.protein)} g de proteína hoje.`;
  return protein + (proteins.length ? ` Fontes no seu diário: ${proteins.slice(0, 4).join(', ')}.` : '');
}
