import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as Browser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { backend, finishAuth } from './src/auth/authService';
import { Wordmark } from './src/components/BrandMark';
import { Notice } from './src/components/ui';
import { colors as c } from './src/theme';
import { Account, ProfileForm, type AuthMode } from './src/vision/Account';
import { dateKey, levels, performance, plan, targets, weekdays, weekStart, type Move, type Profile, type Workout } from './src/vision/domain';
import { Admin, Settings, clearDeviceReminder } from './src/vision/Settings';
import { useStore, type Store } from './src/vision/store';
import { Achievements, Nutrition, Progress, todayWater } from './src/vision/Tracking';
import { ActiveWorkout, Calendar, Library, Plan } from './src/vision/Training';
import { Button, Caption, Card, Chart, Meter, row, stack, Subtitle, Tag, Title } from './src/vision/ui';

Browser.maybeCompleteAuthSession();
const localModeKey = 'vision:local-mode';
const navigation = [
  { name: 'Início', path: 'M3 10l9-7 9 7v10h-6v-6H9v6H3z' },
  { name: 'Treinos', path: 'M3 9v6m4-9v12m10-12v12m4-9v6M7 12h10' },
  { name: 'Biblioteca', path: 'M4 4h6v16H4zM14 4h6v16h-6zM6 8h2m8 0h2' },
  { name: 'Agenda', path: 'M4 6h16v14H4zM4 10h16M8 3v5m8-5v5' },
  { name: 'Evolução', path: 'M3 20h18M7 17v-5m5 5V8m5 9V4' },
  { name: 'Perfil', path: 'M12 3a4 4 0 1 0 0 8 4 4 0 1 0 0-8zm-7 17a7 6 0 0 1 14 0' },
] as const;
type Tab = typeof navigation[number]['name'];
type Section = Tab | 'Nutrição' | 'Conquistas' | 'Configurações' | 'Administração' | 'Treino ativo' | 'Editar perfil';
const practicePaths = { Nutrição: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z', Conquistas: 'M8 4h8v6a4 4 0 1 1-8 0zM8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v6m-4 0h8' };
function Icon({ path, color = c.green }: { path: string; color?: string }) {
  return <Svg width={21} height={21} viewBox="0 0 24 24"><Path d={path} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>;
}
function Nav({ section, go, wide }: { section: Section; go: (section: Section) => void; wide: boolean }) {
  return <View style={wide
    ? { width: 218, padding: 20, borderRightWidth: 1, borderColor: c.line, backgroundColor: '#121821', gap: 10 }
    : { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 6, borderTopWidth: 1, borderColor: c.line, backgroundColor: '#151C26' }}>
    {wide && <View style={{ marginBottom: 28 }}><Wordmark /></View>}
    {[...navigation, ...(wide ? [{ name: 'Nutrição' as const, path: practicePaths.Nutrição }, { name: 'Conquistas' as const, path: practicePaths.Conquistas }] : [])].map(({ name, path }) => {
      const selected = name === section || (name === 'Treinos' && section === 'Treino ativo');
      return <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => go(name)}
        style={{ flex: wide ? undefined : 1, flexDirection: wide ? 'row' : 'column', gap: wide ? 12 : 3, alignItems: 'center', justifyContent: wide ? 'flex-start' : 'center',
          paddingHorizontal: wide ? 12 : 1, paddingVertical: 9, minHeight: 49, borderRadius: 10, backgroundColor: wide && selected ? '#13352A' : 'transparent' }}>
        <Icon path={path} color={selected ? c.green : c.muted} />
        <Caption style={{ color: selected ? c.green : c.muted, fontFamily: 'Inter_600SemiBold', fontSize: wide ? 14 : 9, lineHeight: 15 }}>{name}</Caption>
      </Pressable>;
    })}
  </View>;
}

function Home({ profile, workouts, store, moves, planTitle, start, go, wide }: {
  profile: Profile; workouts: Workout[]; store: Store; moves: Move[]; planTitle: string; start: () => void; go: (section: Section) => void; wide: boolean;
}) {
  const goal = store.get('targets') ?? targets;
  const weekly = new Set(workouts.filter(w => w.day >= weekStart()).map(w => w.day)).size;
  const water = todayWater(store);
  const elapsed = Math.round(workouts.reduce((sum, w) => sum + w.seconds, 0) / 60);
  const last = store.list('measure').map(e => e.value).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
  const active = store.get('active');
  const estimate = Math.ceil(moves.reduce((sum, m) => sum + m.sets * (m.rest + (m.exercise.timed ? m.target : m.target * 3)), 0) / 60);
  return <View style={{ gap: 18 }}>
    <View style={[row, { justifyContent: 'space-between', alignItems: 'center' }]}>
      <View style={{ flexShrink: 1 }}><Tag>{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', weekday: 'long' }).toUpperCase()}</Tag>
        <Title>Olá, {profile.name.split(' ')[0]}.</Title><Caption>Bora treinar hoje?</Caption></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => go('Perfil')}>
        {profile.photo ? <Image source={{ uri: profile.photo }} style={{ width: 48, height: 48, borderRadius: 24 }} /> :
          <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#164035' }}>
            <Caption style={{ color: c.green, fontSize: 20 }}>{profile.name[0].toUpperCase()}</Caption>
          </View>}
      </Pressable>
    </View>
    <View style={{ minHeight: 260, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: '#28523F', backgroundColor: '#11251E' }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: wide ? '56%' : '66%', overflow: 'hidden' }}>
        <Image source={require('./assets/vision-approved.jpg')} resizeMode="cover" accessibilityElementsHidden
          style={{ position: 'absolute', width: '100%', height: wide ? 530 : 290, top: wide ? -50 : -15, opacity: wide ? .9 : .65 }} />
        <Svg width="100%" height="100%">
          <Defs><LinearGradient id="hero-fade" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0" stopColor="#11251E" />
            <Stop offset=".52" stopColor="#11251E" stopOpacity={wide ? .22 : .7} />
            <Stop offset="1" stopColor="#11251E" stopOpacity={0} />
          </LinearGradient></Defs>
          <Rect width="100%" height="100%" fill="url(#hero-fade)" />
        </Svg>
      </View>
        <View style={{ padding: wide ? 30 : 18, flex: 1, gap: 10, justifyContent: 'center', backgroundColor: '#09181355' }}>
          <Tag>{active ? 'EM ANDAMENTO' : 'SEU PLANO DE TREINO'}</Tag>
          <Title>{active?.title ?? planTitle}</Title>
          <Caption style={{ color: '#E1F2E9' }}>{moves.length ? `${moves.length} exercícios · cerca de ${estimate} min` : 'Personalize seu plano no perfil.'}</Caption>
          <Button title={active ? 'Retomar treino' : moves.length ? 'Iniciar treino' : 'Revisar perfil'} onPress={moves.length || active ? start : () => go('Editar perfil')} style={{ alignSelf: 'flex-start', paddingHorizontal: 22, marginTop: 8 }} />
        </View>

    </View>
    <View style={row}>
      <Card style={{ flexGrow: 1, flexBasis: 230, gap: 10 }}><Tag>META SEMANAL</Tag><Title>{weekly} / {goal.workouts}</Title>
        <Meter value={weekly / goal.workouts} color={performance(weekly / goal.workouts)} /><Caption>Dias de treino nesta semana</Caption>
      </Card>
      <Card style={{ flexGrow: 1, flexBasis: 230, gap: 10 }}><Tag>TEMPO DE TREINO</Tag><Title>{elapsed} min</Title>
        <Caption>{workouts.length} {workouts.length === 1 ? 'sessão concluída' : 'sessões concluídas'}</Caption>
      </Card>
    </View>
    <Card style={stack}><View style={[row, { justifyContent: 'space-between', alignItems: 'center' }]}><Subtitle>Seu progresso</Subtitle>
      <Pressable accessibilityRole="button" onPress={() => go('Evolução')}><Tag>VER EVOLUÇÃO →</Tag></Pressable></View>
      <Chart values={last.map(m => m.weight)} label={last.length ? 'Peso em kg · último registro: ' + last.at(-1)?.weight : 'Peso em kg'} />
    </Card>
    <View style={row}>
      <Pressable accessibilityRole="button" onPress={() => go('Nutrição')} style={{ flex: 1 }}><Card style={{ gap: 6 }}><Icon path={practicePaths.Nutrição} color="#57C8ED" /><Subtitle>Hidratação</Subtitle><Caption>{water} ml hoje</Caption></Card></Pressable>
      <Pressable accessibilityRole="button" onPress={() => go('Conquistas')} style={{ flex: 1 }}><Card style={{ gap: 6 }}><Icon path={practicePaths.Conquistas} color="#FAD05B" /><Subtitle>Conquistas</Subtitle><Caption>Acompanhar metas</Caption></Card></Pressable>
    </View>
  </View>;
}

function AppContent() {
  const [loaded, setLoaded] = useState(false);
  const [local, setLocal] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [issue, setIssue] = useState('');
  const [section, go] = useState<Section>('Início');
  const [reminderDue, setReminderDue] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const owner = session?.user.id ?? 'local';
  const cloud = !!session;
  const store = useStore(owner, cloud, loaded && (local || cloud));
  const profile = store.get('profile');
  const active = store.get('active');
  const reminder = store.get('reminder');

  useEffect(() => {
    let mounted = true;
    const client = backend;
    const subscription = client?.auth.onAuthStateChange((event, value) => {
      if (!mounted) return;
      setSession(value);
      if (event === 'PASSWORD_RECOVERY') setMode('reset');
    }).data.subscription;
    const authUrl = async (url: string) => {
      if (!client) return;
      try { await finishAuth(url); }
      catch (e) { if (mounted) setIssue((e as Error).message); }
    };
    const listener = Linking.addEventListener('url', event => void authUrl(event.url));
    const task = async () => {
      try {
        const url = Platform.OS === 'web' ? window.location.href : await Linking.getInitialURL();
        if (url) await authUrl(url);
        const [localValue, auth] = await Promise.all([AsyncStorage.getItem(localModeKey), client?.auth.getSession()]);
        if (!mounted) return;
        setLocal(localValue === '1');
        setSession(auth?.data.session ?? null);
        if (auth?.data.session && url && (/\/reset(?:\?|$)|[?&]recovery=1/.test(url))) setMode('reset');
      } catch (e) { if (mounted) setIssue((e as Error).message); }
      finally { if (mounted) setLoaded(true); }
    };
    void task();
    const refresh = AppState.addEventListener('change', state => {
      if (state === 'active') void client?.auth.startAutoRefresh(); else void client?.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') void client?.auth.startAutoRefresh();
    return () => { mounted = false; subscription?.unsubscribe(); listener.remove(); refresh.remove(); };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !reminder || !profile) return;
    let shown = '';
    const show = () => {
      const now = new Date(), key = dateKey(now);
      if (shown !== key && now.getDay() === reminder.day && now.getHours() === reminder.hour && now.getMinutes() === reminder.minute) {
        shown = key; setReminderDue(true);
      }
    };
    show();
    const interval = setInterval(show, 15000);
    return () => { clearInterval(interval); setReminderDue(false); };
  }, [profile, reminder]);

  async function logout() {
    await clearDeviceReminder(owner);
    if (backend && session) {
      const { error } = await backend.auth.signOut({ scope: 'local' });
      if (error) throw error;
    }
    await AsyncStorage.removeItem(localModeKey);
    setSession(null); setLocal(false); setMode('welcome'); go('Início');
  }

  const workouts = store.list('workout').map(e => e.value).sort((a, b) => b.id.localeCompare(a.id));
  const moves = profile ? plan(profile, store.catalog, workouts) : [];
  const dayIndex = profile ? [...profile.days].sort((a, b) => (a + 6) % 7 - (b + 6) % 7).indexOf(new Date().getDay()) : -1;
  const planTitle = dayIndex < 0 ? 'Corpo inteiro' : 'Corpo inteiro ' + String.fromCharCode(65 + dayIndex);
  const enter = (next: Section) => go(next);
  function start() {
    if (!active && moves.length) {
      const now = Date.now();
      store.save('active', { title: planTitle, moves, index: 0, set: 0, sets: [], started: now, clock: now, elapsed: 0, restUntil: 0, restLeft: 0 });
    }
    if (active || moves.length) enter('Treino ativo');
  }
  const admin = session?.user.app_metadata.vision_admin === true;
  const app = loaded && store.ready && !!profile && mode !== 'reset';
  let content;
  if (!loaded || (mode !== 'reset' && (local || cloud) && !store.ready)) content = <><ActivityIndicator color={c.green} /><Caption>{store.status || 'Carregando VISION'}</Caption></>;
  else if (mode === 'reset' || (!cloud && !local)) content = <Account mode={mode} go={next => { setIssue(''); setMode(next); }} issue={issue} recovered={() => {
    if (Platform.OS === 'web') window.history.replaceState({}, '', window.location.pathname);
    setMode('welcome');
  }} local={() => {
    void AsyncStorage.setItem(localModeKey, '1').then(() => { setLocal(true); go('Início'); }, () => setIssue('Não foi possível salvar o modo local neste dispositivo.'));
  }} />;
  else if (!profile || section === 'Editar perfil') content = <ProfileForm key={owner} initial={profile} onSave={value => {
    const day = dateKey();
    const entries: import('./src/vision/domain').Entry[] = [{ key: 'profile', kind: 'profile', value }];
    store.changes(profile ? entries : [...entries, { key: 'measure:' + day, kind: 'measure', value: { day, weight: value.weight, waist: value.waist } }]);
    go('Início');
  }} />;
  else {
    switch (section) {
      case 'Início': content = <Home {...{ profile, workouts, store, moves, planTitle, start, wide }} go={enter} />; break;
      case 'Treino ativo': content = active && <ActiveWorkout active={active} store={store} profile={profile} back={() => go('Treinos')} />; break;
      case 'Treinos': content = <Plan moves={moves} title={planTitle} profile={profile} start={start} resume={!!active} library={() => enter('Biblioteca')} />; break;
      case 'Biblioteca': content = <Library catalog={store.catalog} />; break;
      case 'Agenda': content = <Calendar workouts={workouts} days={profile.days} />; break;
      case 'Evolução': content = <Progress store={store} workouts={workouts} profile={profile} />; break;
      case 'Nutrição': content = <Nutrition store={store} />; break;
      case 'Conquistas': content = <Achievements store={store} workouts={workouts} />; break;
      case 'Configurações': content = <Settings store={store} owner={owner} cloud={cloud} logout={logout} />; break;
      case 'Administração': content = admin && <Admin store={store} />; break;
      case 'Perfil': content = <View style={stack}><Title>Seu perfil</Title>
        <Card style={stack}>
          {!!profile.photo && <Image source={{ uri: profile.photo }} style={{ width: 88, height: 88, borderRadius: 44 }} />}
          <Subtitle>{profile.name}</Subtitle><Tag>{levels[profile.level].toUpperCase()} · {profile.goal.toUpperCase()}</Tag>
          <Caption>{profile.age} anos · {profile.height} cm · {profile.weight} kg na avaliação inicial</Caption>
          <Caption>Disponibilidade: {profile.days.map(d => weekdays[d]).join(', ')}</Caption>
          <Caption>{session?.user.email || 'Perfil neste dispositivo'}</Caption>
          <Button title="Editar perfil e avaliação" secondary onPress={() => enter('Editar perfil')} />
        </Card>
        <Button title="Nutrição e hidratação" secondary onPress={() => enter('Nutrição')} />
        <Button title="Metas e conquistas" secondary onPress={() => enter('Conquistas')} />
        <Button title="Configurações e privacidade" secondary onPress={() => enter('Configurações')} />
        {admin && <Button title="Painel administrativo" secondary onPress={() => enter('Administração')} />}
      </View>; break;
    }
  }

  return <SafeAreaView style={{ flex: 1, backgroundColor: c.obsidian }}>
    <StatusBar barStyle="light-content" />
    <KeyboardAvoidingView style={{ flex: 1, flexDirection: wide && app ? 'row' : 'column' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {wide && app && <Nav section={section} go={enter} wide />}
      <ScrollView key={section} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ width: '100%', maxWidth: app ? 1100 : 565, alignSelf: 'center', paddingHorizontal: wide ? 34 : 17, paddingVertical: wide ? 34 : 18, gap: 17 }}>
          {(!wide || !app) && <Wordmark />}
          {reminderDue && <Card style={stack}><Subtitle>Hora do treino</Subtitle><Button title="Dispensar aviso" secondary onPress={() => setReminderDue(false)} /></Card>}
          {content}
          {app && <Caption style={{ fontSize: 11 }}>{store.status}</Caption>}
        </View>
      </ScrollView>
      {!wide && app && <Nav section={section} go={enter} wide={false} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><AppContent /></SafeAreaProvider>; }
