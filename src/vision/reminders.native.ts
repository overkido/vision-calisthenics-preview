import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Reminder } from './domain';
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});
export async function cancelReminder(id?: string) {
  if (id) await Notifications.cancelScheduledNotificationAsync(id);
}
export async function scheduleReminder(reminder: Reminder) {
  const channelId = reminder.daily ? 'hydration' : 'training';
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channelId, { name: reminder.daily ? 'Hidratação' : 'Treino', importance: Notifications.AndroidImportance.DEFAULT });
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Habilite notificações nas configurações do aparelho.');
  return Notifications.scheduleNotificationAsync({
    content: { title: 'VISION Calisthenics', body: reminder.daily ? 'Hora de beber água. Registre seu consumo no app.' : 'Seu treino está na agenda.', sound: 'default' },
    trigger: reminder.daily
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: reminder.hour, minute: reminder.minute, channelId }
      : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: reminder.day + 1, hour: reminder.hour, minute: reminder.minute, channelId },
  });
}
