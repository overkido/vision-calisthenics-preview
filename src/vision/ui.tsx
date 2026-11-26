import { typeface } from '../typography';
import type { ReactNode } from 'react';
import { Image, Pressable, Text, View, type TextStyle } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { colors as c } from '../theme';
import { Button, Card, Field, Label } from '../components/ui';

export const body = { color: c.muted, fontFamily: typeface.regular, fontSize: 15, lineHeight: 22 };
export const row = { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } as const;
export const stack = { gap: 14 } as const;
export const heading = { color: c.white, fontFamily: typeface.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.9 };
export const subheading = { color: c.white, fontFamily: typeface.bold, fontSize: 19, lineHeight: 24, letterSpacing: -0.35 };
export const Caption = ({ children, style }: { children: ReactNode; style?: TextStyle }) => <Text style={[body, style]}>{children}</Text>;
export const Title = ({ children }: { children: ReactNode }) => <Text accessibilityRole="header" style={heading}>{children}</Text>;
export const Subtitle = ({ children }: { children: ReactNode }) => <Text accessibilityRole="header" style={subheading}>{children}</Text>;
export const Tag = ({ children }: { children: ReactNode }) => <Text style={{ color: c.green, fontFamily: typeface.semibold, letterSpacing: 0.45, fontSize: 11 }}>{children}</Text>;

export function Options<T extends string | number>({ label, options, selected, toggle, display = String }: {
  label: string; options: readonly T[]; selected: readonly T[]; toggle: (option: T) => void; display?: (option: T) => string;
}) {
  return <View style={{ marginBottom: 16 }}>
    <Label>{label}</Label><View style={row}>{options.map(option => {
      const on = selected.includes(option);
      return <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => toggle(option)}
        style={{ borderWidth: 1, borderColor: on ? c.green : c.line, backgroundColor: on ? '#10372B' : c.graphite, borderRadius: 10, paddingHorizontal: 13, minHeight: 40, justifyContent: 'center' }}>
        <Caption style={{ color: on ? c.green : c.white }}>{display(option)}</Caption>
      </Pressable>;
    })}</View>
  </View>;
}

export function NumberField({ label, value, set, hint }: { label: string; value: string; set: (value: string) => void; hint?: string }) {
  return <Field label={label} keyboardType="decimal-pad" value={value} onChangeText={set} placeholder={hint} maxLength={8} />;
}

export function Chart({ values, label }: { values: number[]; label: string }) {
  if (!values.length) return <Caption>Adicione registros para acompanhar sua evolução.</Caption>;
  const min = Math.min(...values), span = Math.max(1, Math.max(...values) - min);
  const points = values.map((value, i) => [12 + 336 * i / Math.max(1, values.length - 1), 115 - (value - min) * 95 / span]);
  return <View accessibilityLabel={label}>
    <Svg width="100%" height={145} viewBox="0 0 360 145">
      {[20, 52, 84, 116].map(y => <Line key={y} x1="0" x2="360" y1={y} y2={y} stroke={c.line} />)}
      <Polyline points={points.map(point => point.join(',')).join(' ')} fill="none" stroke={c.green} strokeWidth="3" />
      {points.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={4} fill={c.green} />)}
    </Svg>
    <Caption>{label}</Caption>
  </View>;
}

export function Meter({ value, color = c.green }: { value: number; color?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
  return <View accessibilityRole="progressbar" accessibilityValue={{ now: percent, min: 0, max: 100 }}
    style={{ height: 7, backgroundColor: c.line, borderRadius: 6, overflow: 'hidden' }}>
    <View style={{ width: `${percent}%`, height: 7, backgroundColor: color }} />
  </View>;
}

export function Logo({ size = 280 }: { size?: number }) {
  return <Image source={require('../../assets/vision-approved.jpg')} accessibilityLabel="VISION Calisthenics" resizeMode="contain"
    style={{ width: '100%', height: size }} />;
}

export { Button, Card, Field };
