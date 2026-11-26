import { VisionNutri } from './VisionNutri';
import { useState } from 'react';
import { View } from 'react-native';
import { Notice } from '../components/ui';
import { dateKey, number, targets, type MealIngredient } from './domain';
import { ingredientGroups, mealTypes, nutritionFocus, nutritionInsight, parseGoalDate, portion, serving, sumNutrition } from './nutrition';
import { newKey, type Store } from './store';
import { Button, Caption, Card, Field, Meter, NumberField, Options, row, stack, Subtitle, Tag } from './ui';

type Panel = 'Chat' | 'Resumo' | 'Registrar prato' | 'Minha meta';
type Values = { calories: string; protein: string; carbs: string; fat: string };
const blank: Values = { calories: '', protein: '', carbs: '', fat: '' };
function values(fields: Values) {
  return {
    calories: number(fields.calories || '0', 0, 10000),
    protein: number(fields.protein || '0', 0, 1000),
    carbs: number(fields.carbs || '0', 0, 1000),
    fat: number(fields.fat || '0', 0, 1000),
  };
}
function NutrientFields({ fields, set, suffix }: { fields: Values; set: (v: Values) => void; suffix: string }) {
  return <>
    <NumberField label={'Energia (kcal)' + suffix} value={fields.calories} set={v => set({ ...fields, calories: v })} />
    <NumberField label={'Proteína (g)' + suffix} value={fields.protein} set={v => set({ ...fields, protein: v })} />
    <NumberField label={'Carboidrato (g)' + suffix} value={fields.carbs} set={v => set({ ...fields, carbs: v })} />
    <NumberField label={'Gordura (g)' + suffix} value={fields.fat} set={v => set({ ...fields, fat: v })} />
  </>;
}
export function NutritionAssistant({ store }: { store: Store }) {
  const [panel, setPanel] = useState<Panel>('Chat');
  const [error, setError] = useState('');
  const goal = store.get('targets')?.nutrition;
  const [focus, setFocus] = useState(goal?.focus ?? nutritionFocus[0]);
  const [deadline, setDeadline] = useState(goal?.by?.split('-').reverse().join('/') ?? '');
  const [protein, setProtein] = useState(goal?.protein?.toString() ?? '');
  const [energy, setEnergy] = useState(goal?.calories?.toString() ?? '');
  const [dish, setDish] = useState('');
  const [mealType, setMealType] = useState('Almoço');
  const [method, setMethod] = useState('Por ingredientes');
  const [mealValues, setMealValues] = useState<Values>(blank);
  const [ingredientValues, setIngredientValues] = useState<Values>(blank);
  const [ingredient, setIngredient] = useState('');
  const [grams, setGrams] = useState('');
  const [category, setCategory] = useState(ingredientGroups[0]);
  const [items, setItems] = useState<MealIngredient[]>([]);
  const day = dateKey();
  const history = store.list('meal');
  const todays = history.filter(entry => entry.value.day === day);
  const totals = sumNutrition(todays.map(entry => entry.value));
  const draft = sumNutrition(items);
  const ordered = history.slice().reverse().sort((a,b) => b.value.day.localeCompare(a.value.day)).map(entry => entry.value);
  const recent = ordered.filter((entry,i) => ordered.findIndex(other => other.name === entry.name) === i).slice(0,5);
  const foodHistory = recent.flatMap(meal => meal.ingredients ?? []);
  const familiarFoods = foodHistory.filter((entry,i) => foodHistory.findIndex(other => other.name === entry.name) === i).slice(0,6);
  function action(fn: () => void) {
    try { fn(); setError(''); } catch (e) { setError((e as Error).message); }
  }
  function change(next: Panel) { setError(''); setPanel(next); }
  return <View style={stack}>
    <Card style={{ ...stack, backgroundColor: '#14281F', borderColor: '#2A6549' }}>
      <Tag>ALIMENTAÇÃO E TREINO</Tag><Subtitle>Vision Nutri</Subtitle>
      <Options label="VISION NUTRI" options={['Chat','Resumo','Registrar prato','Minha meta'] as const} selected={[panel]} toggle={change} />
      {panel === 'Chat' && <VisionNutri store={store} />}
      {panel === 'Resumo' && <>
        <Caption>{nutritionInsight(todays.map(entry => entry.value),goal)}</Caption>
        {goal && <Caption>{goal.focus}{goal.by ? ` · até ${goal.by.split('-').reverse().join('/')}${goal.by < day ? ' (prazo encerrado)' : ''}` : ''}</Caption>}
        <Subtitle>{serving(totals.calories)}{goal?.calories ? ' / ' + serving(goal.calories) : ''} kcal hoje</Subtitle>
        {!!goal?.calories && <Meter value={totals.calories / goal.calories} />}
        <Caption>{serving(totals.protein)} g proteína · {serving(totals.carbs)} g carboidrato · {serving(totals.fat)} g gordura</Caption>
        {!!goal?.protein && <Meter value={totals.protein / goal.protein} color="#57C8ED" />}
        {goal?.calories && totals.calories > goal.calories && <Caption>O registro de hoje ficou {serving(totals.calories - goal.calories)} kcal acima da meta informada.</Caption>}
        <Button title="Adicionar uma refeição" onPress={() => change('Registrar prato')} />
        {todays.map(({key,value}) => <View key={key} style={[row,{ justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}><Caption>{value.name} · {serving(value.calories)} kcal</Caption><Caption>{value.type ?? 'Refeição'} · {serving(value.protein)} g proteína</Caption>
            {!!value.ingredients?.length && <Caption>{value.ingredients.map(item => `${item.name} (${serving(item.grams)} g)`).join(', ')}</Caption>}</View>
          <Button title="Remover prato" secondary style={{ paddingHorizontal: 8 }} onPress={() => store.remove('meal', key)} />
        </View>)}
      </>}
      {panel === 'Minha meta' && <>
        <Caption>Escolha o que quer acompanhar e por quanto tempo. Você pode usar metas definidas com seu nutricionista.</Caption>
        <Options label="OBJETIVO" options={nutritionFocus} selected={[focus]} toggle={setFocus} />
        <Field label="Prazo (opcional)" placeholder="DD/MM/AAAA" value={deadline} onChangeText={setDeadline} maxLength={10} />
        <NumberField label="Meta de proteína por dia (g, opcional)" value={protein} set={setProtein} />
        <NumberField label="Meta de energia por dia (kcal, opcional)" value={energy} set={setEnergy} />
        <Button title="Salvar objetivo" onPress={() => action(() => {
          store.save('targets', { ...(store.get('targets') ?? targets), nutrition: {
            focus, by: parseGoalDate(deadline, day), protein: protein ? number(protein,1,1000) : undefined,
            calories: energy ? number(energy,1,10000) : undefined,
          } });
          change('Resumo');
        })} />
      </>}
      {panel === 'Registrar prato' && <>
        {!!recent.length && <Options label="REAPROVEITAR UM PRATO ANTERIOR" options={recent.map(meal => meal.name)} selected={[]} toggle={name => {
          const previous = recent.find(meal => meal.name === name);
          if (!previous) return;
          setDish(previous.name); setMealType(previous.type ?? 'Outro');
          setItems(previous.ingredients ?? []);
          setMethod(previous.ingredients?.length ? 'Por ingredientes' : 'Total do prato');
          setMealValues({ calories: String(previous.calories), protein: String(previous.protein), carbs: String(previous.carbs), fat: String(previous.fat) });
        }} />}
        <Field label="Nome do prato" placeholder="Ex.: arroz, feijão e frango" value={dish} onChangeText={setDish} maxLength={100} />
        <Options label="REFEIÇÃO" options={mealTypes} selected={[mealType]} toggle={setMealType} />
        <Options label="COMO REGISTRAR" options={['Por ingredientes','Total do prato']} selected={[method]} toggle={setMethod} />
        {method === 'Por ingredientes' ? <>
          {items.map((item,i) => <View key={i} style={[row,{ justifyContent: 'space-between', alignItems: 'center' }]}>
            <Caption style={{ flex: 1 }}>{item.name} · {serving(item.grams)} g · {item.category}</Caption>
            <Button title="Tirar ingrediente" secondary style={{ paddingHorizontal: 8 }} onPress={() => setItems(items.filter((_,j) => j !== i))} />
          </View>)}
          <Caption>Use os valores por 100 g do rótulo ou da tabela que você consultou. O app calcula a sua porção.</Caption>
          {!!familiarFoods.length && <Options label="INGREDIENTES QUE VOCÊ JÁ USOU" options={familiarFoods.map(food => food.name)} selected={[]} toggle={name => {
            const food = familiarFoods.find(item => item.name === name);
            if (!food) return;
            const per100 = Object.fromEntries(Object.entries({ calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat })
              .map(([key, value]) => [key, String(Number((value * 100 / food.grams).toFixed(4)))])) as Values;
            setIngredient(food.name); setCategory(food.category); setGrams(String(food.grams)); setIngredientValues(per100);
          }} />}
          <Field label="Ingrediente" placeholder="Ex.: peito de frango" value={ingredient} onChangeText={setIngredient} maxLength={100} />
          <Options label="TIPO DE INGREDIENTE" options={ingredientGroups} selected={[category]} toggle={setCategory} />
          <NumberField label="Porção (g)" value={grams} set={setGrams} />
          <NutrientFields fields={ingredientValues} set={setIngredientValues} suffix=" por 100 g" />
          <Button title="Adicionar ingrediente" secondary onPress={() => action(() => {
            if (!ingredient.trim()) throw new Error('Informe o nome do ingrediente.');
            if (!ingredientValues.calories.trim()) throw new Error('Informe a energia por 100 g. Use 0 se o rótulo indicar zero.');
            setItems([...items, portion({ name: ingredient.trim(), grams: number(grams,1,5000), category, ...values(ingredientValues) })]);
            setIngredient(''); setGrams(''); setIngredientValues(blank);
          })} />
          {!!items.length && <Caption>Total do prato: {serving(draft.calories)} kcal · {serving(draft.protein)} g de proteína</Caption>}
        </> : <NutrientFields fields={mealValues} set={setMealValues} suffix="" />}
        <Button title="Salvar prato" onPress={() => action(() => {
          if (!dish.trim()) throw new Error('Informe o nome do prato.');
          if (method === 'Por ingredientes' && (ingredient.trim() || grams.trim())) throw new Error('Adicione o ingrediente preenchido antes de salvar.');
          if (method === 'Por ingredientes' && !items.length) throw new Error('Adicione pelo menos um ingrediente.');
          if (method === 'Total do prato' && !mealValues.calories.trim()) throw new Error('Informe a energia do prato em kcal.');
          store.save('meal',{ day, name: dish.trim(), type: mealType, ingredients: method === 'Por ingredientes' ? items : undefined,
            ...(method === 'Por ingredientes' ? draft : values(mealValues)) },newKey('meal'));
          setDish(''); setItems([]); setMealValues(blank); change('Resumo');
        })} />
      </>}
      {!!error && <Notice tone="error">{error}</Notice>}
    </Card>
  </View>;
}
