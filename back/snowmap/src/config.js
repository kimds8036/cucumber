/**
 * 모든 튜닝 상수. 매직 넘버는 여기만.
 * 주석: 값을 올리면/바꾸면 화면에 생기는 변화를 한 줄로 적음.
 */

export const CONFIG = {
  // --- 렌더러 / 색 ---
  /** AgX 노출. 올리면 전체가 밝아지고, 너무 높으면 하얗게 뜸 */
  TONE_MAPPING_EXPOSURE: 1.0,

  // --- 품질 프리셋 ---
  QUALITY: {
    high: {
      /** 기기 픽셀비 상한. 올리면 선명해지지만 GPU 부하↑ */
      dprMax: 2,
      shadows: true,
      /** 그림자 맵 한 변. 올리면 그림자 경계가 부드러워지고 VRAM↑ */
      shadowMapSize: 2048,
      exposure: 1.0,
    },
    low: {
      dprMax: 1.25,
      shadows: false,
      shadowMapSize: 512,
      exposure: 1.0,
    },
  },

  // --- 루프 ---
  /** 고정 물리/이동 스텝(초). 작을수록 충돌이 촘촘하지만 CPU↑ */
  FIXED_DT: 1 / 60,
  /** 한 프레임에 허용할 최대 고정 스텝 수. 올리면 랙 뒤 따라잡기↑, 스파이크↑ */
  MAX_FRAME_STEPS: 3,

  // --- 에셋 경로 ---
  MAP_URL: "snowmap_1.glb",
  /** Phase 2 미리보기 카메라. 올리면 맵을 더 멀리서 봄 */
  MAP_PREVIEW_DISTANCE: 28,
  MAP_PREVIEW_HEIGHT: 16,
  MAP_PREVIEW_LOOKAT: Object.freeze({ x: -2, y: 1.2, z: 4 }),
  /** 충돌 디버그 색 (카테고리별) */
  COLLIDER_DEBUG_COLORS: Object.freeze({
    wall: 0xff4444,
    floor: 0x44aa44,
    stair: 0x44dd88,
    furniture: 0xffaa33,
    door: 0x4488ff,
  }),
  /** 벽으로 쓸 AABB 최소 높이. 낮추면 납작한 장식도 벽이 됨 */
  COLLIDER_MIN_WALL_HEIGHT: 0.28,
  /** XZ가 이보다 넓고 납작하면 지붕/바닥형으로 버리고 솔리드 벽에서 제외 */
  COLLIDER_MAX_FLAT_AREA: 0.8,
  /** 연못 돌 링을 몇 조각으로 나눌지. 올리면 더 정밀·솔리드 수↑ */
  POND_STONE_RING_SECTORS: 16,
  /** 연못 중심에서 이 거리보다 가까운 조각은 버림(물 위 채움 방지) */
  POND_STONE_MIN_RADIUS: 0.75,
  /** 울타리 길이 방향 분할 수. 올리면 더 세밀 */
  FENCE_SEGMENTS: 14,
  /** 울타리 조각 반경(두께). 올리면 막히는 폭↑ */
  FENCE_SEGMENT_HALF: 0.05,
  /** 울타리 충돌 최소 높이 */
  FENCE_WALL_HEIGHT: 0.9,
  /** 세밀 충돌: 메시 표면이 실제로 있는 바닥 칸만 막는다(회전된 물체·둥근 바위·나무 아래 빈 곳) */
  COLLIDER_REFINE: true,
  /** 세밀 충돌 칸 크기(m). 줄이면 더 정확·솔리드 수↑ */
  COLLIDER_REFINE_CELL: 0.2,
  /** 메시 바닥에서 이 높이까지의 표면만 막음. 머리 위로 뻗은 가지·지붕 끝은 통과 */
  COLLIDER_REFINE_BAND: 0.9,
  /** 발자국 면적이 이보다 작은 메시는 통짜 상자 그대로 */
  COLLIDER_REFINE_MIN_AREA: 0.3,
  /** 세밀 결과가 통짜 상자의 이 비율 이상을 채우면 통짜 상자 하나로 둠 */
  COLLIDER_REFINE_KEEP_RATIO: 0.85,
  /**
   * 이름별 충돌 모양 지정. [정규식, "box"|"refine"|"none"] — 위에서부터 먼저 맞는 것 적용.
   * Blender에서 col_ 로 시작하는 메시를 만들면 보이지 않는 충돌 전용 상자로 쓰인다.
   */
  COLLIDER_SHAPE_OVERRIDES: Object.freeze([
    ["^cabin-wall", "box"],
  ]),
  /** 계단 옆 가드레일 두께. 올리면 옆 낙하 방지↑·통로↓ */
  STAIR_RAIL_THICKNESS: 0.16,
  /** 계단 가드레일 높이 */
  STAIR_RAIL_HEIGHT: 1.0,
  /** 계단 끝에서 언덕 쪽으로 옆 레일만 얼마나 연장할지 (출구는 막지 않음) */
  STAIR_RAIL_TOP_EXTEND: 0.35,
  CHAR: {
    boy: {
      stay: "CHA/boy/boy stay.fbx",
      walk: "CHA/boy/boy walk.fbx",
      run: "CHA/boy/boy Run.fbx",
      sit: "CHA/boy/boy sit.fbx", // 앉기: 거꾸로 재생
      sitHi: "CHA/boy/boy sit hi.fbx", // 앉은 채 인사
      lay: "CHA/boy/boy lay.fbx", // 침대 눕기
    },
    girl: {
      stay: "CHA/GIRL/girl stay.fbx",
      walk: "CHA/GIRL/girl walk.fbx",
      run: "CHA/GIRL/girl run.fbx",
      sit: "CHA/GIRL/girl sit.fbx", // 앉기: 거꾸로 재생
      sitHi: "CHA/GIRL/girl sit hi.fbx",
      lay: "CHA/GIRL/girl lay.fbx",
    },
  },

  /**
   * 애니 규칙 (Phase 5 상태머신에서 사용)
   * - stay: 대기 중 루프 유지 (클립 앞 팔벌림이라 간격 재생하면 발작처럼 보임)
   * - sit: timeScale < 0 (거꾸로) 로 의자에 앉기 / 정방향 = 일어서기
   * - sitHi: 앉아 있을 때 새 유저 입장 인사
   * - lay: 정방향 = 침대 눕기 / 역재생 = 일어서기 (sit으로 일어나면 대각선)
   * - walk / run: 이동
   */
  /** true면 stay 루프, false면 IDLE_STAY_INTERVAL_SEC마다 1회 */
  STAY_LOOP: true,
  /** STAY_LOOP=false일 때만 사용. 줄이면 더 자주 몸짓 */
  IDLE_STAY_INTERVAL_SEC: 5,
  /** 앉기(역재생) 배율. 절댓값↑이면 더 빨리 앉음 (음수=역방향) */
  SIT_DOWN_TIMESCALE: -1.85,
  /** 의자에서 일어서기 배율. 올리면 더 빨리 일어남 */
  STAND_UP_TIMESCALE: 3.4,
  /** 침대 눕기 배율. 올리면 더 빨리 누움 */
  LAY_DOWN_TIMESCALE: 1.7,
  /** 침대에서 일어서기 배율. 올리면 더 빨리 일어남 */
  LAY_STAND_TIMESCALE: 3.2,
  /** @deprecated STAND_UP / SIT_DOWN 로 분리됨. 호환용 */
  SIT_REVERSE_TIMESCALE: -1.85,

  // --- 캐릭터 머티리얼 / 키 라이트 (Phase 3) ---
  /** 목표 키 높이(발→머리뼈). 올리면 캐릭터가 커짐. 0.68이면 침대에 두 명이 나란히 누울 폭 */
  CHARACTER_HEIGHT: 0.6,
  /** 스폰 XZ. 맵 수정 후 안 맞으면 여기만 조정 */
  SPAWN: Object.freeze({ x: -8.284, z: 8.305 }),
  /**
   * 텍스처 본래 색이 조명과 상관없이 비치는 정도(emissiveMap = 텍스처). 올리면 피부가 텍스처 색에 가까워지고,
   * 너무 높으면 그림자가 사라져 납작·하얗게 보임. 0.3~0.5 권장
   */
  CHARACTER_EMISSIVE_INTENSITY: 0.42,
  /** Skin/Face 틴트. 채도↑면 살구색이 진해짐 */
  CHARACTER_SKIN_TINT: 0xf2c4a0,
  /** 키 라이트 세기. 올리면 캐릭터 대비↑ (월드 고정 Directional만) */
  CHARACTER_KEY_INTENSITY: 0.9,
  /** 키 라이트 방향 오프셋(target + offset = light.pos). 바꾸면 빛 방향이 바뀜 */
  CHARACTER_KEY_OFFSET: Object.freeze({ x: 6, y: 10, z: 4 }),
  GENDER_STORAGE_KEY: "studyroom_gender",

  // --- 이동 / 충돌 (Phase 4) ---
  /** 걷기 속도(m/s). 올리면 더 빨리 달림 */
  WALK_SPEED: 2.2,
  /** 뛰기 속도(m/s). 올리면 스프린트↑ */
  RUN_SPEED: 3.7,
  /** 캡슐 반지름. 올리면 벽에 더 일찍 막힘 */
  CAPSULE_RADIUS: 0.15,
  /** 캡슐 높이. 올리면 머리 쪽 돌출물과 더 잘 충돌 */
  CAPSULE_HEIGHT: 0.6,
  /** 벽과의 여유. 올리면 벽에 덜 붙고 틈이 커 보임 */
  COLLISION_SKIN: 0.03,
  /** 서브스텝 최대 이동 거리. 줄이면 터널링↓·CPU↑ */
  MOVE_SUBSTEP: 0.08,
  /** 자동으로 오를 수 있는 턱 높이. 올리면 높은 턱도 넘어감 (계단→언덕 연결 포함) */
  STEP_HEIGHT: 0.65,
  /** 이보다 많이 내려가면 낙하/리스폰 */
  FALL_Y: -1.5,
  /** 걸을 수 있는 최대 바닥 높이. 올리면 높은 지붕도 탐 */
  MAX_WALK_Y: 2.95,
  /** 바닥 법선 Y 최소. 낮추면 경사면도 바닥으로 인정 */
  MIN_FLOOR_NORMAL: 0.48,
  /** 한 스텝에서 내려갈 수 있는 최대 낙차 */
  STEP_DOWN: 0.9,
  /** 탈진(depenetration) 반복. 올리면 끼임 탈출↑·CPU↑ */
  DEPENETRATE_ITERS: 5,
  /** 충돌 공간해시 셀 크기. 줄이면 쿼리 정밀↑ */
  COLLIDER_QUERY_CELL: 2.5,
  /** 회전 반응 속도. 올리면 더 빨리 도는 쪽으로 맞춤 */
  TURN_RESPONSIVENESS: 12,
  /** 디버그 토글 키 */
  DEBUG_COLLIDER_KEY: "F2",

  // --- 상호작용 / 조명 UI (Phase 6) ---
  /** 좌석 아웃라인 월드 두께. 올리면 테두리가 더 굵어짐 */
  OUTLINE_THICKNESS: 0.028,
  /** 좌석 아웃라인 색 */
  OUTLINE_COLOR: 0xffe08a,
  /** 문 열리는 각도(라디안). 올리면 더 많이 열림. 문짝만 돌리므로 벽 두께를 넘지 않게 */
  DOOR_OPEN_ANGLE: Math.PI * 0.55,
  /** 문 여는 방향. -1이면 닫힌 각도에서 빼고, 1이면 더함 */
  DOOR_OPEN_SIGN: -1,
  /** 문짝이 닫힌 각도에서 이만큼(라디안) 이상 열리면 충돌을 끔. 줄이면 조금만 열어도 통과 */
  DOOR_BLOCK_MAX_ANGLE: 0.35,
  /** 출입구 벽(cabin-door*) 범위를 이만큼 넓혀 그 안의 벽 조각을 통과 가능하게 함 */
  DOORWAY_CLEAR_MARGIN: 0.02,
  /** 문 여닫이 속도. 올리면 더 빨리 움직임 */
  DOOR_ANIM_SPEED: 10,
  /** 문 상호작용 거리 */
  DOOR_INTERACT_RANGE: 1.55,
  /** 앉는 면보다 골반을 얼마나 띄울지. 올리면 의자 위에 더 높이 앉음 */
  SEAT_HIP_CLEARANCE: 0.03,
  /** 매트리스보다 몸을 얼마나 띄울지. 올리면 침대 위에 더 떠서 누움 */
  BED_BODY_CLEARANCE: 0.1,
  /** 누운 몸을 침대 발치 쪽으로 미는 거리(m). 올리면 머리가 침대 헤드에서 더 멀어짐 */
  BED_FOOT_SHIFT: 0.25,
  /** 좌석 앞 접근 지점 거리. 올리면 더 앞에서 앉기 시작 */
  SEAT_APPROACH_DISTANCE: 0.3,
  /** 접근 지점까지 정렬하는 시간(초). 줄이면 더 빨리 방향을 맞춤 */
  SEAT_ALIGN_TIME: 0.2,
  /** 벤치 좌석 수. 긴 방향을 이 개수로 나눔 */
  BENCH_SLOTS: 2,
  /** 벤치 슬롯이 긴 축의 몇 배에 걸쳐 있는지. 0.5면 양끝이 길이의 1/4 안쪽 */
  BENCH_SLOT_SPREAD: 0.5,
  /** 침대 슬롯 수 (짧은 축, 나란히 눕기) */
  BED_SLOTS: 2,
  /** 침대 슬롯이 중심에서 짧은 축의 몇 배만큼 떨어지는지. 0.25면 폭의 1/4 */
  BED_SLOT_SIDE_FACTOR: 0.25,
  /** 의자/벤치 상호작용 거리(좌석 앞 지점 기준). 올리면 더 멀리서 앉기 가능 */
  SEAT_INTERACT_RANGE: 0.55,
  /** 언덕섬(좌석 높이가 HILL_SEAT_MIN_Y 이상) 상호작용 거리 */
  SEAT_INTERACT_RANGE_HILL: 1.0,
  /** 이 높이 이상의 좌석은 언덕섬으로 봄 (본섬 좌석 ≈ 2.0, 언덕섬 ≈ 2.6) */
  HILL_SEAT_MIN_Y: 2.35,
  /**
   * 언덕섬 책상 이름. 이 책상과 붙은 의자는 한 덩어리로 막혀서 의자 쪽(섬 가장자리)으로 못 간다.
   * 앉을 때만 책상을 넘어가 앉고, 일어나면 책상 앞(의자 반대편)에 선다.
   */
  DESK_PATTERN: "sideTable",
  /** 책상 상자에서 이 거리 안의 의자를 그 책상 의자로 묶음 */
  DESK_CHAIR_LINK_DIST: 0.4,
  /** 책상+의자 막힘 상자를 이만큼 넓힘 */
  DESK_BLOCK_PAD: 0.05,
  /** 일어설 때 책상 앞 가장자리에서 이만큼 떨어진 곳에 섬 */
  DESK_EXIT_MARGIN: 0.32,
  /** 책상 앞에서 이 거리 안이면 앉기 가능 */
  DESK_INTERACT_RANGE: 0.9,
  /** 책상 넘어 의자로 가는 시간(초) */
  DESK_HOP_TIME: 0.55,
  /** 책상 넘을 때 책상 윗면보다 이만큼 더 높이 뜸 */
  DESK_HOP_CLEARANCE: 0.06,
  /** 침대 위로 올라서는 시간(초). 늘리면 천천히 올라감 */
  BED_MOUNT_TIME: 0.28,
  /** 침대에서 내려오는 시간(초) */
  BED_DISMOUNT_TIME: 0.28,
  /** true면 의자 솔리드를 만들지 않아 의자 사이로 지나갈 수 있음 */
  CHAIR_PASSABLE: true,
  /** 일어서기 모션이 이 비율에 도달하면 조작을 풀어 줌. 1이면 클립 끝까지 대기 */
  RISE_RELEASE_AT: 0.8,
  /** 일어선 직후 걷기/대기로 넘기는 크로스페이드(초). 줄이면 더 빨리 걷기 시작 */
  RISE_FADE_TO_LOCOMOTION: 0.12,
  /** 좌석 앵커 디버그 토글 */
  DEBUG_SEAT_KEY: "F3",
  /** 문짝 이름. door* 만 (cabin-door 제외) — 문짝 원점(경첩)을 회전 */
  DOOR_NAME_RE: "^door",
  /** 램프 PointLight 세기 (desk/lamp) */
  LAMP_POINT_INTENSITY: 1.6,
  /** 가로등 PointLight 세기. 올리면 켜졌을 때 바닥이 더 밝음 */
  LANTERN_POINT_INTENSITY: 2.2,
  /** 가로등 PointLight 거리 */
  LANTERN_POINT_DISTANCE: 5,
  /** 켜진 가로등 머리 emissive 세기. 올리면 유리가 더 밝게 빛남 */
  LANTERN_ON_EMISSIVE: 2.5,
  /** 켜진 가로등 머리 색 */
  LANTERN_ON_EMISSIVE_COLOR: 0xffc46b,
  /** 꺼진 가로등 머리 단색. 낮추면 더 어두움 (텍스처를 빼고 이 색만 씀) */
  LANTERN_OFF_COLOR: 0x3b342c,
  /** 같은 자리의 겹친 가로등 메시를 숨김 */
  HIDE_DUPLICATE_MESHES: true,

  // --- 하늘 배경 ---
  /** 배경 하늘 이미지 */
  SKY_URL: "sky/sky.png",
  /** "screen": 화면에 고정된 배경(이미지 왜곡 없음) / "sphere": 카메라 방향 따라 도는 360° 배경 */
  SKY_MODE: "screen",
  /** 구름 흐름 속도. 0이면 정지. 올리면 빨라짐 */
  SKY_DRIFT_SPEED: 0.05,
  /** screen 모드에서 좌우로 흐르는 폭(이미지 폭 비율). 올리면 더 멀리 흐르지만 이미지가 더 확대됨 */
  SKY_DRIFT_RANGE: 0.3,

  // --- 연못 물 ---
  /** 물 노멀맵 (프로젝트 로컬) */
  WATER_NORMAL_URL: "textures/waternormals.jpg",
  /** 물 색(위에서 내려다볼 때 보이는 물빛). 밝게 하려면 더 밝은 색 */
  WATER_COLOR: 0x3f9fc4,
  /** 물 불투명도. 낮추면 바닥이 더 비침 */
  WATER_OPACITY: 0.92,
  /** 반사 일렁임 세기. 낮추면 거울처럼 잔잔, 올리면 반사가 많이 흔들림 */
  WATER_DISTORTION: 0.35,
  /** 물결 촘촘함. 올리면 잔물결이 작고 촘촘 */
  WATER_WAVE_SIZE: 60,
  /** 물결 흐름 속도. 낮추면 더 잔잔 */
  WATER_FLOW_SPEED: 0.45,
  /** 반사 텍스처 해상도. 낮추면 가벼움 */
  WATER_REFLECTION_SIZE: 512,
  /** 수면 반짝임(햇빛) 방향 [x, y, z] */
  WATER_SUN_DIRECTION: Object.freeze([0.5, 1, 0.35]),
  /** 동그랗게 퍼지는 물결 고리 동시 개수. 0이면 끔 */
  WATER_RIPPLE_COUNT: 4,
  /** 고리 하나가 퍼졌다 사라지는 시간(초) */
  WATER_RIPPLE_LIFE: 3.2,
  /** 고리 최대 반지름(m) */
  WATER_RIPPLE_RADIUS: 0.55,
  /** 고리 진하기 */
  WATER_RIPPLE_OPACITY: 0.45,
  /** 트리 장식 PointLight 세기 */
  TREE_POINT_INTENSITY: 2.4,
  /** 램프 PointLight 거리 */
  LAMP_POINT_DISTANCE: 4.5,
  /** 트리 PointLight 거리 */
  TREE_POINT_DISTANCE: 6,

  // --- 카메라 (Phase 7, 일부 Phase 3+) ---
  /** 내려다보는 각도(도). 클수록 탑뷰에 가까움 */
  CAMERA_PITCH_DEG: 28,
  CAMERA_PITCH_MIN_DEG: 15,
  CAMERA_PITCH_MAX_DEG: 45,
  /** lookAt 높이(발 기준). 올리면 화면 중심이 위로 */
  CAMERA_LOOKAT_HEIGHT: 0.95,
  /** 카메라 거리. 올리면 줌 아웃 */
  CAMERA_DISTANCE: 9,
  /** 카메라 수평각(도). -45면 스폰섬이 화면 아래, 다리가 세로 */
  CAMERA_YAW_DEG: -45,
  /** true면 platform 조각으로 다리 방향을 잡아 yaw를 덮어씀 */
  CAMERA_YAW_FROM_BRIDGE: false,
  /** 카메라가 목표를 따라붙는 속도. 올리면 더 바짝 따라옴 */
  CAMERA_FOLLOW_SHARPNESS: 18,
  /** 이 이름의 좌석(공부 책상 의자)에 앉으면 줌인 */
  CAMERA_SEAT_ZOOM_PATTERN: "chair",
  /** 앉았을 때 카메라 거리 배율. 낮추면 더 가까이 줌인 */
  CAMERA_SEAT_ZOOM: 0.6,
  /** 스폰 섬을 벗어나 메인 섬 쪽에 있을 때 카메라 거리 배율. 낮추면 더 가까이 */
  CAMERA_MAIN_ISLAND_ZOOM: 0.75,
  /** 줌인/줌아웃 속도. 올리면 더 빨리 바뀜 */
  CAMERA_ZOOM_SHARPNESS: 3,
  /** 성능 표시 토글 */
  DEBUG_PERF_KEY: "F4",
  CAMERA_DISTANCE_MIN: 6,
  CAMERA_DISTANCE_MAX: 16,

  // --- 멀티플레이 · 채팅 · 게시판 (docs/social-features-plan.md) ---
  /** "mock": 같은 PC 탭끼리 테스트 / "server": 기존 서버 (src/net/serverAdapter.js) */
  NET_ADAPTER: "mock",
  /** 같은 방에 들어온 사람끼리만 보임 */
  NET_ROOM_ID: "study-room",
  /** 내 위치를 보내는 횟수(초당) */
  NET_SEND_HZ: 10,
  /** 다른 사람 위치를 이만큼 늦춰서 보간(ms). 올리면 더 부드럽지만 지연↑ */
  NET_INTERP_DELAY_MS: 120,
  /** 이 시간(초) 동안 소식이 없으면 나간 것으로 처리 */
  NET_PLAYER_TIMEOUT_SEC: 6,
  /** 방명록(게시판) 메시 이름 */
  BOARD_PATTERN: "^ParkInfoBoard",
  /** 방명록 상호작용 거리(중심 기준) */
  BOARD_INTERACT_RANGE: 1.4,
  /** 방명록 캔버스 논리 해상도(가로) */
  BOARD_CANVAS_W: 1280,
  /** 방명록 캔버스 논리 해상도(세로) */
  BOARD_CANVAS_H: 720,
  /** 한 획에 담을 점 최대 개수 */
  BOARD_STROKE_MAX_POINTS: 400,
  /** 방명록에 보관할 획 최대 개수(오래된 것부터 정리) */
  BOARD_STROKE_KEEP: 800,
  /** 기본 펜 굵기(캔버스 논리 좌표) */
  BOARD_PEN_WIDTH: 4,
  /** 지우개 반경(캔버스 논리 좌표). 본인 획만 지움 */
  BOARD_ERASER_RADIUS: 22,
  /** 머리 뼈 위로 이름표를 띄우는 높이 */
  NAMETAG_HEIGHT_OFFSET: 0.28,
  /** 카메라에서 이보다 멀면 이름표 숨김 */
  NAMETAG_MAX_DISTANCE: 18,
  /** 내 머리 위에도 이름 표시 */
  SHOW_MY_NAMETAG: true,
  /** 채팅 최대 글자 수 */
  CHAT_MAX_LENGTH: 100,
  /** 채팅 최소 간격(초) */
  CHAT_COOLDOWN_SEC: 1,
  /** 머리 위 말풍선 표시 시간(초) */
  CHAT_BUBBLE_SECONDS: 5,
  /** 채팅 로그 보관 개수 */
  CHAT_LOG_KEEP: 50,
  /** 입장 시 불러올 최근 채팅 개수 */
  CHAT_HISTORY_ON_JOIN: 20,
  /** 이 시간(초) 동안 새 채팅이 없으면 로그 배경이 더 투명해짐 */
  CHAT_LOG_FADE_SEC: 10,

  // --- Phase 1 임시 씬 ---
  /** 테스트 큐브 크기 */
  PHASE1_CUBE_SIZE: 1,
};
