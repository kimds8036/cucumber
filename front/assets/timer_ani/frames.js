/** 타이머 캐릭터 — 방향별 걷기 프레임 (require는 정적 경로여야 함) */

export const GIRL_WALK = {
  down: [
    require('./girl_down_1.png'),
    require('./girl_down_2.png'),
    require('./girl_down_3.png'),
    require('./girl_down_4.png'),
  ],
  up: [require('./girl_up_1.png'), require('./girl_up_2.png')],
  left: [
    require('./girl_left_1.png'),
    require('./girl_left_2.png'),
    require('./girl_left_3.png'),
  ],
  right: [
    require('./girl_right_1.png'),
    require('./girl_right_2.png'),
    require('./girl_right_3.png'),
  ],
};

export const BOY_WALK = {
  down: [require('./boy_down_1.png'), require('./boy_down_2.png')],
  up: [require('./boy_up_1.png'), require('./boy_up_2.png')],
  left: [
    require('./boy_left_1.png'),
    require('./boy_left_2.png'),
    require('./boy_left_3.png'),
  ],
  right: [
    require('./boy_right_1.png'),
    require('./boy_right_2.png'),
    require('./boy_right_3.png'),
  ],
};

/** @typedef {'girl' | 'boy'} TimerAniGender */

export const WALK_BY_GENDER = {
  girl: GIRL_WALK,
  boy: BOY_WALK,
};

/** 착석·공부 포즈 (책걸상 포함) */
export const GIRL_STUDY = require('./girl_study.png');
export const BOY_STUDY = require('./boy_study.png');

export const STUDY_BY_GENDER = {
  girl: GIRL_STUDY,
  boy: BOY_STUDY,
};

/** 착석 시 전면 대기 포즈 (앉기 전용 스프라이트 없을 때 폴백) */
export const GIRL_IDLE_FRONT = GIRL_WALK.down[0];
export const BOY_IDLE_FRONT = BOY_WALK.down[0];

export const WALK_FRAME_MS = 80;
