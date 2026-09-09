/** 타이머 교실 캐릭터 — 방향별 걷기 프레임 (require는 정적 경로여야 함) */
export const GIRL_WALK = {
  down: [
    require('./girl_down_1.png'),
    require('./girl_down_2.png'),
    require('./girl_down_3.png'),
    require('./girl_down_4.png'),
  ],
  up: [
    require('./girl_up_1.png'),
    require('./girl_up_2.png'),
    require('./girl_up_3.png'),
    require('./girl_up_4.png'),
  ],
  left: [
    require('./girl_left_1.png'),
    require('./girl_left_2.png'),
    require('./girl_left_3.png'),
    require('./girl_left_4.png'),
  ],
  right: [
    require('./girl_right_1.png'),
    require('./girl_right_2.png'),
    require('./girl_right_3.png'),
    require('./girl_right_4.png'),
  ],
};

/** 착석 시 전면 대기 포즈 (앉기 전용 스프라이트 없을 때) */
export const GIRL_IDLE_FRONT = GIRL_WALK.down[0];

export const WALK_FRAME_MS = 140;
