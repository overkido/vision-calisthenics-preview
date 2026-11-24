import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark, Wordmark } from './src/components/BrandMark';
import { Button, Card, Field, Label, Notice } from './src/components/ui';
import { beginSignIn, AuthProvider } from './src/auth/authService';
import { colors } from './src/theme';

type Screen = 'welcome' | 'signup' | 'login' | 'profileSetup' | 'home';
type Tab = 'Início' | 'Treinos' | 'Biblioteca' | 'Progresso' | 'Perfil';
const tabs: Tab[] = ['Início', 'Treinos', 'Biblioteca', 'Progresso', 'Perfil'];
const title = (text: string, size = 27) => <Text style={{ color: colors.white, fontSize: size, fontWeight: '900', letterSpacing: .2, lineHeight: size * 1.15 }}>{text}</Text>;
const caption = (text: string) => <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>{text}</Text>;

function AppContent() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [tab, setTab] = useState<Tab>('Início');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoOptions, setPhotoOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function auth(provider: AuthProvider) {
    setBusy(true); setNotice('');
    try { const result = await beginSignIn(provider); setNotice(result.message); }
    finally { setBusy(false); }
  }
  async function selectPhoto(camera = false) {
    setNotice('');
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setNotice(camera ? 'Permissão da câmera negada. Você pode escolher uma foto da galeria nas configurações.' : 'Permissão da galeria negada. Você pode ativá-la nas configurações do aparelho.'); return; }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .85 });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  }

  function navBack() { setNotice(''); setScreen('welcome'); }
  function Header({ back = true }: { back?: boolean }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}><Wordmark />{back && <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={navBack}><Text style={{ color: colors.muted, fontSize: 23, padding: 8 }}>‹</Text></Pressable>}</View>; }
  function OAuthButtons() { return <View style={{ gap: 11, marginTop: 16 }}><Button title="Continuar com Google" secondary onPress={() => auth('google')} loading={busy} /><Button title="Continuar com Apple" secondary onPress={() => auth('apple')} loading={busy} /><Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 2 }}>Integração de autenticação aguardando credenciais do provedor.</Text></View>; }
  function Welcome() { return <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', padding: 24, paddingTop: 42 }}>
    <Header back={false} />
    <View style={{ alignItems: 'center', paddingVertical: 24 }}><Image accessibilityLabel="Logo Vision Calisthenics" source={require('./assets/vision-logo.png')} resizeMode="contain" style={{ width: 248, height: 248, marginBottom: 18 }} /><Text style={{ color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 13 }}>TREINE COM PROPÓSITO</Text>{title('SEU PRÓXIMO NÍVEL', 30)}<Text style={{ color: colors.white, fontSize: 30, fontWeight: '900', marginTop: 4 }}>COMEÇA AQUI.</Text><View style={{ marginTop: 14 }}>{caption('Força, consistência e evolução. Seu treino de calistenia, no seu ritmo.')}</View></View>
    <View style={{ gap: 12, paddingBottom: 12 }}><Button title="EXPLORAR APP COMO VISITANTE" onPress={() => { setNotice(''); setTab('Início'); setScreen('home'); }} /><Button title="Criar perfil local (opcional)" secondary onPress={() => { setNotice(''); setScreen('profileSetup'); }} /><Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5 }}>Entre agora sem cadastro. E-mail, senha e login online serão configurados depois.</Text></View>
  </ScrollView>; }
  function AuthScreen({ mode }: { mode: 'signup' | 'login' }) { const signup = mode === 'signup'; return <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 32, paddingBottom: 30 }} keyboardShouldPersistTaps="handled"><Header /><View style={{ marginBottom: 24 }}>{title(signup ? 'Crie sua conta' : 'Boas-vindas de volta')}<View style={{ marginTop: 8 }}>{caption(signup ? 'Comece sua jornada. Seu progresso começa com um passo.' : 'Entre para continuar sua evolução.')}</View></View>
    {signup && <Field label="Nome" placeholder="Como podemos chamar você?" value={name} onChangeText={setName} autoCapitalize="words" />}
    <Field label="E-mail" placeholder="voce@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <Field label="Senha" placeholder="Mínimo de 8 caracteres" value={password} onChangeText={setPassword} secureTextEntry autoComplete={signup ? 'new-password' : 'password'} />
    {signup && <Field label="Confirmar senha" placeholder="Digite a senha novamente" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />}
    {!signup && <Pressable onPress={() => setNotice('A recuperação por e-mail será ativada quando o backend de autenticação estiver configurado.')}><Text style={{ color: colors.green, textAlign: 'right', marginTop: -5, marginBottom: 18, fontWeight: '700' }}>Esqueci minha senha</Text></Pressable>}
    {signup && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} onPress={() => setAgreed(!agreed)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 }}><View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: agreed ? colors.green : colors.line, backgroundColor: agreed ? colors.green : colors.graphite, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.obsidian, fontWeight: '900' }}>{agreed ? '✓' : ''}</Text></View><Text style={{ color: colors.muted, flex: 1, lineHeight: 18 }}>Li e aceito os Termos de Uso e a Política de Privacidade.</Text></Pressable>}
    {notice ? <Notice>{notice}</Notice> : null}
    <Button title={signup ? 'CRIAR CONTA COM E-MAIL' : 'ENTRAR COM E-MAIL'} loading={busy} onPress={() => { if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 8 || (signup && (!name.trim() || !agreed || password !== confirmPassword))) { setNotice(signup ? 'Confira nome e e-mail, confirme uma senha com pelo menos 8 caracteres e aceite os termos.' : 'Informe um e-mail válido e senha com pelo menos 8 caracteres.'); return; } void auth('email'); }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginVertical: 20 }}><View style={{ height: 1, flex: 1, backgroundColor: colors.line }} /><Text style={{ color: colors.muted, fontSize: 11 }}>OU CONTINUE COM</Text><View style={{ height: 1, flex: 1, backgroundColor: colors.line }} /></View>
    <OAuthButtons /><Pressable onPress={() => { setNotice(''); setScreen(signup ? 'login' : 'signup'); }} style={{ padding: 20 }}><Text style={{ color: colors.muted, textAlign: 'center' }}>{signup ? 'Já tem conta? ' : 'Ainda não tem conta? '}<Text style={{ color: colors.green, fontWeight: '800' }}>{signup ? 'Entrar' : 'Criar conta'}</Text></Text></Pressable>
  </ScrollView>; }
  function ProfileSetup() { return <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 32 }}><Header /><View style={{ marginBottom: 24 }}>{title('Seu perfil de atleta')}<View style={{ marginTop: 8 }}>{caption('Crie um perfil local para a prévia. Sem e-mail ou senha; a foto é opcional.')}</View></View>
    <View style={{ alignItems: 'center', marginBottom: 25 }}><Pressable accessibilityRole="button" onPress={() => { if (Platform.OS === 'web') setPhotoOptions(!photoOptions); else Alert.alert('Foto de perfil', 'Escolha como adicionar sua foto.', [{ text: 'Câmera', onPress: () => void selectPhoto(true) }, { text: 'Galeria', onPress: () => void selectPhoto(false) }, { text: 'Cancelar', style: 'cancel' }]); }} style={{ width: 118, height: 118, borderRadius: 59, backgroundColor: colors.graphite, borderColor: colors.green, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{photo ? <Image source={{ uri: photo }} style={{ width: 118, height: 118 }} /> : <Text style={{ color: colors.green, fontSize: 34 }}>＋</Text>}</Pressable><Text style={{ color: colors.green, marginTop: 11, fontSize: 13, fontWeight: '700' }}>{photo ? 'Trocar foto' : 'Adicionar foto (opcional)'}</Text>{photoOptions && <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}><Button title="Galeria" secondary onPress={() => { setPhotoOptions(false); void selectPhoto(false); }} /><Button title="Câmera" secondary onPress={() => { setPhotoOptions(false); void selectPhoto(true); }} /></View>}</View>
    <Field label="Nome ou apelido" placeholder="Seu nome no app" value={name} onChangeText={setName} autoCapitalize="words" />
    <Label>NÍVEL ATUAL</Label><View style={{ flexDirection: 'row', gap: 8, marginBottom: 22 }}>{['Iniciante', 'Intermediário', 'Avançado'].map((x, i) => <View key={x} style={{ flex: 1, padding: 11, alignItems: 'center', borderRadius: 12, backgroundColor: i === 0 ? '#18321F' : colors.graphite, borderWidth: 1, borderColor: i === 0 ? colors.green : colors.line }}><Text style={{ color: i === 0 ? colors.green : colors.muted, fontSize: 11, fontWeight: '700' }}>{x}</Text></View>)}</View>
    {notice ? <Notice>{notice}</Notice> : null}<Button title="SALVAR PERFIL E ENTRAR" onPress={() => { setNotice(''); setTab('Início'); setScreen('home'); }} /><Text style={{ color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 14 }}>Perfil de demonstração nesta sessão. Conta online e sincronização serão ativadas depois.</Text>
  </ScrollView>; }

  function HomeContent() { return <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 18 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}><Wordmark /><Pressable onPress={() => setTab('Perfil')} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.gunmetal, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{photo ? <Image source={{ uri: photo }} style={{ width: 42, height: 42 }} /> : <Text style={{ color: colors.lime, fontWeight: '900' }}>{name ? name[0].toUpperCase() : 'A'}</Text>}</Pressable></View>
    <Text style={{ color: colors.green, fontWeight: '900', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>TREINO DE HOJE · DIA DE EVOLUIR</Text>{title(`Olá${name ? `, ${name.split(' ')[0]}` : ', atleta'}.`, 29)}<Text style={{ color: colors.muted, marginTop: 6, marginBottom: 20 }}>Pronto para superar seu último treino?</Text>
    <Card style={{ backgroundColor: '#132019', borderColor: '#31523C', marginBottom: 14 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Label>SEU NÍVEL</Label><Text style={{ color: colors.white, fontSize: 22, fontWeight: '900' }}>01 · Iniciante</Text><Text style={{ color: colors.lime, marginTop: 8, fontWeight: '700' }}>340 / 500 XP</Text></View><Text style={{ fontSize: 35 }}>⚡</Text></View><View style={{ height: 7, backgroundColor: colors.gunmetal, borderRadius: 6, marginTop: 17, overflow: 'hidden' }}><View style={{ width: '68%', height: 7, backgroundColor: colors.green, borderRadius: 6 }} /></View></Card>
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}><Card style={{ flex: 1 }}><Text style={{ fontSize: 20 }}>🔥</Text><Text style={{ color: colors.white, fontWeight: '900', fontSize: 23, marginTop: 6 }}>4 dias</Text><Text style={{ color: colors.muted, fontSize: 11 }}>SEQUÊNCIA</Text></Card><Card style={{ flex: 1 }}><Text style={{ fontSize: 20 }}>🎯</Text><Text style={{ color: colors.white, fontWeight: '900', fontSize: 23, marginTop: 6 }}>2 / 3</Text><Text style={{ color: colors.muted, fontSize: 11 }}>META SEMANAL</Text></Card></View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><Text style={{ color: colors.white, fontSize: 18, fontWeight: '900' }}>Treino de hoje</Text><Text style={{ color: colors.green, fontSize: 12 }}>25 min</Text></View>
    <Card style={{ marginBottom: 14 }}><Text style={{ color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }}>FORÇA · CORPO INTEIRO</Text><Text style={{ color: colors.white, fontSize: 20, fontWeight: '900', marginTop: 7 }}>Base & Controle</Text><Text style={{ color: colors.muted, fontSize: 13, marginTop: 5, marginBottom: 16 }}>4 exercícios · Iniciante</Text><Button title="COMEÇAR TREINO" onPress={() => setTab('Treinos')} /></Card>
    <Card><Text style={{ color: colors.white, fontWeight: '800', marginBottom: 6 }}>Prévia do aplicativo</Text><Text style={{ color: colors.muted, lineHeight: 19, fontSize: 12 }}>XP, sequência e treinos exibidos são conteúdo demonstrativo, salvo apenas nesta sessão.</Text></Card>
  </ScrollView>; }
  function OtherTab() { const heads: Record<Tab, [string, string]> = { 'Início': ['', ''], 'Treinos': ['Seus treinos', 'Planos de calistenia organizados para o seu nível.'], 'Biblioteca': ['Biblioteca', 'Explore movimentos e aprenda os fundamentos.'], 'Progresso': ['Sua evolução', 'Acompanhe sua consistência e conquistas.'], 'Perfil': ['Perfil do atleta', 'Seu espaço, do seu jeito.'] }; const [heading, sub] = heads[tab]; return <ScrollView contentContainerStyle={{ padding: 22 }}><View style={{ marginBottom: 24 }}><Wordmark /></View>{title(heading)}<View style={{ marginTop: 8, marginBottom: 20 }}>{caption(sub)}</View>{tab === 'Perfil' && <View style={{ alignItems: 'center', marginBottom: 18 }}><View style={{ width: 94, height: 94, borderRadius: 47, backgroundColor: colors.gunmetal, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{photo ? <Image source={{ uri: photo }} style={{ width: 94, height: 94 }} /> : <Text style={{ color: colors.lime, fontSize: 27, fontWeight: '900' }}>{name ? name[0].toUpperCase() : 'A'}</Text>}</View><Text style={{ color: colors.white, fontSize: 19, fontWeight: '800', marginTop: 10 }}>{name || 'Atleta'}</Text><Text style={{ color: colors.muted, marginTop: 4 }}>Nível 01 · Iniciante</Text></View>}
    <Card><Text style={{ color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 10 }}>{tab === 'Treinos' ? 'RECOMENDADO PARA VOCÊ' : tab.toUpperCase()}</Text><Text style={{ color: colors.white, fontSize: 19, fontWeight: '900' }}>{tab === 'Treinos' ? 'Fundamentos da calistenia' : tab === 'Biblioteca' ? 'Movimentos essenciais' : tab === 'Progresso' ? 'Sua jornada começa agora' : 'Seu perfil está pronto'}</Text><Text style={{ color: colors.muted, lineHeight: 20, marginTop: 8 }}>{tab === 'Progresso' ? 'Complete treinos para acompanhar seus dados aqui.' : tab === 'Perfil' ? 'Foto, nível e dados básicos do atleta.' : 'Mais conteúdo será adicionado nas próximas etapas do app.'}</Text>{tab === 'Perfil' && <Pressable onPress={() => { setScreen('profileSetup'); }} style={{ paddingTop: 18 }}><Text style={{ color: colors.green, fontWeight: '800' }}>Editar perfil ›</Text></Pressable>}</Card>
    {tab === 'Treinos' && <Card style={{ marginTop: 12 }}><Text style={{ color: colors.white, fontWeight: '800' }}>Base & Controle</Text><Text style={{ color: colors.muted, marginTop: 5 }}>Flexão · Agachamento · Prancha · Afundo</Text></Card>}
  </ScrollView>; }
  function Home() { return <View style={{ flex: 1 }}><View style={{ flex: 1 }}>{tab === 'Início' ? <HomeContent /> : <OtherTab />}</View><View style={{ flexDirection: 'row', backgroundColor: colors.graphite, borderTopWidth: 1, borderColor: colors.line, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 4 : 10, paddingHorizontal: 4 }}>{tabs.map((x, i) => <Pressable key={x} accessibilityRole="tab" accessibilityState={{ selected: x === tab }} onPress={() => setTab(x)} style={{ flex: 1, alignItems: 'center', gap: 5, paddingVertical: 5 }}><Text style={{ color: x === tab ? colors.green : colors.muted, fontSize: 15 }}>{['⌂', '↗', '▤', '◔', '●'][i]}</Text><Text style={{ color: x === tab ? colors.green : colors.muted, fontSize: 9, fontWeight: x === tab ? '800' : '500' }}>{x}</Text></Pressable>)}</View></View>; }

  return <SafeAreaProvider><SafeAreaView style={{ flex: 1, backgroundColor: colors.obsidian }}><StatusBar barStyle="light-content" /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{screen === 'welcome' ? Welcome() : screen === 'signup' || screen === 'login' ? AuthScreen({ mode: screen }) : screen === 'profileSetup' ? ProfileSetup() : Home()}</KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>;
}

export default function App() { return <AppContent />; }
