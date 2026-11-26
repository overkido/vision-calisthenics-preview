import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop, Text } from 'react-native-svg';
import type { Exercise } from './domain';

type Point = [number, number];
type Pose = [head: Point, shoulder: Point, hip: Point, elbow: Point, hand: Point, knee: Point, foot: Point];
const poses: Record<string, Pose> = {
  stand: [[59,25],[59,46],[59,92],[63,69],[62,87],[59,118],[62,143]],
  seated: [[63,47],[60,64],[55,100],[67,81],[77,93],[89,101],[92,142]],
  squat: [[72,52],[67,67],[48,101],[84,76],[108,76],[78,104],[67,143]],
  split: [[69,46],[68,65],[64,99],[72,81],[77,92],[91,100],[93,143]],
  lunge: [[76,63],[75,83],[72,116],[78,99],[87,111],[98,114],[105,143]],
  pistol: [[66,58],[62,75],[48,104],[78,81],[101,78],[73,101],[66,143]],
  high: [[88,82],[76,95],[47,111],[79,118],[83,141],[31,126],[13,142]],
  low: [[93,112],[80,119],[46,126],[67,111],[83,141],[28,134],[13,142]],
  wall: [[76,37],[67,54],[48,95],[83,62],[103,63],[38,119],[29,143]],
  wallLow: [[89,36],[81,51],[57,93],[75,73],[103,63],[44,120],[34,143]],
  incline: [[83,50],[73,64],[50,94],[85,82],[98,106],[34,120],[22,143]],
  inclineLow: [[96,77],[84,87],[56,103],[76,85],[98,106],[37,125],[22,143]],
  knee: [[89,87],[76,100],[49,116],[80,122],[83,141],[31,142],[13,133]],
  kneeLow: [[92,116],[78,125],[46,131],[65,115],[83,141],[29,142],[13,133]],
  wallSit: [[94,57],[94,75],[94,112],[83,94],[77,107],[62,110],[64,143]],
  wallStart: [[94,25],[94,46],[94,92],[84,65],[80,84],[80,117],[73,143]],
  scapDown: [[89,91],[76,104],[47,111],[79,121],[83,141],[31,126],[13,142]],
  hollow: [[24,114],[39,128],[61,139],[28,114],[11,106],[86,128],[109,118]],
  pike: [[77,81],[66,92],[44,70],[76,114],[87,143],[31,111],[14,143]],
  pikeLow: [[82,118],[72,114],[43,73],[62,128],[87,143],[31,111],[14,143]],
  hang: [[61,57],[60,73],[60,107],[65,45],[68,19],[64,127],[66,143]],
  pull: [[63,16],[59,35],[56,81],[45,49],[68,19],[58,113],[62,133]],
  scap: [[61,48],[59,64],[58,100],[65,41],[68,19],[63,124],[65,142]],
  row: [[35,64],[40,78],[62,105],[60,55],[72,39],[81,124],[106,142]],
  rowHigh: [[53,42],[61,56],[71,89],[48,64],[72,39],[87,119],[106,142]],
  dip: [[60,23],[62,42],[59,80],[66,65],[68,88],[65,114],[67,135]],
  dipLow: [[68,54],[66,69],[61,108],[51,81],[68,88],[64,127],[69,142]],
  plank: [[91,109],[77,118],[48,123],[78,142],[101,142],[29,131],[12,142]],
  side: [[89,99],[76,109],[48,122],[77,141],[99,141],[27,133],[12,142]],
  prone: [[94,121],[81,129],[50,137],[96,126],[111,124],[29,140],[9,142]],
  pronePull: [[94,115],[80,126],[48,137],[65,123],[81,119],[28,140],[9,142]],
  supine: [[21,139],[34,132],[62,139],[43,125],[55,127],[83,111],[104,143]],
  bridge: [[21,139],[34,132],[66,107],[52,138],[68,143],[87,111],[104,143]],
  dead: [[18,138],[31,134],[61,139],[31,104],[32,82],[63,108],[89,108]],
  deadLong: [[18,138],[31,134],[61,139],[20,122],[8,112],[88,126],[109,126]],
  tuck: [[49,52],[48,68],[51,102],[47,91],[46,113],[76,87],[67,111]],
  lsit: [[49,52],[48,68],[51,102],[47,91],[46,113],[81,102],[108,102]],
  kneeRaise: [[61,57],[60,73],[59,107],[65,45],[68,19],[81,90],[78,114]],
  dog: [[95,88],[80,98],[47,98],[83,120],[88,142],[31,142],[12,142]],
  dogLong: [[95,86],[80,98],[47,98],[96,98],[112,97],[27,98],[9,99]],
  calf: [[59,19],[59,40],[59,86],[63,63],[62,81],[59,113],[66,139]],
};
const sequences: Record<string, [string, string, string?]> = {
  wall:['wall','wallLow','wall'], pushup:['high','low'], dip:['dip','dipLow','rails'],
  'prone-row':['prone','pronePull'], 'band-row':['row','rowHigh','band'], pullup:['hang','pull','bar'],
  squat:['stand','squat'], lunge:['split','lunge'], bridge:['supine','bridge'], plank:['plank','plank'],
  deadbug:['dead','deadLong'], hollow:['hollow','hollow'], 'incline-pushup':['incline','inclineLow','bench'],
  'knee-pushup':['knee','kneeLow'], 'diamond-pushup':['high','low'], 'pike-pushup':['pike','pikeLow'],
  'scapular-pushup':['high','scapDown'], chinup:['hang','pull','bar'], 'scapular-pullup':['hang','scap','bar'],
  'dead-hang':['hang','hang','bar'], 'ring-row':['row','rowHigh','rings'], 'negative-pullup':['pull','hang','bar'],
  'sit-to-stand':['seated','stand','seat'], 'split-squat':['split','lunge'], 'pistol-box':['stand','pistol','seat'],
  'calf-raise':['stand','calf'], 'wall-sit':['wallStart','wallSit','wall'], 'side-plank':['side','side'],
  'bird-dog':['dog','dogLong'], 'hanging-knee-raise':['hang','kneeRaise','bar'], 'tuck-sit':['tuck','tuck','lowRails'], 'l-sit':['tuck','lsit','lowRails'],
};
const equipment: Record<string,string> = {
  wall:'M104 20V146', bar:'M18 19h83', rails:'M39 88h56m-47 0v57m38-57v57',
  lowRails:'M31 114h37m-28 0v31m20-31v31', bench:'M91 107h29m-19 0v38', seat:'M29 108h45m-35 0v37m27-37v37',
  rings:'M72 10v24m-5 6a5 5 0 1 0 10 0 5 5 0 1 0-10 0', band:'M72 39l42 85',
};

function figure(pose: Pose, gear?: string) {
  const [head, shoulder, hip, elbow, hand, knee, foot] = pose;
  const line = (points: Point[]) => 'M' + points.map(point => point.join(' ')).join('L');
  const [sx,sy]=shoulder, [hx,hy]=hip;
  return <G>
    <Path d="M8 146h105" stroke="#41505B" strokeWidth={1} />
    <Ellipse cx={61} cy={147} rx={47} ry={4} fill="#050B0B" />
    {!!gear && <Path d={equipment[gear]} stroke="#00E676" opacity={.68} strokeWidth={2.5} fill="none" strokeLinecap="round" />}
    <Path d={line([hip,knee,foot])} fill="none" stroke="#637989" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
    <Path d={line([shoulder,elbow,hand])} fill="none" stroke="#A9BFCD" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    <Path d={`M${sx-7} ${sy-4}Q${sx+3} ${sy-10} ${sx+10} ${sy+4}L${hx+6} ${hy+4}Q${hx} ${hy+9} ${hx-7} ${hy+2}Z`} fill="url(#athlete)" stroke="#10151C" strokeWidth={1} />
    <Circle cx={head[0]} cy={head[1]} r={9} fill="url(#athlete)" stroke="#C2D4DF" strokeWidth={.7} />
    <Circle cx={hand[0]} cy={hand[1]} r={3.5} fill="#DCEDF4" />
    <Path d={line([foot,[foot[0]+6,foot[1]+1]])} stroke="#CBDDE6" strokeWidth={4} strokeLinecap="round" />
  </G>;
}

export function MovementArt({exercise, compact = false}: {exercise: Exercise; compact?: boolean}) {
  const sequence = sequences[exercise.id];
  if (!sequence) return null;
  const [start,end,gear]=sequence, hold=start===end;
  return <Svg width="100%" height={compact ? 105 : 202} viewBox={hold ? '0 0 120 172' : '0 0 255 172'} accessibilityLabel={exercise.name + (hold ? ', posição de sustentação' : ', posição inicial e final')}>
    <Defs><LinearGradient id="athlete" x1="0%" x2="100%" y1="0%" y2="100%"><Stop offset="0" stopColor="#E9F5FA" /><Stop offset="1" stopColor="#557582" /></LinearGradient></Defs>
    {figure(poses[start],gear)}
    <Text x={60} y={166} textAnchor="middle" fontSize={11} fill="#92F9C1">{hold ? 'SUSTENTAÇÃO' : 'INÍCIO'}</Text>
    {!hold && <><Path d="M118 85h18m-5-5 5 5-5 5" fill="none" stroke="#00E676" strokeWidth={2} />
      <G x={135}>{figure(poses[end],gear)}<Text x={60} y={166} textAnchor="middle" fontSize={11} fill="#92F9C1">EXECUÇÃO</Text></G></>}
  </Svg>;
}
