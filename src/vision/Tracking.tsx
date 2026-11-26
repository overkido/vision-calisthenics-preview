import { NutritionAssistant } from './NutritionAssistant';
import { useState } from 'react';
import { View } from 'react-native';
import { Notice } from '../components/ui';
import { dateKey, number, performance, targets, waterEstimate, weekStart, type Profile, type Workout } from './domain';
import { newKey, type Store } from './store';
import { Button, Caption, Card, Chart, Field, Meter, NumberField, Options, row, stack, Subtitle, Tag, Title } from './ui';

export function Progress({ store, workouts, profile }: { store: Store; workouts: Workout[]; profile: Profile }) {
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [period, setPeriod] = useState(30);
  const [metric, setMetric] = useState('Peso');
  const [exerciseId, setExerciseId] = useState('');
  const [result, setResult] = useState('');
  const from = new Date(); from.setDate(from.getDate() - period + 1);
  const history = store.list('measure').map(e => e.value).filter(e => e.day >= dateKey(from)).sort((a, b) => a.day.localeCompare(b.day));
  const sessions = workouts.filter(w => w.day >= dateKey(from)).slice().reverse();
  const values = metric === 'Séries' ? sessions.map(w => w.sets.length) : metric === 'Cintura' ? history.flatMap(m => m.waist === undefined ? [] : [m.waist]) : history.map(m => m.weight);
  const latest = history.at(-1);
  const trackedMoves = [...new Map(sessions.flatMap(workout => workout.moves.map(move => [move.exercise.id, move.exercise] as const))).values()];
  const tracked = trackedMoves.find(exercise => exercise.id === exerciseId) ?? trackedMoves[0];
  const bestSets = tracked ? sessions.flatMap(workout => {
    const sets = workout.sets.filter(set => set.id === tracked.id);
    return sets.length ? [Math.max(...sets.map(set => set.amount))] : [];
  }) : [];
  return <View style={stack}>
    <Title>Evolução</Title>
    <Card style={stack}>
      <Options label="PERÍODO" options={[7, 30, 90, 365]} selected={[period]} toggle={setPeriod} display={days => days + 'D'} />
      <Options label="INDICADOR" options={['Peso', 'Cintura', 'Séries', 'Força']} selected={[metric]} toggle={setMetric} />
      {metric === 'Força' ? <>
        {!!tracked && <Options label="EXERCÍCIO" options={trackedMoves.map(exercise => exercise.id)} selected={[tracked.id]}
          toggle={setExerciseId} display={id => trackedMoves.find(exercise => exercise.id === id)?.name ?? id} />}
        <Chart values={bestSets} label={tracked && bestSets.length ? `Melhor série por sessão · recorde: ${Math.max(...bestSets)} ${tracked.timed ? 's' : 'reps'}` : 'Melhor série por sessão'} />
      </> : <Chart values={values} label={values.length ? `${metric}: ${values[0]} → ${values.at(-1)} · ${values.length} registros` : metric} />}
    </Card>
    <Card><Tag>MEDIDAS CORPORAIS</Tag><Subtitle>{latest?.weight ?? profile.weight} kg</Subtitle>
      <Caption>Cintura: {(latest?.waist ?? profile.waist) ? `${latest?.waist ?? profile.waist} cm` : 'Sem registro'}</Caption>
      <View style={{ marginTop: 14 }}>
        <NumberField label="Peso atual (kg)" value={weight} set={setWeight} />
        <NumberField label="Cintura (cm, opcional)" value={waist} set={setWaist} />
      </View>
      {!!result && <Notice>{result}</Notice>}
      <Button title="Registrar medidas" onPress={() => {
        try {
          const day = dateKey();
          store.save('measure', { day, weight: number(weight, 25, 400), waist: waist ? number(waist, 30, 260) : undefined }, 'measure:' + day);
          setWeight(''); setWaist(''); setResult('Medidas registradas.');
        } catch (e) { setResult((e as Error).message); }
      }} />
    </Card>
  </View>;
}

export const todayWater = (store: Store) => store.list('water').filter(e => e.value.day === dateKey()).reduce((sum, e) => sum + e.value.ml, 0);
function hydrationEstimate(store: Store) {
  const profile = store.get('profile');
  const last = store.list('measure').map(e => e.value).sort((a,b) => b.day.localeCompare(a.day))[0];
  if (!profile) return;
  const weight = last?.weight ?? profile.weight;
  const ml = waterEstimate(profile.age, weight);
  if (ml) return { weight, ml };
}
export function Nutrition({ store, reminders }: { store: Store; reminders: () => void }) {
  const [ml, setMl] = useState('250');
  const [error, setError] = useState('');
  const limits = store.get('targets') ?? targets;
  const estimate = hydrationEstimate(store);
  const [custom, setCustom] = useState(String(store.get('targets')?.water ?? estimate?.ml ?? ''));
  const [notice, setNotice] = useState('');
  const goal = store.get('targets')?.water ?? estimate?.ml;
  function saveGoal(value: number) {
    store.save('targets', { ...limits, water: value });
    setCustom(String(value)); setNotice('Meta de água atualizada.');
  }
  const day = dateKey(), water = todayWater(store);
  const drinks = store.list('water').filter(e => e.value.day === day);
  function action(fn: () => void) {
    try { fn(); setError(''); } catch (e) { setError((e as Error).message); }
  }
  return <View style={stack}>
    <Title>Nutrição e hidratação</Title>
    <NutritionAssistant store={store} />
    {!!error && <Notice tone="error">{error}</Notice>}
    <Card style={stack}><Tag>HIDRATAÇÃO · HOJE</Tag><Subtitle>{water}{goal ? ` / ${goal}` : ''} ml</Subtitle>
      {!!goal && <Meter value={water / goal} color="#57C8ED" />}
      <Button title="Configurar lembrete de água" secondary onPress={reminders} />
      <NumberField label="Quantidade (ml)" value={ml} set={setMl} />
      <Button title="Registrar água" onPress={() => action(() => store.save('water', { day, ml: number(ml, 1, 2000, true) }, newKey('water')))} />
      {drinks.map(e => <View key={e.key} style={[row, { alignItems: 'center', justifyContent: 'space-between' }]}>
        <Caption>{e.value.ml} ml</Caption><Button title="Remover" secondary style={{ paddingHorizontal: 10, minHeight: 36 }} onPress={() => store.remove('water', e.key)} />
      </View>)}
    </Card>
    <Card style={stack}><Subtitle>Sua meta de água</Subtitle>
      <Caption>{estimate ? `Sugestão aproximada para ${estimate.weight} kg: ${estimate.ml.toLocaleString('pt-BR')} ml por dia. A necessidade varia com calor, suor e condições de saúde.` : 'Você pode cadastrar sua própria meta diária de água.'}</Caption>
      <Caption>Se você segue uma orientação de saúde sobre líquidos, use a meta indicada para você.</Caption>
      <NumberField label="Meta diária (ml)" value={custom} set={setCustom} />
      {notice && <Notice>{notice}</Notice>}
      {!!estimate && <Button title="Usar estimativa pelo peso" secondary onPress={() => action(() => saveGoal(estimate.ml))} />}
      <Button title="Salvar meta de água" secondary onPress={() => action(() => saveGoal(number(custom, 250, 6000, true)))} />
    </Card>

  </View>;
}
export function Achievements({ store, workouts }: { store: Store; workouts: Workout[] }) {
  const current = store.get('targets') ?? targets;
  const hydrationGoal = store.get('targets')?.water ?? hydrationEstimate(store)?.ml;
  const [water, setWater] = useState(String(hydrationGoal ?? ''));
  const [kcal, setKcal] = useState(String(current.calories));
  const [sessions, setSessions] = useState(String(current.workouts));
  const [notice, setNotice] = useState('');
  const completed = workouts.filter(workout => !workout.partial);
  const weekly = new Set(completed.filter(w => w.day >= weekStart()).map(w => w.day)).size;
  const badges = [
    { title: 'Primeiro treino', value: completed.length, target: 1, unit: 'treino' },
    { title: 'Meta da semana', value: weekly, target: current.workouts, unit: 'dias de treino' },
    { title: 'Dez treinos', value: completed.length, target: 10, unit: 'treinos' },
    ...(hydrationGoal ? [{ title: 'Hidratação de hoje', value: todayWater(store), target: hydrationGoal, unit: 'ml' }] : []),
  ];
  return <View style={stack}>
    <Title>Metas e conquistas</Title>
    <View style={row}>{badges.map(badge => <Card key={badge.title} style={{ flexBasis: 220, flexGrow: 1, gap: 8 }}>
      <Tag>{badge.value >= badge.target ? 'CONQUISTADO' : 'EM ANDAMENTO'}</Tag>
      <Subtitle>{badge.title}</Subtitle><Caption>{badge.value} / {badge.target} {badge.unit}</Caption>
      <Meter value={badge.value / badge.target} color={performance(badge.value / badge.target)} />
    </Card>)}</View>
    <Card style={stack}>
      <Subtitle>Definir minhas metas</Subtitle>
      <NumberField label="Água por dia (ml)" value={water} set={setWater} />
      <NumberField label="Energia por dia (kcal)" value={kcal} set={setKcal} />
      <NumberField label="Dias de treino por semana" value={sessions} set={setSessions} />
      {!!notice && <Notice>{notice}</Notice>}
      <Button title="Salvar metas" onPress={() => {
        try {
          store.save('targets', { ...(store.get('targets') ?? targets), water: water.trim() ? number(water, 250, 6000, true) : undefined, calories: number(kcal, 500, 8000, true), workouts: number(sessions, 1, 7, true) });
          setNotice('Metas salvas.');
        } catch (e) { setNotice((e as Error).message); }
      }} />
    </Card>
  </View>;
}
