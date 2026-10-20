/**
 * 주간 NEIS 자동 갱신은 하지 않는다.
 * 이번 학기에 저장된 시간표는 사용자가 다시 저장할 때만 바뀐다.
 * 앱 시작 시 시간표는 마이페이지의 hydrateTimetableFromServer가 불러온다.
 */
export default function AutoTimetableRefreshOnLaunch() {
  return null;
}
