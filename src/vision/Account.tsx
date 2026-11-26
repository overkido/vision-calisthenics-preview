import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { backend, redirectUrl, social } from '../auth/authService';
import { Notice } from '../components/ui';
import { colors } from '../theme';
import { equipment, goals, levels, limits, number, weekdays, type Profile } from './domain';
import { Button, Caption, Card, Field, Logo, NumberField, Options, row, stack, Subtitle, Tag, Title } from './ui';

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
  if (mode === 'welcome') return <View style={stack}>
    <View style={{ borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#224337', backgroundColor: '#060B0A' }}><Logo size={334} /></View>
    <Tag>CALISTENIA · TREINO PERSONALIZADO</Tag>
    <Title>Seu próximo nível começa aqui.</Title>
    <Caption>Monte seu plano, registre cada série e acompanhe sua evolução.</Caption>
    <Button title="Criar conta" onPress={() => switchTo('signup')} />
    <Button title="Já tenho conta" secondary onPress={() => switchTo('login')} />
    <Button title="Treinar neste dispositivo" secondary onPress={local} />
    {!!issue && <Notice>{issue}</Notice>}
  </View>;
  const labels = { login: 'Entrar', signup: 'Criar conta', forgot: 'Recuperar senha', reset: 'Definir nova senha' };
  return <Card>
    <Title>{labels[mode]}</Title>
    {mode !== 'reset' && <Button title="Voltar" secondary onPress={() => switchTo('welcome')} style={{ marginVertical: 12 }} />}
    {mode !== 'reset' && <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />}
    {mode !== 'forgot' && <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />}
    {(mode === 'signup' || mode === 'reset') && <Field label="Confirmar senha" value={confirm} onChangeText={setConfirm} secureTextEntry />}
    {!!(notice || issue) && <Notice>{notice || issue}</Notice>}
    <View style={stack}>
      <Button title={mode === 'forgot' ? 'Enviar link de recuperação' : labels[mode]} loading={busy} onPress={() => void run(submit)} />
      {mode === 'login' && <Button title="Esqueci minha senha" secondary onPress={() => switchTo('forgot')} />}
      {(mode === 'login' || mode === 'signup') && <>
        <Button title="Continuar com Google" secondary loading={busy} onPress={() => void run(() => social('google'))} />
        <Button title="Continuar com Apple" secondary loading={busy} onPress={() => void run(() => social('apple'))} />
      </>}
    </View>
  </Card>;
}

const toggle = <T,>(values: T[], value: T) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
export function ProfileForm({ initial, onSave }: { initial?: Profile; onSave: (profile: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState(initial?.age.toString() ?? '');
  const [weight, setWeight] = useState(initial?.weight.toString() ?? '');
  const [height, setHeight] = useState(initial?.height.toString() ?? '');
  const [waist, setWaist] = useState(initial?.waist?.toString() ?? '');
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
  function next() {
    setError('');
    try {
      if (name.trim().length < 2) throw new Error('Informe seu nome.');
      const values = { age: number(age, 13, 110, true), weight: number(weight, 25, 400), height: number(height, 100, 250), waist: waist ? number(waist, 30, 260) : undefined };
      if (step === 0) { setStep(1); return; }
      if (!goal || level < 0 || !days.length) throw new Error('Selecione objetivo, nível e ao menos um dia de treino.');
      if (step === 1) { setStep(2); return; }
      onSave({ ...values, name: name.trim(), goal, level, days, equipment: gear, limits: restrictions, notes: notes.trim(), pushups: number(pushups, 0, 150, true), plank: number(plank, 0, 600, true), photo });
    } catch (e) { setError(e instanceof Error ? e.message : 'Confira o formulário.'); }
  }
  return <View style={stack}>
    <Tag>PERFIL · {step + 1} DE 3</Tag>
    <Title>{['Seus dados físicos', 'Seu objetivo', 'Avaliação inicial'][step]}</Title>
    <Card>
      {step === 0 && <>
        {photo && <Image source={{ uri: photo }} accessibilityLabel="Foto de perfil" style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 12 }} />}
        <View style={[row, { marginBottom: 16 }]}>
          <Button title="Galeria" secondary onPress={() => void pick(false)} style={{ flex: 1 }} />
          <Button title="Câmera" secondary onPress={() => void pick(true)} style={{ flex: 1 }} />
          {!!photo && <Button title="Remover foto" secondary onPress={() => setPhoto(undefined)} style={{ flex: 1 }} />}
        </View>
        <Field label="Nome" value={name} onChangeText={setName} maxLength={80} />
        <NumberField label="Idade" value={age} set={setAge} />
        <NumberField label="Peso (kg)" value={weight} set={setWeight} />
        <NumberField label="Altura (cm)" value={height} set={setHeight} />
        <NumberField label="Cintura (cm, opcional)" value={waist} set={setWaist} />
      </>}
      {step === 1 && <>
        <Options label="OBJETIVO" options={goals} selected={[goal]} toggle={setGoal} />
        <Options label="NÍVEL DE EXPERIÊNCIA" options={[0, 1, 2]} selected={[level]} toggle={setLevel} display={n => levels[n]} />
        <Options label="DIAS DISPONÍVEIS" options={[1, 2, 3, 4, 5, 6, 0]} selected={days} toggle={day => setDays(toggle(days, day))} display={day => weekdays[day]} />
        <Options label="EQUIPAMENTOS" options={equipment} selected={gear} toggle={value => setGear(toggle(gear, value))} />
      </>}
      {step === 2 && <>
        <Subtitle>Seu ponto de partida</Subtitle>
        <Caption>Registre o que você já consegue fazer com controle. Use 0 quando não tiver um resultado.</Caption>
        <View style={{ marginTop: 16 }}>
          <NumberField label="Flexões completas" value={pushups} set={setPushups} />
          <NumberField label="Tempo de prancha (s)" value={plank} set={setPlank} />
        </View>
        <Options label="REGIÕES COM LIMITAÇÃO" options={limits} selected={restrictions} toggle={value => setRestrictions(toggle(restrictions, value))} />
        <Field label="Outra limitação (opcional)" value={notes} onChangeText={setNotes} maxLength={400} />
        <Caption>Com outra limitação registrada, a geração automática fica pausada até você revisar seu perfil.</Caption>
      </>}
      {!!error && <Notice tone="error">{error}</Notice>}
      <Button title={step < 2 ? 'Continuar' : 'Salvar perfil'} onPress={next} style={{ marginTop: 12 }} />
      {step > 0 && <Button title="Voltar" secondary onPress={() => { setError(''); setStep(step - 1); }} style={{ marginTop: 8 }} />}
    </Card>
  </View>;
}
