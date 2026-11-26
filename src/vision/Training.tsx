import { technique, availableAtHome } from './technique';
import { typeface } from '../typography';
import { useEffect, useState } from 'react';
import { MovementArt, WorkoutArt } from './MovementArt';
import { Linking, Pressable, View } from 'react-native';
import { Notice } from '../components/ui';
import { colors as c } from '../theme';
import { completeSet, dateKey, duration, executionRatings, levels, number, performance, restTime, toggleClock, weekdays, type Active, type ExecutionQuality, type Exercise, type Move, type Profile, type Workout } from './domain';
import { type Store } from './store';
import { Button, Caption, Card, Field, Meter, NumberField, Options, row, stack, Subtitle, Tag, Title } from './ui';

export const clock = (time: number) => [Math.floor(time / 3600), Math.floor(time % 3600 / 60), time % 60].map(piece => String(piece).padStart(2, '0')).join(':');
export const units = (exercise: Exercise) => exercise.timed ? 's' : 'reps';

export function Library({ catalog, favorite, toggleFavorite, profile, moves }: { catalog: Exercise[]; favorite: string[]; toggleFavorite: (id:string) => void; profile: Profile; moves: Move[] }) {
  const [sort, setSort] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('Todos');
  const [level, setLevel] = useState(-1);
  const [gear, setGear] = useState('Todos');
  const [selected, setSelected] = useState<Exercise>();
  const [detailTab, setDetailTab] = useState('Instruções');
  const [category, setCategory] = useState('Todos');
  const [error, setError] = useState('');
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = catalog.filter(e => (!onlyFavorites || favorite.includes(e.id)) && (category === 'Todos' || (category === 'Básicos' ? e.level === 0 : category === 'Força' ? !e.timed : e.timed)) && (group === 'Todos' || e.group === group) && (level < 0 || e.level === level) && (gear === 'Todos' || !e.gear) && normalize(e.name + ' ' + e.gear).includes(normalize(search.trim())));
  if (sort) visible.sort((a,b) => a.name.localeCompare(b.name,'pt-BR'));
  if (selected) {
    const alternatives = catalog.filter(e => e.group === selected.group && e.id !== selected.id && availableAtHome(e,profile));
    const simpler = alternatives.filter(e => e.level < selected.level).sort((a,b) => b.level - a.level).slice(0,2);
    const harder = alternatives.filter(e => e.level > selected.level).sort((a,b) => a.level - b.level).slice(0,2);
    const prescription = moves.find(move => move.exercise.id === selected.id);
    const guidance = technique(selected);
    return <View style={stack}>
      <View style={[row,{ justifyContent: 'space-between' }]}><Button title="‹ Biblioteca" secondary onPress={() => { setSelected(undefined); setDetailTab('Instruções'); setError(''); }} style={{ paddingHorizontal: 14 }} />
        <Button title={favorite.includes(selected.id) ? '♥ Favoritado' : '♡ Favoritar'} secondary onPress={() => toggleFavorite(selected.id)} style={{ paddingHorizontal: 12 }} /></View>
      <Card style={{ backgroundColor: '#101A1A', gap: 10 }}>
        <MovementArt exercise={selected} />
        {selected.video && <Button title="▶ Assistir à demonstração" secondary onPress={() => void Linking.openURL(selected.video!).catch(() => setError('Não foi possível abrir o vídeo.'))} />}
      </Card>
      <View style={[row,{ justifyContent: 'space-between', alignItems: 'center' }]}><Title>{selected.name}</Title><Tag>{levels[selected.level]}</Tag></View>
      <Caption>{selected.gear || 'Peso corporal'} · {selected.group}</Caption>
      <Card style={stack}><Tag>MÚSCULOS TRABALHADOS</Tag><Subtitle>{guidance.muscles.join(' · ')}</Subtitle>
        <Caption>{prescription ? `Seu plano: ${prescription.sets} séries de ${prescription.target} ${units(selected)} · ${prescription.rest}s de descanso` : 'A meta de séries, repetições e descanso aparece quando o exercício entra no seu plano.'}</Caption>
      </Card>
      <Tabs options={['Instruções','Dicas','Variações']} current={detailTab} select={setDetailTab} />
      {detailTab === 'Instruções' && <Card style={stack}><Subtitle>Como executar</Subtitle>
        {selected.steps.map((step,i) => <View key={i} style={{ flexDirection: 'row', gap: 9 }}><Tag>{i+1}</Tag><Caption style={{ flex: 1 }}>{step}</Caption></View>)}
      </Card>}
      {detailTab === 'Dicas' && <Card style={stack}><Subtitle>Respiração</Subtitle><Caption>{guidance.breath}</Caption><Subtitle>Erros comuns</Subtitle><Caption>{guidance.error}</Caption>
        {!!selected.avoid.length && <Caption>Limitações consideradas no plano: {selected.avoid.join(', ')}.</Caption>}</Card>}
      {detailTab === 'Variações' && ([['Mais fáceis',simpler],['Mais difíceis',harder]] as const).map(([label, choices]) => <View key={label} style={stack}>
        <Subtitle>{label}</Subtitle>{!choices.length && <Caption>Sem variação compatível nessa faixa.</Caption>}
        <View style={row}>{choices.map(exercise => <Pressable key={exercise.id} onPress={() => { setSelected(exercise); setDetailTab('Instruções'); }}
          accessibilityRole="button" style={{ flexBasis: 150, flexGrow: 1 }}><Card><MovementArt exercise={exercise} compact /><Caption>{exercise.name}</Caption><Tag>{levels[exercise.level]}</Tag></Card></Pressable>)}</View>
      </View>)}
      {detailTab !== 'Variações' && <Button title="Ver exercícios alternativos" secondary onPress={() => setDetailTab('Variações')} />}
      {!!error && <Notice tone="error">{error}</Notice>}
    </View>;
  }
  return <View style={stack}>
    <View><Title>Biblioteca de</Title><Caption style={{ color: c.green, fontFamily: typeface.bold, fontSize: 32, lineHeight: 37, letterSpacing: -0.4 }}>Exercícios</Caption></View><Caption>Explore {catalog.length} exercícios de calistenia.</Caption>
    <Field label="Buscar exercício" value={search} onChangeText={setSearch} placeholder="Flexão, barra fixa, prancha..." />
    <Tabs options={['Todos','Básicos','Força','Isometria']} current={category} select={setCategory} />
    <Subtitle>Grupos musculares</Subtitle>
    <Options label="GRUPO MUSCULAR" options={['Todos', ...new Set(catalog.map(e => e.group))]} selected={[group]} toggle={setGroup} />
    <Options label="NÍVEL" options={[-1, 0, 1, 2, 3]} selected={[level]} toggle={setLevel} display={n => n < 0 ? 'Todos' : levels[n]} />
    <Options label="EQUIPAMENTO" options={['Todos', 'Sem equipamento']} selected={[gear]} toggle={setGear} />
    <View style={[row,{ justifyContent: 'space-between' }]}><Subtitle>Exercícios ({visible.length})</Subtitle>
      <Pressable accessibilityRole="button" onPress={() => setSort(!sort)}><Tag>{sort ? 'ORDEM A–Z' : 'ORDEM DO CATÁLOGO'}</Tag></Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: onlyFavorites }} onPress={() => setOnlyFavorites(!onlyFavorites)}><Tag>{onlyFavorites ? 'EXIBINDO FAVORITOS' : '♡ FAVORITOS'}</Tag></Pressable>
    </View>
    <View style={stack}>{visible.map(e => <Pressable key={e.id} accessibilityRole="button" onPress={() => setSelected(e)} style={{ width: '100%' }}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10 }}>
        <View style={{ width: '36%', maxWidth: 220, backgroundColor: '#101A1A', borderRadius: 11 }}><MovementArt exercise={e} compact /></View>
        <View style={{ flex: 1, gap: 5 }}><Subtitle>{e.name}</Subtitle><Caption>{e.gear || 'Peso corporal'}</Caption><Tag>{e.group} · {levels[e.level]}</Tag></View>
      </Card>
    </Pressable>)}</View>
    {!visible.length && <Caption>Nenhum exercício corresponde à busca.</Caption>}
  </View>;
}

function Tabs({options,current,select}: {options:string[];current:string;select:(value:string)=>void}) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{options.map(option => <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected: option === current }} onPress={() => select(option)}
    style={{ flexGrow: 1, minHeight: 42, paddingHorizontal: 6, justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: option === current ? c.green : c.line, backgroundColor: option === current ? '#143C2C' : c.graphite }}>
    <Caption style={{ textAlign: 'center', fontSize: 11, color: option === current ? c.green : c.white }}>{option}</Caption>
  </Pressable>)}</View>;
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
  const [quality, setQuality] = useState<ExecutionQuality>();
  const [detail, setDetail] = useState('Execução');
  const [expanded,setExpanded] = useState(false);
  const [confirmSet,setConfirmSet] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
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
    const workout: Workout = { id, day: dateKey(), title: active.title, moves: active.moves, sets: active.sets, partial: !!move, seconds: duration(active, Date.now()) };
    store.changes([{ key: id, kind: 'workout', value: workout }, { key: 'active', kind: 'active', value: null }]);
    back();
  };
  function register() {
    if (!move) return;
    try {
      if (!quality) throw new Error('Avalie o controle do movimento antes de registrar.');
      store.save('active', completeSet(active, number(amount || String(move.target), 0, move.exercise.timed ? 600 : 300, true), Date.now(), quality));
      setConfirmSet(false); setAmount(''); setQuality(undefined); setDetail('Execução'); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao registrar a série.'); }
  }
  const alternatives = move ? store.catalog.filter(e => e.group === move.exercise.group && e.id !== move.exercise.id && e.level <= Math.min(profile.level, move.exercise.level) &&
    (!e.gear || profile.equipment.includes(e.gear)) && !e.avoid.some(limit => profile.limits.includes(limit))) : [];
  const records = active.sets.slice(active.moves.slice(0,active.index).reduce((sum,m) => sum+m.sets,0));
  const totalSets = active.moves.reduce((sum,m)=>sum+m.sets,0);
  const progress = totalSets ? active.sets.length / totalSets : 0;
  return <View style={stack}>
    <View style={[row,{ justifyContent: 'space-between' }]}>
      <Button title="‹ Treinos" secondary onPress={back} style={{ paddingHorizontal: 10, minHeight: 40 }} />
      <Button title={confirmDiscard ? 'Confirmar descarte' : 'Descartar treino'} secondary onPress={() => {
        if (confirmDiscard) { store.remove('active'); back(); } else setConfirmDiscard(true);
      }} style={{ paddingHorizontal: 10, minHeight: 40 }} />
    </View>
    <View style={{gap:5}}><Subtitle>{active.title}</Subtitle><Caption>{active.sets.length}/{totalSets} séries confirmadas</Caption><Meter value={progress} /></View>
    {move && <>
      <Card style={{gap:8,padding:12}}>
        <View style={{position:'relative',minHeight:190,borderRadius:12,backgroundColor:'#101B1B',justifyContent:'center',alignItems:'center',paddingHorizontal:12}}>
          <WorkoutArt exercise={move.exercise}/>
          <View pointerEvents="none" style={{position:'absolute',top:7,left:7,paddingHorizontal:9,paddingVertical:4,borderRadius:8,backgroundColor:'#10151CEB'}}>
            <Caption style={{color:active.clock===null?'#FAD05B':c.white,fontVariant:['tabular-nums']}}>{active.clock===null?'Ⅱ ':''}{clock(duration(active,now))}</Caption>
          </View>
        </View>
        <Subtitle>{move.exercise.name}</Subtitle>
        <Caption>Série {active.set+1}/{move.sets} · {move.target} {units(move.exercise)}{rest>0?' · Descanso '+clock(rest).slice(3):''}</Caption>
      {confirmSet && !rest && active.clock!==null && <>
      <NumberField label={`${move.exercise.timed ? 'Segundos' : 'Repetições'} realizadas`} value={amount} set={setAmount} hint={String(move.target)} />
      <Options label="COMO FOI SUA EXECUÇÃO?" options={executionRatings} selected={quality ? [quality] : []} toggle={setQuality} />
      <Button title="Confirmar série" onPress={register} />
      {!!error && <Notice tone="error">{error}</Notice>}
      </>}
      <View style={row}>
      {!confirmSet && !rest && active.clock!==null && <Button style={{flexGrow:1,minHeight:44}} title="Finalizar série" onPress={()=>{setError('');setConfirmSet(true);}}/>}
      <Button style={{flexGrow:1,minHeight:44}} secondary title={active.clock===null?'Retomar treino':'Pausar treino'} onPress={()=>store.save('active',toggleClock(active,Date.now()))} />
      </View></Card>
      <Button secondary title={expanded?'Ocultar detalhes':'Ver execução e séries'} onPress={()=>setExpanded(!expanded)} style={{minHeight:44}}/>
      {expanded&&<>
      <Tabs options={['Execução','Dicas','Variações','Músculos']} current={detail} select={setDetail} />
      {detail === 'Execução' && <Card style={stack}><MovementArt key={move.exercise.id} exercise={move.exercise} />
        {move.exercise.video && <Button title="Assistir à demonstração" secondary onPress={() => void Linking.openURL(move.exercise.video!).catch(() => setError('Não foi possível abrir o vídeo.'))} />}</Card>}
      {detail === 'Dicas' && <Card><Caption>{technique(move.exercise).breath}</Caption><Caption>{technique(move.exercise).error}</Caption></Card>}
      {detail === 'Músculos' && <Card><Tag>MÚSCULOS TRABALHADOS</Tag><Subtitle>{technique(move.exercise).muscles.join(' · ')}</Subtitle></Card>}
      {detail === 'Variações' && <Card style={stack}>
        {active.set > 0 ? <Caption>A substituição está disponível antes de registrar a primeira série do exercício.</Caption> :
          !alternatives.length ? <Caption>Nenhuma variação compatível com seu perfil.</Caption> : alternatives.map(exercise => <Button key={exercise.id} title={'Substituir por ' + exercise.name} secondary onPress={() => {
            const moves = active.moves.map((m,i) => i === active.index ? { ...m, exercise, target: exercise.timed ? 10 : 5 } : m);
            store.save('active', { ...active, moves }); setAmount(''); setDetail('Execução');
          }} />)}
      </Card>}
      <View style={[row,{ justifyContent: 'space-between', alignItems: 'center' }]}><Subtitle>Séries</Subtitle><Tag>AUTO PROGRESSÃO ATIVA</Tag></View>
      {Array.from({length:move.sets},(_,i) => {
        const record = records[i], achieved = !!record && record.amount >= record.target;
        const color = record ? (achieved ? c.green : performance(record.amount / record.target)) : c.muted;
        return <Card key={i} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 7, padding: 12 }}>
          <Caption style={{ color: c.white }}>Série {i+1} · {record?.amount ?? move.target} {units(move.exercise)}</Caption>
          <Caption style={{ color }}>{record ? (achieved ? '✓ Concluída' : `Atenção · ${record.target-record.amount} abaixo da meta`) : 'Pendente'}</Caption>
        </Card>;
      })}
      <Card style={{ backgroundColor: '#102B21', borderColor: '#1C6948', gap: 6 }}><Subtitle>Progressão automática</Subtitle><Caption>O alvo aumenta após duas sessões completas e controladas na meta. Uma série sem controle pode reduzir o alvo seguinte.</Caption></Card>
      </>}
    </>}
    {!!error && !confirmSet && <Notice tone="error">{error}</Notice>}
    <View style={row}>
      <Button title={!move ? 'Finalizar treino' : confirmFinish ? 'Salvar treino parcial' : 'Finalizar'} secondary={!!move}
        style={{ flexGrow: 1, paddingHorizontal: 10, ...(move ? { borderColor: c.danger } : {}) }}
        onPress={() => {
          if (!move || (confirmFinish && active.sets.length)) finish();
          else if (!active.sets.length) setError('Registre uma série para salvar o treino.');
          else setConfirmFinish(true);
        }} />
    </View>
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
          const done = workouts.some(w => w.day === key && !w.partial), scheduled = days.includes(i % 7);
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
    {details.map(workout => <Card key={workout.id}><Subtitle>{workout.title}</Subtitle><Caption>{clock(workout.seconds)} · {workout.sets.length} séries{workout.partial ? ' · Parcial' : ''}</Caption>
      {workout.moves.map(m => {
        const series = workout.sets.filter(s => s.id === m.exercise.id);
        const ratio = series.reduce((sum, s) => sum + s.amount / s.target, 0) / m.sets;
        return <Caption key={m.exercise.id} style={{ color: performance(ratio) }}>{m.exercise.name} · {series.map(s => s.amount).join(' / ')} {units(m.exercise)}</Caption>;
      })}
    </Card>)}
  </View>;
}
