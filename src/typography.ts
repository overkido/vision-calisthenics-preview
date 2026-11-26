import { Platform } from 'react-native';

export const typeface = {
  regular: Platform.OS === 'web' ? 'VISIONMontserratRegular, Montserrat_400Regular, Arial, sans-serif' : 'Montserrat_400Regular',
  bold: Platform.OS === 'web' ? 'VISIONMontserratBold, Montserrat_700Bold, Arial, sans-serif' : 'Montserrat_700Bold',
} as const;
