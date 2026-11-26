import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { backend } from '../auth/authService';
import type { Data, Entry, Exercise, Kind } from './domain';
import { builtIn } from './catalog';

export function useStore(owner: string, cloud: boolean, loaded: boolean) {
  const storageKey = 'vision:v1:' + owner;
  const [state, setState] = useState<{ key: string; entries: Entry[] }>({ key: '', entries: [] });
  const [status, setStatus] = useState('');
  const [remote, setRemote] = useState<Exercise[]>([]);
  const ref = useRef<Entry[]>([]);
  const syncRef = useRef<() => void>(() => {});
  const outbox = useRef<Promise<void>>(Promise.resolve());
  const ready = state.key === storageKey && loaded;
  const persist = (entries: Entry[]) => {
    outbox.current = outbox.current.catch(() => {}).then(() => AsyncStorage.setItem(storageKey, JSON.stringify(entries)));
    return outbox.current;
  };
  useEffect(() => {
    if (!loaded) return;
    let live = true, syncing = false;
    const client = cloud ? backend : null;
    const apply = (entries: Entry[]) => {
      if (!live) return;
      ref.current = entries;
      setState({ key: storageKey, entries });
    };
    const sync = async () => {
      if (!live || !client || syncing) return;
      syncing = true;
      setStatus('Sincronizando');
      try {
        await outbox.current;
        const pending = ref.current.filter(e => e.pending);
        if (pending.length) {
          const { error } = await client.from('vision_entries').upsert(pending.map(e => ({
            user_id: owner, key: e.key, kind: e.kind, value: e.value,
          })));
          if (error) throw error;
        }
        const received: Entry[] = [];
        for (let start = 0; live; start += 500) {
          const { data, error } = await client.from('vision_entries').select('key,kind,value').eq('user_id', owner)
            .order('key').range(start, start + 499);
          if (error) throw error;
          received.push(...data as Entry[]);
          if (data.length < 500) break;
        }
        if (!live) return;
        const edits = ref.current.filter(e => e.pending && !pending.includes(e));
        const merged = new Map(received.map(entry => [entry.key, entry]));
        edits.forEach(entry => merged.set(entry.key, entry));
        apply([...merged.values()]);
        await persist([...merged.values()]);
        if (!live) return;
        setStatus(edits.length ? 'Alterações pendentes' : 'Em dia');
        const { data } = await client.from('vision_catalog').select('exercise');
        if (live && data) setRemote(data.map(row => row.exercise as Exercise));
      } catch {
        if (live) setStatus('Sincronização pendente');
      } finally {
        syncing = false;
      }
    };
    ref.current = [];
    setState({ key: '', entries: [] });
    setRemote([]);
    setStatus(cloud ? 'Sincronização pendente' : 'Neste dispositivo');
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (!live) return;
        apply(saved ? JSON.parse(saved) as Entry[] : []);
        syncRef.current = () => { void sync(); };
        void sync();
      } catch {
        if (live) setStatus('Falha ao abrir os dados locais');
      }
    };
    void load();
    const timer = setInterval(() => void sync(), 20000);
    const online = () => void sync();
    if (typeof window !== 'undefined') window.addEventListener?.('online', online);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void sync(); });
    return () => { live = false; clearInterval(timer); subscription.remove(); if (typeof window !== 'undefined') window.removeEventListener?.('online', online); syncRef.current = () => {}; };
  }, [owner, cloud, storageKey, loaded]);

  function changes(entries: Entry[]) {
    if (!ready) throw new Error('Aguarde o carregamento dos dados.');
    const next = new Map(ref.current.map(entry => [entry.key, entry]));
    entries.forEach(entry => next.set(entry.key, { ...entry, pending: cloud }));
    ref.current = [...next.values()];
    setState({ key: storageKey, entries: ref.current });
    void persist(ref.current).then(() => syncRef.current(), () => setStatus('Falha ao salvar neste dispositivo'));
  }
  const entries = ready ? state.entries : [];
  const list = <K extends Kind>(kind: K) => entries.flatMap(e => e.kind === kind && e.value !== null ? [{ key: e.key, value: e.value as Data[K] }] : []);
  const get = <K extends Kind>(kind: K) => list(kind).find(e => e.key === kind)?.value;
  const save = <K extends Kind>(kind: K, value: Data[K], key: string = kind) => changes([{ kind, key, value }]);
  const remove = (kind: Kind, key: string = kind) => changes([{ kind, key, value: null }]);
  const catalog = [...new Map([...builtIn, ...remote].map(exercise => [exercise.id, exercise])).values()];
  async function clearLocal() {
    if (!ready) return;
    ref.current = [];
    outbox.current = outbox.current.catch(() => {}).then(() => AsyncStorage.removeItem(storageKey));
    await outbox.current;
    setState({ key: storageKey, entries: [] });
  }
  return { ready, status, list, get, save, remove, changes, clearLocal, catalog, sync: () => syncRef.current(), entries };
}
export type Store = ReturnType<typeof useStore>;
export const newKey = (prefix: Kind) => prefix + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2);
