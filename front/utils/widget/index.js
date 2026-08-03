export { WIDGET_APP_GROUP_ID, WIDGET_DEEP_LINKS, TIMETABLE_WIDGET_STALE_MS } from './constants.js';
export {
  flatTimetableToWeek,
  buildTimetableWidgetPayload,
  getKstWeekdayLabel,
} from './timetablePayload.js';
export { buildMealWidgetPayload } from './mealPayload.js';
export {
  writeMealPayload,
  writeTimetablePayload,
  writeSchoolId,
  writeAuthMirror,
  clearAuthMirror,
  readAuthMirror,
  reloadWidgets,
  syncMealWidgetFromNext,
  syncTimetableWidgetFromFlat,
  scheduleWidgetBackgroundRefresh,
  isWidgetBridgeAvailable,
} from './widgetBridge.js';
export {
  mirrorAuthTokensToWidget,
  syncAuthFromWidgetMirrorIfNewer,
} from './syncAuthFromWidget.js';
