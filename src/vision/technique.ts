import type { Exercise, Profile } from './domain';

const patterns: Record<string, [string[], string, string]> = {
  Empurrar: [['Peitoral', 'Tríceps', 'Deltoide anterior'], 'Inspire ao descer. Solte o ar ao empurrar.', 'Evite deixar o quadril cair ou abrir os cotovelos bruscamente.'],
  Puxar: [['Costas', 'Bíceps'], 'Solte o ar ao puxar e inspire no retorno.', 'Evite balançar o tronco ou encolher os ombros.'],
  Pernas: [['Quadríceps', 'Glúteos'], 'Inspire ao descer. Solte o ar ao subir.', 'Evite tirar os calcanhares do chão ou deixar os joelhos fecharem para dentro.'],
  Cardio: [['Abdômen', 'Flexores do quadril', 'Ombros'], 'Mantenha a respiração fluida enquanto alterna as pernas.', 'Evite quicar o quadril ou deixar os ombros recuarem das mãos.'],
  Mobilidade: [['Coluna torácica', 'Coluna lombar'], 'Inspire ao abrir o peito e expire ao arredondar a coluna.', 'Evite concentrar todo o movimento no pescoço.'],
  Core: [['Abdômen', 'Estabilizadores do tronco'], 'Expire no esforço e inspire no retorno.', 'Evite compensar arqueando a lombar.'],
};
const details: Record<string, [string[], string]> = {
  superman: [['Extensores da coluna', 'Glúteos'], 'Evite levantar demais o queixo ou usar impulso.'],
  bridge: [['Glúteos', 'Posteriores da coxa'], 'Evite subir à custa de arquear a lombar.'],
  'calf-raise': [['Panturrilhas'], 'Evite usar impulso ou girar os tornozelos.'],
  'pike-pushup': [['Deltoides', 'Tríceps'], 'Evite baixar o quadril ao flexionar os braços.'],
  'scapular-pushup': [['Serrátil anterior', 'Estabilizadores da escápula'], 'Mantenha os cotovelos estendidos durante todo o movimento.'],
  'side-plank': [['Oblíquos', 'Glúteo médio'], 'Evite deixar o quadril afundar ou girar.'],
  'bird-dog': [['Estabilizadores do tronco', 'Glúteos'], 'Evite girar o quadril ao estender braço e perna.'],
  'dead-hang': [['Antebraços', 'Estabilizadores dos ombros'], 'Evite saltar para sair da barra ou usar embalo.'],
};
export function technique(exercise: Exercise) {
  const [muscles, breath, error] = patterns[exercise.group] ?? patterns.Core;
  const custom = details[exercise.id];
  return { muscles: custom?.[0] ?? muscles, breath: exercise.id === 'superman' ? 'Expire ao elevar os apoios e inspire ao voltar.' : exercise.timed ? 'Respire de forma contínua durante a sustentação.' : breath, error: custom?.[1] ?? error };
}
export function availableAtHome(exercise: Exercise, profile: Profile) {
  return (!exercise.gear || profile.equipment.includes(exercise.gear)) && !exercise.avoid.some(limit => profile.limits.includes(limit));
}
