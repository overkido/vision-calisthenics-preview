import { useEffect, useState } from 'react';
import { MovementArt } from './MovementArt';
import { Linking, Pressable, View } from 'react-native';
import { Notice } from '../components/ui';
import { colors as c } from '../theme';
import { completeSet, dateKey, duration, levels, number, performance, restTime, toggleClock, weekdays, type Active, type Exercise, type Move, type Profile, type Workout } from './domain';
import { type Store } from './store';
import { Button, Caption, Card, Field, Meter, NumberField, Options, row, stack, Subtitle, Tag, Title } from './ui';

export const clock = (time: number) => [Math.floor(time / 3600), Math.floor(time % 3600 / 60), time % 60].map(piece => String(piece).padStart(2, '0')).join(':');
export const units = (exercise: Exercise) => exercise.timed ? 's' : 'reps';

export function Library({ catalog }: { catalog: Exercise[] }) {
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('Todos');
  const [level, setLevel] = useState(-1);
  const [gear, setGear] = useState('Todos');
  const [selected, setSelected] = useState<Exercise>();
  const [error, setError] = useState('');
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = catalog.filter(e => (group === 'Todos' || e.group === group) && (level < 0 || e.level === level) && (gear === 'Todos' || !e.gear) && normalize(e.name + ' ' + e.gear).includes(normalize(search.trim())));
  if (selected) return <View style={stack}>
    <Button title="Voltar à biblioteca" secondary onPress={() => { setSelected(undefined); setError(''); }} />
    <Title>{selected.name}</Title><Tag>{selected.group} · {levels[selected.level]}</Tag>
    <Card><MovementArt exercise={selected} /><Subtitle>Como executar</Subtitle>
      {selected.steps.map((step, i) => <Caption key={i} style={{ marginTop: 12 }}>{i + 1}. {step}</Caption>)}
      <Caption style={{ marginTop: 16 }}>Equipamento: {selected.gear || 'peso corporal'}</Caption>
    </Card>
    {selected.video && <Button title="Assistir à demonstração" onPress={() => void Linking.openURL(selected.video!).catch(() => setError('Não foi possível abrir o vídeo.'))} />}
    {!!error && <Notice tone="error">{error}</Notice>}
  </View>;
  return <View style={stack}>
    <Title>Biblioteca de exercícios</Title><Caption>{visible.length} de {catalog.length} movimentos</Caption>
    <Field label="Buscar exercício" value={search} onChangeText={setSearch} placeholder="Flexão, barra fixa, prancha..." />
    <Options label="GRUPO MUSCULAR" options={['Todos', ...new Set(catalog.map(e => e.group))]} selected={[group]} toggle={setGroup} />
    <Options label="NÍVEL" options={[-1, 0, 1, 2]} selected={[level]} toggle={setLevel} display={n => n < 0 ? 'Todos' : levels[n]} />
    <Options label="EQUIPAMENTO" options={['Todos', 'Sem equipamento']} selected={[gear]} toggle={setGear} />
    <View style={row}>{visible.map(e => <Pressable key={e.id} accessibilityRole="button" onPress={() => setSelected(e)} style={{ flexGrow: 1, flexBasis: 225 }}>
      <Card style={{ minHeight: 157, gap: 5 }}><MovementArt exercise={e} compact /><Tag>{e.group.toUpperCase()}</Tag><Subtitle>{e.name}</Subtitle><Caption>{levels[e.level]} · {e.gear || 'Peso corporal'}</Caption></Card>
    </Pressable>)}</View>
    {!visible.length && <Caption>Nenhum exercício corresponde à busca.</Caption>}
  </View>;
}

export function Plan({ moves, title, profile, start, resume, library }: {
  moves: Move[]; title: string; profile: Profile; start: () => void; resume: boolean; library: () => void;
}) {
  return <View style={stack}>
    <Title>Treinos em casa</Title>
    <Card style={{ gap: 10 }}>
      <Tag>{profile.goal.toUpperCase()} · {levels[profile.level].toUpperCase()}</Tag>
      <Subtitle>{title}</Subtitle><Caption>{profile.days.map(d => weekdays[d]).join(' · ')}</Caption>
      {!moves.length && !resume && <Caption>Seu perfil atual não permite gerar uma sessão. Revise suas limitações e equipamentos no perfil.</Caption>}
      {(moves.length > 0 || resume) && <Button title={resume ? 'Retomar treino' : 'Iniciar treino'} onPress={start} />}
    </Card>
    {moves.map((move, i) => <Card key={move.exercise.id}><Tag>{String(i + 1).padStart(2, '0')} · {move.exercise.group.toUpperCase()}</Tag>
      <Subtitle>{move.exercise.name}</Subtitle><MovementArt exercise={move.exercise} compact />
      <Caption>{move.sets} séries × {move.target} {units(move.exercise)} · {move.rest}s de descanso</Caption>
    </Card>)}
    <Button title="Abrir biblioteca de exercícios" secondary onPress={library} />
  </View>;
}

export function ActiveWorkout({ active, store, profile, back }: { active: Active; store: Store; profile: Profile; back: () => void }) {
  const [now, tick] = useState(Date.now);
  const [amount, setAmount] = useState('');
  const [swap, setSwap] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const timer = setInterval(() => tick(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const move = active.moves[active.index];
  const rest = restTime(active, now);
  const finish = () => {
    const id = 'workout:' + active.started;
    const workout: Workout = { id, day: dateKey(), title: active.title, moves: active.moves, sets: active.sets, seconds: duration(active, Date.now()) };
    store.changes([{ key: id, kind: 'workout', value: workout }, { key: 'active', kind: 'active', value: null }]);
    back();
  };
  function register() {
    if (!move) return;
    try {
      store.save('active', completeSet(active, number(amount || String(move.target), 0, move.exercise.timed ? 600 : 300, true), Date.now()));
      setAmount(''); setSwap(false); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao registrar a série.'); }
  }
  const alternatives = move ? store.catalog.filter(e => e.group === move.exercise.group && e.id !== move.exercise.id && e.level <= profile.level &&
    (!e.gear || profile.equipment.includes(e.gear)) && !e.avoid.some(limit => profile.limits.includes(limit))) : [];
  return <View style={stack}>
    <Title>Treino em andamento</Title>
    <Card style={{ gap: 10, backgroundColor: '#13241F', borderColor: '#246044' }}>
      <Tag>{active.title.toUpperCase()}</Tag><Title>{clock(duration(active, now))}</Title>
      <Meter value={active.sets.length / active.moves.reduce((sum, m) => sum + m.sets, 0)} />
      <Button title={active.clock === null ? 'Retomar cronômetro' : 'Pausar cronômetro'} secondary onPress={() => store.save('active', toggleClock(active, Date.now()))} />
    </Card>
    {move ? <Card style={stack}>
      <Subtitle>{move.exercise.name}</Subtitle><MovementArt exercise={move.exercise} />
      <Caption>Exercício {active.index + 1} de {active.moves.length} · Série {active.set + 1} de {move.sets}</Caption>
      {rest > 0 && <Tag>DESCANSO · {rest}s</Tag>}
      <View style={row}>
        <Card style={{ flex: 1, minWidth: 84, padding: 10 }}><Tag>META</Tag><Subtitle>{move.target} {units(move.exercise)}</Subtitle></Card>
        <Card style={{ flex: 1, minWidth: 84, padding: 10 }}><Tag>DESCANSO</Tag><Subtitle>{move.rest}s</Subtitle></Card>
        <Card style={{ flex: 1, minWidth: 84, padding: 10 }}><Tag>SÉRIE</Tag><Subtitle>{active.set + 1}/{move.sets}</Subtitle></Card>
      </View>
      <Card style={{ backgroundColor: '#172820', gap: 4 }}><Tag>DICA DE EXECUÇÃO</Tag><Caption>{move.exercise.steps[1] ?? move.exercise.steps[0]}</Caption></Card>
      <NumberField label={`${move.exercise.timed ? 'Segundos' : 'Repetições'} realizadas`} value={amount} set={setAmount} hint={String(move.target)} />
      <Button title={rest ? `Aguarde ${rest}s` : active.clock === null ? 'Treino pausado' : 'Registrar série'} loading={rest > 0 || active.clock === null} onPress={register} />
      {active.set === 0 && <Button title={swap ? 'Fechar substituições' : 'Substituir exercício'} secondary onPress={() => setSwap(!swap)} />}
      {swap && (!alternatives.length ? <Caption>Nenhuma alternativa atende às suas preferências.</Caption> : alternatives.map(e => <Button key={e.id} title={e.name} secondary onPress={() => {
        const moves = active.moves.map((m, i) => i === active.index ? { ...m, exercise: e, target: e.timed ? 10 : 5 } : m);
        store.save('active', { ...active, moves }); setAmount(''); setSwap(false);
      }} />))}
    </Card> : <Button title="Concluir e salvar treino" onPress={finish} />}
    {!!error && <Notice tone="error">{error}</Notice>}
    <Button title="Voltar aos treinos" secondary onPress={back} />
    {move && <Button title={confirmDiscard ? 'Confirmar descarte do treino' : 'Descartar treino'} secondary onPress={() => {
      if (confirmDiscard) { store.remove('active'); back(); } else setConfirmDiscard(true);
    }} />}
  </View>;
}

export function Calendar({ workouts, days }: { workouts: Workout[]; days: number[] }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(dateKey);
  const offset = month.getDay();
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const go = (direction: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + direction, 1);
    setMonth(next); setSelected(dateKey(next));
  };
  const details = workouts.filter(w => w.day === selected);
  return <View style={stack}>
    <Title>Calendário</Title>
    <Card style={stack}>
      <View style={[row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <Button title="‹" secondary onPress={() => go(-1)} style={{ width: 48 }} />
        <Subtitle>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Subtitle>
        <Button title="›" secondary onPress={() => go(1)} style={{ width: 48 }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {weekdays.map(d => <Caption key={d} style={{ width: '14.2857%', textAlign: 'center' }}>{d}</Caption>)}
        {Array.from({ length: count + offset }, (_, i) => {
          const day = i - offset + 1, key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
          const done = workouts.some(w => w.day === key), scheduled = days.includes(i % 7);
          const color = done ? c.green : scheduled ? key < dateKey() ? c.danger : '#FFAC58' : c.muted;
          return <View key={i} style={{ width: '14.2857%', padding: 2 }}>
            {day > 0 && <Pressable accessibilityRole="button" accessibilityLabel={key} accessibilityState={{ selected: selected === key }}
              onPress={() => setSelected(key)} style={{ alignItems: 'center', paddingVertical: 9, borderRadius: 9, backgroundColor: selected === key ? '#164139' : 'transparent' }}>
              <Caption style={{ color }}>{day}</Caption>
            </Pressable>}
          </View>;
        })}
      </View>
      <Caption><Caption style={{ color: c.green }}>● Realizado</Caption>   <Caption style={{ color: '#FFAC58' }}>● Planejado</Caption>   <Caption style={{ color: c.danger }}>● Atrasado</Caption></Caption>
    </Card>
    <Subtitle>{selected.split('-').reverse().join('/')}</Subtitle>
    {!details.length && <Caption>Nenhum treino concluído neste dia.</Caption>}
    {details.map(workout => <Card key={workout.id}><Subtitle>{workout.title}</Subtitle><Caption>{clock(workout.seconds)} · {workout.sets.length} séries</Caption>
      {workout.moves.map(m => {
        const series = workout.sets.filter(s => s.id === m.exercise.id);
        const ratio = series.reduce((sum, s) => sum + s.amount / s.target, 0) / m.sets;
        return <Caption key={m.exercise.id} style={{ color: performance(ratio) }}>{m.exercise.name} · {series.map(s => s.amount).join(' / ')} {units(m.exercise)}</Caption>;
      })}
    </Card>)}
  </View>;
}
