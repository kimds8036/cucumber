/** App Group / SharedPreferences 식별자 */
export const WIDGET_APP_GROUP_ID = 'group.com.ucost.YouthPaper';

/** 시간표 위젯 stale 안내 — 앱 AsyncStorage TTL과 동일 */
export const TIMETABLE_WIDGET_STALE_MS = 24 * 60 * 60 * 1000;

export const TIMETABLE_DAY_LABELS = ['월', '화', '수', '목', '금'];

/** 위젯 탭 딥링크 */
export const WIDGET_DEEP_LINKS = {
  meal: 'youthpaper://school',
  timetable: 'youthpaper://mypage',
  timetableEmpty: 'youthpaper://mypage',
};
