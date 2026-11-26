import { useState } from 'react';
import { Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backend } from '../auth/authService';
import { Notice } from '../components/ui';
import { equipment, levels, limits, number, weekdays, type Exercise, type Reminder } from './domain';
import { cancelReminder, scheduleReminder } from './reminders';
import { type Store } from './store';
import { Button, Caption, Card, Field, NumberField, Options, stack, Subtitle, Title } from './ui';
export const reminderKey = (owner: string) => 'vision:reminder:' + owner;
export async function clearDeviceReminder(owner: string) {
  const key = reminderKey(owner);
  const id = await AsyncStorage.getItem(key);
  await cancelReminder(id ?? undefined);
  await AsyncStorage.removeItem(key);
}

export function Settings({ store, owner, cloud, logout }: { store: Store; owner: string; cloud: boolean; logout: () => Promise<void> }) {
  const saved = store.get('reminder');
  const [day, setDay] = useState(saved?.day ?? 1);
  const [hour, setHour] = useState(String(saved?.hour ?? 18));
  const [minute, setMinute] = useState(String(saved?.minute ?? 0));
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setNotice('');
    try { await action(); }
    catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  }
  async function save() {
    const reminder: Reminder = { day, hour: number(hour, 0, 23, true), minute: number(minute, 0, 59, true) };
    const key = reminderKey(owner);
    const old = await AsyncStorage.getItem(key);
    const id = await scheduleReminder(reminder);
    if (id) {
      try { await AsyncStorage.setItem(key, id); }
      catch (e) { await cancelReminder(id); throw e; }
    }
    await cancelReminder(old ?? undefined);
    store.save('reminder', reminder);
    setNotice('Lembrete salvo.');
  }
  return <View style={stack}>
    <Title>Configurações</Title>
    {!!notice && <Notice>{notice}</Notice>}
    <Card style={stack}><Subtitle>Lembrete semanal</Subtitle>
      <Caption>{Platform.OS === 'web' ? 'No navegador, o aviso aparece no horário com o app aberto.' : 'A notificação é agendada neste aparelho.'}</Caption>
      <Options label="DIA" options={[0, 1, 2, 3, 4, 5, 6]} selected={[day]} toggle={setDay} display={n => weekdays[n]} />
      <NumberField label="Hora (0–23)" value={hour} set={setHour} />
      <NumberField label="Minuto (0–59)" value={minute} set={setMinute} />
      <Button title="Salvar lembrete" loading={busy} onPress={() => void run(save)} />
      {saved && <Button title="Desativar lembrete" secondary loading={busy} onPress={() => void run(async () => {
        await clearDeviceReminder(owner); store.remove('reminder'); setNotice('Lembrete desativado.');
      })} />}
    </Card>
    <Card style={stack}><Subtitle>Privacidade e dados</Subtitle>
      <Caption>Seus registros ficam neste dispositivo{cloud ? ' e são sincronizados na sua conta privada' : ''}. Estado: {store.status}.</Caption>
      {cloud && <Button title="Sincronizar agora" secondary onPress={store.sync} />}
      <Button title={cloud ? 'Sair da conta' : 'Voltar às boas-vindas'} secondary loading={busy} onPress={() => void run(logout)} />
      <Field label={cloud ? 'Digite EXCLUIR para apagar a conta e seus dados' : 'Digite EXCLUIR para apagar seus dados locais'} value={confirm} onChangeText={setConfirm} />
      <Button title={cloud ? 'Excluir conta definitivamente' : 'Apagar dados deste dispositivo'} secondary loading={busy} onPress={() => void run(async () => {
        if (confirm !== 'EXCLUIR') throw new Error('Digite EXCLUIR para confirmar.');
        if (cloud && backend) {
          const { error } = await backend.rpc('delete_vision_account');
          if (error) throw error;
        }
        await clearDeviceReminder(owner);
        await store.clearLocal();
        await logout();
      })} />
    </Card>
  </View>;
}

export function Admin({ store }: { store: Store }) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Empurrar');
  const [level, setLevel] = useState(0);
  const [gear, setGear] = useState('');
  const [avoid, setAvoid] = useState<string[]>([]);
  const [timed, setTimed] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [video, setVideo] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  function load(e: Exercise) {
    setId(e.id); setName(e.name); setGroup(e.group); setLevel(e.level); setGear(e.gear); setAvoid(e.avoid); setTimed(e.timed);
    setInstructions(e.steps.join('\n')); setVideo(e.video ?? '');
  }
  async function save(remove = false) {
    if (!backend || busy) return;
    setBusy(true);
    try {
      if (!/^[a-z0-9-]{2,60}$/.test(id)) throw new Error('Use um identificador com letras minúsculas, números ou hífens.');
      if (remove) {
        const { error } = await backend.from('vision_catalog').delete().eq('id', id);
        if (error) throw error;
      } else {
        const steps = instructions.split('\n').map(s => s.trim()).filter(Boolean);
        if (!name.trim() || steps.length < 2) throw new Error('Preencha nome e pelo menos duas instruções.');
        if (video.trim() && new URL(video.trim()).protocol !== 'https:') throw new Error('Informe uma URL HTTPS para o vídeo.');
        const exercise: Exercise = { id, name: name.trim(), group, level, gear, avoid, timed, steps, video: video.trim() || undefined };
        const { error } = await backend.from('vision_catalog').upsert({ id, exercise });
        if (error) throw error;
      }
      setNotice(remove ? 'Entrada do catálogo remoto removida.' : 'Exercício publicado no catálogo.'); store.sync();
    } catch (e) { setNotice((e as Error).message); }
    finally { setBusy(false); }
  }
  return <View style={stack}><Title>Painel administrativo</Title>
    <Card style={stack}>
      <Subtitle>Catálogo de exercícios</Subtitle>
      <Options label="EDITAR EXERCÍCIO" options={store.catalog.map(e => e.id)} selected={[id]} toggle={selected => {
        const exercise = store.catalog.find(e => e.id === selected); if (exercise) load(exercise);
      }} display={selected => store.catalog.find(e => e.id === selected)?.name ?? selected} />
      <Field label="Identificador" value={id} onChangeText={setId} maxLength={60} />
      <Field label="Nome" value={name} onChangeText={setName} maxLength={100} />
      <Options label="GRUPO" options={['Empurrar','Puxar','Pernas','Core']} selected={[group]} toggle={setGroup} />
      <Options label="NÍVEL" options={[0,1,2]} selected={[level]} toggle={setLevel} display={n => levels[n]} />
      <Options label="EQUIPAMENTO" options={['', ...equipment]} selected={[gear]} toggle={setGear} display={x => x || 'Sem equipamento'} />
      <Options label="LIMITAÇÕES" options={limits} selected={avoid} toggle={x => setAvoid(avoid.includes(x) ? avoid.filter(y => y !== x) : [...avoid, x])} />
      <Options label="CONTAGEM" options={['Repetições','Segundos']} selected={[timed ? 'Segundos' : 'Repetições']} toggle={x => setTimed(x === 'Segundos')} />
      <Field label="Instruções (uma etapa por linha)" value={instructions} onChangeText={setInstructions} multiline maxLength={4000} style={{ height: 110 }} />
      <Field label="URL do vídeo" value={video} onChangeText={setVideo} autoCapitalize="none" maxLength={500} />
      {!!notice && <Notice>{notice}</Notice>}
      <Button title="Salvar exercício" loading={busy} onPress={() => void save()} />
      <Button title="Remover entrada remota" secondary loading={busy} onPress={() => void save(true)} />
    </Card>
  </View>;
}
