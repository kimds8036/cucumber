import * as Haptics from 'expo-haptics';

/** 롱프레스 메뉴 오픈 시 햅틱 (다른 화면에서 재사용 가능) */
export async function messageMenuOpenHaptics() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {
    console.log('[Haptics] 진동 실패:', e);
  }
}
