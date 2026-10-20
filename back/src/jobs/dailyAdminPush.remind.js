import { remindDailyAdminPushIfNeeded } from '../services/dailyAdminPush.service.js';

export async function runDailyAdminPushReminder() {
  try {
    const result = await remindDailyAdminPushIfNeeded();
    console.log(`[daily-admin-push] discord reminder ${result}`);
  } catch (error) {
    console.error('[daily-admin-push] discord reminder failed', error?.message || error);
  }
}
