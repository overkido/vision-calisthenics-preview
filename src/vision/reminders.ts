import type { Reminder } from './domain';
export async function cancelReminder(_id?: string) {}
export async function scheduleReminder(_reminder: Reminder): Promise<string | undefined> { return undefined; }
