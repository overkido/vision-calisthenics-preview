import { typeface } from '../typography';
import { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { backend, redirectUrl, social } from '../auth/authService';
import { Notice } from '../components/ui';
import { colors } from '../theme';
import { equipment, goals, levels, limits, number, weekdays, type Profile } from './domain';
import { Button, Caption, Card, Field, NumberField, Options, row, stack, Subtitle, Tag, Title } from './ui';

export type AuthMode = 'welcome' | 'login' | 'signup' | 'forgot' | 'reset';
export function Account({ mode, go, local, recovered, issue }: {
  mode: AuthMode; go: (mode: AuthMode) => void; local: () => void; recovered: () => void; issue: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const switchTo = (next: AuthMode) => { setNotice(''); setPassword(''); setConfirm(''); go(next); };
  async function run(action: () => Promise<void>) {
    setBusy(true); setNotice('');
    try { await action(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível acessar a conta.'); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (!backend) throw new Error('A conexão Supabase precisa ser configurada.');
    if (mode !== 'reset' && !/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Informe um e-mail válido.');
    if (mode !== 'forgot' && password.length < 8) throw new Error('Use pelo menos 8 caracteres na senha.');
    if ((mode === 'signup' || mode === 'reset') && password !== confirm) throw new Error('As senhas precisam ser iguais.');
    if (mode === 'login') {
      const { error } = await backend.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } else if (mode === 'signup') {
      const { data, error } = await backend.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectUrl() } });
      if (error) throw error;
      if (!data.session) setNotice('Confira sua caixa de entrada para confirmar a conta.');
    } else if (mode === 'forgot') {
      const { error } = await backend.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl(true) });
      if (error) throw error;
      setNotice('Se houver uma conta para esse e-mail, você receberá um link de recuperação.');
    } else {
      const { error } = await backend.auth.updateUser({ password });
      if (error) throw error;
      recovered();
    }
  }
  const [reveal, setReveal] = useState(false);
  const [feature, setFeature] = useState(0);
  const features = [['▥', 'Planos de Treino'], ['▤', 'Evolução Física'], ['♧', 'Nutrição e Hábitos'], ['☆', 'Desafios e Conquistas']];
  const pill = { borderRadius: 30 };
  if (mode === 'welcome') return <View style={{ gap: 14 }}>
    <EntryArt />
    <View><Text style={{ color: colors.white, fontFamily: typeface.italic, fontSize: 33, lineHeight: 36, letterSpacing: -1 }}>Evolua com a</Text>
      <Text style={{ color: colors.green, fontFamily: typeface.italic, fontSize: 39, lineHeight: 43, letterSpacing: -1.3 }}>Calistenia</Text></View>
    <Caption>{['Treinos personalizados, acompanhamento de evolução e planos para alcançar o seu próximo nível.', 'Acompanhe seu desempenho com dados das suas sessões.', 'Registre refeições, água e lembretes de hidratação.', 'Complete sua meta semanal e acompanhe suas conquistas.'][feature]}</Caption>
    <View style={{ flexDirection: 'row', gap: 7 }}>{features.map(([icon, label], i) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: feature === i }} onPress={() => setFeature(i)} style={{ flex: 1, backgroundColor: colors.graphite, borderWidth: 1, borderColor: feature === i ? colors.green : colors.line, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 5, minHeight: 74, gap: 4 }}>
      <Text style={{ color: colors.green, fontSize: 22 }}>{icon}</Text><Caption style={{ fontSize: 10, lineHeight: 14, textAlign: 'center' }}>{label}</Caption></Pressable>)}</View>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, padding: 5 }}>{features.map(([,label], i) => <View key={label} style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: i === feature ? colors.green : colors.line }} />)}</View>
    <Button title="Começar agora" style={pill} onPress={() => backend ? switchTo('signup') : local()} />
    <Button title="Já tenho uma conta" style={{ ...pill, borderColor: '#74818A' }} secondary onPress={() => switchTo('login')} />
    <InlineAction label="Treinar neste dispositivo" onPress={local} />
    {!!issue && <Notice>{issue}</Notice>}
  </View>;
  const labels = { login: 'Entrar', signup: 'Criar conta', forgot: 'Recuperar senha', reset: 'Definir nova senha' };
  return <View style={{ gap: 10 }}>
    {mode !== 'reset' && <InlineAction label="‹ Voltar" onPress={() => switchTo(mode === 'forgot' ? 'login' : 'welcome')} />}
    <EntryArt login />
    <Title>{mode === 'login' ? 'Entre na sua conta' : labels[mode]}</Title>
    {mode === 'login' && <Caption>Acompanhe seus treinos, evolução, metas e conquistas.</Caption>}
    {mode !== 'reset' && <AuthField label="E-mail" icon="✉" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />}
    {mode !== 'forgot' && <AuthField label="Senha" icon="♙" value={password} onChangeText={setPassword} secureTextEntry={!reveal} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      end={<InlineAction label={reveal ? 'Ocultar' : 'Mostrar'} onPress={() => setReveal(!reveal)} />} />}
    {(mode === 'signup' || mode === 'reset') && <AuthField label="Confirmar senha" icon="♙" value={confirm} onChangeText={setConfirm} secureTextEntry={!reveal} />}
    {mode === 'login' && <View style={{ alignSelf: 'flex-end' }}><InlineAction label="Esqueceu sua senha?" onPress={() => switchTo('forgot')} /></View>}
    {!!(notice || issue) && <Notice>{notice || issue}</Notice>}
    <Button title={mode === 'forgot' ? 'Enviar link de recuperação' : labels[mode]} style={pill} loading={busy} onPress={() => void run(submit)} />
    {(mode === 'login' || mode === 'signup') && <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 }}><View style={{ height: 1, flex: 1, backgroundColor: colors.line }} /><Caption>ou entre com</Caption><View style={{ height: 1, flex: 1, backgroundColor: colors.line }} /></View>
      <Button title="Continuar com o Google" secondary loading={busy} onPress={() => void run(() => social('google'))} />
      <Button title="Continuar com a Apple" secondary loading={busy} onPress={() => void run(() => social('apple'))} />
      {mode === 'login' && <Button title="Continuar com o e-mail" secondary loading={busy} onPress={() => void run(submit)} />}
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Caption>{mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}</Caption>
        <InlineAction label={mode === 'login' ? 'Criar conta gratuita' : 'Entrar na minha conta'} onPress={() => switchTo(mode === 'login' ? 'signup' : 'login')} />
      </View>
    </>}
  </View>;
}

function EntryArt({login = false}: {login?: boolean}) {
  const [width, setWidth] = useState(0);
  const crop = login ? {x:143,y:102,w:727,h:367} : {x:123,y:94,w:776,h:488};
  const scale = width / crop.w;
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="VISION Calisthenics"
    style={{ width: '100%', aspectRatio: crop.w/crop.h, overflow: 'hidden', backgroundColor: '#080E11' }}>
    {width > 0 && <Image source={login ? require('../../assets/reference-login.jpg') : require('../../assets/reference-welcome.jpg')} resizeMode="stretch"
      style={{ position: 'absolute', width: 1024*scale, height: 1536*scale, left: -crop.x*scale, top: -crop.y*scale }} />}
  </View>;
}
function InlineAction({label,onPress}: {label:string;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={{ alignItems: 'center', justifyContent: 'center', minHeight: 35, paddingHorizontal: 4 }}>
    <Caption style={{ color: colors.green, fontFamily: typeface.semibold }}>{label}</Caption>
  </Pressable>;
}
function AuthField({label,icon,end,...props}: import('react-native').TextInputProps & {label:string;icon:string;end?:React.ReactNode}) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.graphite, minHeight: 48 }}>
    <Text style={{ color: colors.muted, fontSize: 19 }}>{icon}</Text>
    <TextInput {...props} accessibilityLabel={label} placeholder={label} placeholderTextColor={colors.muted} style={{ color: colors.white, minWidth: 0, flex: 1, minHeight: 47, fontFamily: typeface.regular, fontSize: 15 }} />
    {end}
  </View>;
}

const toggle = <T,>(values: T[], value: T) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
export function ProfileForm({ initial, onSave }: { initial?: Profile; onSave: (profile: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState(initial?.age.toString() ?? '');
  const [weight, setWeight] = useState(initial?.weight.toString() ?? '');
  const [height, setHeight] = useState(initial?.height.toString() ?? '');
  const [waist, setWaist] = useState(initial?.waist?.toString() ?? '');
  const [gender, setGender] = useState(initial?.gender ?? '');
  const [minutes, setMinutes] = useState(initial?.minutes ?? 30);
  const [measurements, setMeasurements] = useState(() => Object.fromEntries(Object.entries(initial?.measurements ?? {}).map(([key, value]) => [key, String(value)])));
  const [goal, setGoal] = useState(initial?.goal ?? '');
  const [level, setLevel] = useState(initial?.level ?? -1);
  const [days, setDays] = useState(initial?.days ?? []);
  const [gear, setGear] = useState(initial?.equipment ?? []);
  const [restrictions, setRestrictions] = useState(initial?.limits ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [pushups, setPushups] = useState(initial?.pushups.toString() ?? '0');
  const [plank, setPlank] = useState(initial?.plank.toString() ?? '0');
  const [photo, setPhoto] = useState(initial?.photo);
  const [error, setError] = useState('');
  async function pick(camera: boolean) {
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Autorize a câmera para tirar uma foto.');
      const options = { mediaTypes: ['images' as const], allowsEditing: true, aspect: [1, 1] as [number, number], base64: true, quality: .35 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets[0].base64) {
        if (result.assets[0].base64.length > 350000) throw new Error('Escolha uma foto menor que 256 KB após a compactação.');
        setPhoto('data:image/jpeg;base64,' + result.assets[0].base64);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao abrir a foto.'); }
  }
  const measureFields = [['chest','Peito'],['hip','Quadril'],['arm','Braço'],['thigh','Coxa']];
  const optional = (value: string | undefined) => value?.trim() ? number(value, 10, 260) : undefined;
  function next() {
    setError('');
    try {
      if (step === 0) {
        if (name.trim().length < 2) throw new Error('Informe seu nome completo.');
        number(age, 13, 110, true);
      }
      if (step === 1) {
        number(weight, 25, 400); number(height, 100, 250);
        optional(waist); Object.values(measurements).forEach(optional);
      }
      if (step === 2 && !goal) throw new Error('Selecione seu objetivo.');
      if (step === 3 && level < 0) throw new Error('Selecione seu nível.');
      if (step === 4 && !days.length) throw new Error('Selecione ao menos um dia.');
      if (step < 7) { setStep(step + 1); return; }
      onSave({ name: name.trim(), age: number(age, 13, 110, true), weight: number(weight, 25, 400), height: number(height, 100, 250),
        waist: optional(waist), measurements: Object.fromEntries(measureFields.map(([key]) => [key, optional(measurements[key])])),
        gender: gender || undefined, minutes, favoriteExercises: initial?.favoriteExercises, goal, level, days, equipment: gear, limits: restrictions, notes: notes.trim(),
        pushups: number(pushups, 0, 150, true), plank: number(plank, 0, 600, true), photo });
    } catch (e) { setError(e instanceof Error ? e.message : 'Confira o formulário.'); }
  }
  const titles = ['Dados pessoais','Medidas e peso','Qual é o seu objetivo?','Nível de experiência','Disponibilidade de treino','Equipamentos disponíveis','Limitações e lesões','Avaliação inicial'];
  const descriptions = ['Vamos começar com as suas informações básicas.','Essas informações nos ajudam a personalizar seu plano de treino.','Escolha o seu principal foco agora.','Qual é o seu nível atual na calistenia?','Quais dias e quanto tempo você pode treinar?','Selecione o que você tem em casa.','Informe se você possui alguma limitação física.','Registre o que você já consegue fazer com controle. Use 0 se ainda não tiver um resultado.'];
  return <View style={stack}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 50 }}>{step > 0 && <InlineAction label="‹ Voltar" onPress={() => { setError(''); setStep(step - 1); }} />}</View>
      <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>{titles.map((title,i) => <View key={title} style={{ width: 14, height: 4, borderRadius: 3, backgroundColor: i <= step ? colors.green : colors.line }} />)}</View>
        <Caption>Passo {step + 1} de 8</Caption>
      </View><View style={{ width: 50 }} />
    </View>
    <Title>{titles[step]}</Title><Caption>{descriptions[step]}</Caption>
    {step === 0 && <>
      <View style={{ alignItems: 'center', gap: 6 }}>
        {photo ? <Image source={{ uri: photo }} accessibilityLabel="Foto de perfil" style={{ width: 92, height: 92, borderRadius: 46 }} /> :
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.graphite, alignItems: 'center', justifyContent: 'center' }}><Caption>Foto</Caption></View>}
        <View style={row}><InlineAction label="Galeria" onPress={() => void pick(false)} /><InlineAction label="Câmera" onPress={() => void pick(true)} />
          {!!photo && <InlineAction label="Remover foto" onPress={() => setPhoto(undefined)} />}</View>
      </View>
      <Field label="Nome completo" value={name} onChangeText={setName} maxLength={80} />
      <NumberField label="Idade" value={age} set={setAge} />
      <Options label="GÊNERO (OPCIONAL)" options={['Masculino','Feminino','Outro','Prefiro não informar']} selected={[gender]} toggle={setGender} />
    </>}
    {step === 1 && <>
      <NumberField label="Peso atual (kg)" value={weight} set={setWeight} />
      <NumberField label="Altura (cm)" value={height} set={setHeight} />
      <Subtitle>Medidas corporais (opcional)</Subtitle>
      <NumberField label="Cintura (cm)" value={waist} set={setWaist} />
      {measureFields.map(([key,label]) => <NumberField key={key} label={label+' (cm)'} value={measurements[key] ?? ''} set={value => setMeasurements({ ...measurements,[key]:value })} />)}
    </>}
    {step === 2 && goals.map((option,i) => <Pick key={option} title={option} active={goal === option} onPress={() => setGoal(option)}
      description={['Aumentar sua força','Ganhar massa muscular','Melhorar o condicionamento','Evoluir nos movimentos de calistenia','Apoiar a redução de gordura corporal'][i]} />)}
    {step === 3 && levels.map((option,i) => <Pick key={option} title={option} active={level === i} onPress={() => setLevel(i)}
      description={['Estou começando ou tenho pouca prática.','Já treino há um tempo e domino os básicos.','Tenho boa base e busco evoluir em habilidades.','Busco desenvolver habilidades de alta complexidade.'][i]} />)}
    {step === 4 && <>
      <Options label="DIAS DA SEMANA" options={[1,2,3,4,5,6,0]} selected={days} toggle={day => setDays(toggle(days,day))} display={day => weekdays[day]} />
      <Options label="TEMPO POR TREINO" options={[30,45,60,90]} selected={[minutes]} toggle={setMinutes} display={value => value+' min'} />
      <Card><Tag>RESUMO DA ROTINA</Tag><Caption>{days.length} dias/semana · até {minutes} min por treino</Caption></Card>
    </>}
    {step === 5 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Pick title="Peso do corpo" active={!gear.length} onPress={() => setGear([])} grid />
      {equipment.map(option => <Pick key={option} title={option} active={gear.includes(option)} onPress={() => setGear(toggle(gear,option))} grid />)}
    </View>}
    {step === 6 && <>
      <Pick title="Nenhuma limitação" active={!restrictions.length && !notes} onPress={() => { setRestrictions([]); setNotes(''); }} />
      {limits.map(option => <Pick key={option} title={option} active={restrictions.includes(option)} onPress={() => setRestrictions(toggle(restrictions,option))} />)}
      <Field label="Outra limitação (opcional)" value={notes} onChangeText={setNotes} maxLength={400} />
      <Caption>Quando você descreve outra limitação, a geração automática fica pausada até revisar seu perfil.</Caption>
    </>}
    {step === 7 && <>
      <NumberField label="Flexões completas" value={pushups} set={setPushups} />
      <NumberField label="Tempo de prancha (s)" value={plank} set={setPlank} />
    </>}
    {!!error && <Notice tone="error">{error}</Notice>}
    <Button title={step < 7 ? 'Continuar' : 'Salvar perfil'} onPress={next} style={{ borderRadius: 30 }} />
  </View>;
}

function Pick({title,description,active,onPress,grid}: {title:string;description?:string;active:boolean;onPress:()=>void;grid?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={{ flexGrow: grid ? 1 : 0, flexBasis: grid ? '44%' : undefined,
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: active ? colors.green : colors.line, backgroundColor: active ? '#12392A' : colors.graphite }}>
    <View style={{ flex: 1 }}><Caption style={{ color: colors.white, fontFamily: typeface.bold }}>{title}</Caption>{description && <Caption>{description}</Caption>}</View>
    <Caption style={{ color: active ? colors.green : colors.muted }}>{active ? '✓' : '○'}</Caption>
  </Pressable>;
}
