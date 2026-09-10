import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import { getClassroomBgForDate } from './studyRoomClassroomBg';
import { WALK_BY_GENDER } from '../assets/timer_ani/frames';

const CHAIR_DESK = require('../assets/timer_ani/chair_desk.png');
const CLASSROOM_1 = require('../assets/timer_ani/classroom1.png');
const CLASSROOM_2 = require('../assets/timer_ani/classroom2.png');
const CLASSROOM_3 = require('../assets/timer_ani/classroom3.png');
const BOY_STUDY = require('../assets/timer_ani/boy_study.png');
const GIRL_STUDY = require('../assets/timer_ani/girl_study.png');

let preloadPromise = null;

function uniqueModules(mods) {
  return Array.from(new Set(mods.filter(Boolean)));
}

/**
 * 스터디룸 배경·빈 책상·착석·걷기 프레임 프리로드
 */
export function preloadStudyRoomAssets() {
  if (preloadPromise) return preloadPromise;

  const modules = uniqueModules([
    getClassroomBgForDate(),
    CLASSROOM_1,
    CLASSROOM_2,
    CLASSROOM_3,
    CHAIR_DESK,
    BOY_STUDY,
    GIRL_STUDY,
    ...Object.values(WALK_BY_GENDER.girl).flat(),
    ...Object.values(WALK_BY_GENDER.boy).flat(),
  ]);

  preloadPromise = (async () => {
    try {
      const assets = modules.map((m) => Asset.fromModule(m));
      await Asset.loadAsync(assets);
    } catch {
      // Asset 실패 시 Image.prefetch 폴백 (uri 있는 경우만)
      await Promise.all(
        modules.map(async (m) => {
          try {
            const asset = Asset.fromModule(m);
            if (asset.uri) await Image.prefetch(asset.uri);
          } catch {
            // noop
          }
        }),
      );
    }
  })();

  return preloadPromise;
}
