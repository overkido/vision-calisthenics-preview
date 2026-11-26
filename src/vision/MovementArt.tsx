import { useState } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import type { Exercise } from './domain';
import { Caption, Options, stack, Tag } from './ui';

type Crop = { source: ImageSourcePropType; size: [number, number]; rect: [number, number, number, number] };
const originals: Record<string, ImageSourcePropType> = {
  pushup: require('../../assets/exercises/pushup.png'),
  squat: require('../../assets/exercises/squat.png'),
  'l-sit': require('../../assets/exercises/l-sit.webp'),
};

const sheet = require('../../assets/exercises/vision-exercise-reference.jpg');
const sheetCrops: Record<string, [number, number]> = {
  'diamond-pushup': [0,2], 'knee-pushup': [0,3], superman: [1,0], 'bird-dog': [1,3],
  'pike-pushup': [2,0], plank: [4,3], lunge: [5,1], bridge: [6,0], 'calf-raise': [7,0], 'mountain-climber': [8,1],
};
const sheetRows = [[141,63],[234,59],[321,60],[410,61],[495,63],[577,65],[664,64],[747,64],[831,63],[930,64]];
const sheetCols = [[189,224],[424,244],[680,238],[936,240]];

const galleryA = require('../../assets/exercises/training-a.webp');
const galleryACrops: Record<string, [number, number, number, number]> = {
  wall: [78,4,390,325],
  'prone-row': [530,128,433,188],
  deadbug: [1000,109,535,220],
  plank: [35,418,453,211],
  lunge: [603,340,310,294],
  bridge: [1017,405,469,219],
  'bird-dog': [0,726,536,245],
  pullup: [590,635,323,388],
  'pike-pushup': [1029,715,425,287],
};

const galleryB = require('../../assets/exercises/training-b.webp');
const galleryC = require('../../assets/exercises/training-c.webp');
const galleryBCrops: Record<string, Crop['rect']> = {
  dip: [118,3,282,327],
  'band-row': [559,45,400,281],
  hollow: [1035,89,491,210],
  'cat-cow': [65,367,350,262],
  'pistol-free': [599,342,330,302],
  'incline-pushup': [1082,339,376,295],
  'scapular-pushup': [35,714,419,240],
  chinup: [632,652,272,356],
  'scapular-pullup': [1154,657,257,357],
};
const galleryCCrops: Record<string, Crop['rect']> = {
  'dead-hang': [144,4,256,325],
  'negative-pullup': [627,1,280,326],
  'sit-to-stand': [1146,21,285,314],
  'split-squat': [111,342,313,308],
  'pistol-box': [610,344,322,315],
  'wall-sit': [1167,336,240,323],
  'side-plank': [37,733,445,228],
  'hanging-knee-raise': [628,661,278,327],
  'tuck-sit': [1123,667,302,342],
};
const galleries = [[galleryA,galleryACrops],[galleryB,galleryBCrops],[galleryC,galleryCCrops]] as const;

function getCrop(id: string): Crop | undefined {
  for (const [source,crops] of galleries) {
    const art = crops[id];
    if (art) return {source, size: [1536,1024], rect: art};
  }
  const cell = sheetCrops[id];
  if (!cell) return;
  const [row,col] = cell;
  const [x,w] = sheetCols[col];
  const [y,h] = sheetRows[row];
  return { source: sheet, size: [1536,1024], rect: [x,y,w,h] };
}

function CroppedArt({crop, label}: {crop: Crop; label:string}) {
  const [width, setWidth] = useState(0);
  const [x,y,w,h] = crop.rect;
  const scale = width / w;
  return <View accessibilityLabel={label} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', aspectRatio: w/h, overflow: 'hidden', borderRadius: 10 }}>
    {width > 0 && <Image source={crop.source} resizeMode="stretch" style={{ position: 'absolute', width: crop.size[0]*scale, height: crop.size[1]*scale, left: -x*scale, top: -y*scale }} />}
  </View>;
}

export function WorkoutArt({exercise}: {exercise: Exercise}) {
  const image = originals[exercise.id];
  const crop = getCrop(exercise.id);
  const label = 'Personagem VISION · ' + exercise.name;
  if (image) return <Image source={image} resizeMode="contain" accessibilityLabel={label} style={{width:'100%',height:180}} />;
  if (!crop) return <Caption>{exercise.steps[0]}</Caption>;
  const [, , width, height] = crop.rect;
  return <View style={{width:Math.min(260,180*width/height),maxWidth:'100%'}}><CroppedArt crop={crop} label={label}/></View>;
}

const phases = ['Inicial','Execução','Retorno'] as const;
export function MovementArt({exercise, compact = false}: {exercise: Exercise; compact?: boolean}) {
  const [phase, setPhase] = useState<typeof phases[number]>('Inicial');
  const original = originals[exercise.id];
  const crop = getCrop(exercise.id);
  const hasTwoPoses = crop?.source === sheet;
  const phaseCrop = crop && hasTwoPoses && !compact ? {
    ...crop,
    rect: [crop.rect[0] + (phase === 'Execução' ? crop.rect[2] / 2 : 0), crop.rect[1], crop.rect[2] / 2, crop.rect[3]] as Crop['rect'],
  } : crop;
  const label = 'Personagem VISION · ' + exercise.name;
  const step = exercise.steps[phases.indexOf(phase)];
  if (compact && !original && !crop) return null;
  return <View style={stack}>
    {original && <Image source={original} resizeMode="contain" accessibilityLabel={label} style={{ width: '100%', height: compact ? 100 : 220 }} />}
    {phaseCrop && <CroppedArt crop={phaseCrop} label={label} />}
    {!compact && <View style={{ gap: 5 }}>
      <Options label="FASES DO MOVIMENTO" options={phases} selected={[phase]} toggle={setPhase} />
      <Tag>{phase.toUpperCase()}</Tag>
      <Caption>{step}</Caption>
    </View>}
  </View>;
}
