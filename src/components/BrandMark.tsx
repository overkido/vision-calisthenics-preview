import { typeface } from '../typography';
import React from 'react';
import { Image, View, Text } from 'react-native';
import { colors } from '../theme';

export function BrandMark({ size = 56 }: { size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size * 0.24, overflow: 'hidden', backgroundColor: colors.graphite }}>
    <Image accessibilityLabel="Logo Vision Calisthenics" source={require('../../assets/icon.png')} resizeMode="cover" style={{ width: size, height: size }} />
  </View>;
}

export function Wordmark() {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <BrandMark size={48} />
    <View><Text style={{ color: colors.white, fontSize: 18, fontFamily: typeface.bold, letterSpacing: 2 }}>VISION</Text><Text style={{ color: colors.green, fontSize: 9, fontFamily: typeface.bold, letterSpacing: 2.2, marginTop: 2 }}>CALISTHENICS</Text></View>
  </View>;
}
