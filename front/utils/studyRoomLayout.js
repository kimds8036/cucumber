export const STUDY_ROOM_CAPACITY = 16;

export function truncateStudyUserId(raw) {
  const s = String(raw || '')
    .replace(/^@/, '')
    .trim();
  if (!s) return '학생';
  if (s.length <= 9) return s;
  return `${s.slice(0, 9)}..`;
}

/** 스터디룸 캐릭터 성별 — 등장할 때마다 랜덤 (DB 성별 없음) */
export function randomGender() {
  return Math.random() < 0.5 ? 'girl' : 'boy';
}

/** 빈 좌석(0..capacity-1) 중 하나를 균등 랜덤 선택 */
export function pickRandomEmptySeat(taken, capacity = STUDY_ROOM_CAPACITY) {
  const empty = [];
  for (let i = 0; i < capacity; i += 1) {
    if (!taken.has(i)) empty.push(i);
  }
  if (empty.length === 0) return null;
  return empty[Math.floor(Math.random() * empty.length)];
}

/** @deprecated 해시 고정 좌석 — pickRandomEmptySeat 사용 */
export function stableSeatIndex(userKey, taken) {
  return pickRandomEmptySeat(taken);
}

/**
 * self + 후보들을 정원 단위로 나누고, 본인이 속한 방 멤버만 반환
 * @returns {{ roomIndex: number, members: string[], redirected: boolean }}
 */
export function pickStudyRoomMembers(selfKey, otherKeys) {
  const self = String(selfKey);
  const uniq = Array.from(
    new Set([self, ...otherKeys.map((k) => String(k)).filter(Boolean)]),
  ).sort((a, b) => a.localeCompare(b, 'en'));

  const rooms = [];
  for (let i = 0; i < uniq.length; i += STUDY_ROOM_CAPACITY) {
    rooms.push(uniq.slice(i, i + STUDY_ROOM_CAPACITY));
  }
  if (rooms.length === 0) {
    return { roomIndex: 0, members: [self], redirected: false };
  }
  const roomIndex = Math.max(
    0,
    rooms.findIndex((r) => r.includes(self)),
  );
  return {
    roomIndex,
    members: rooms[roomIndex] || [self],
    redirected: rooms.length > 1,
  };
}

export function getWalkSize(studyW, studyH) {
  // 착석과 같은 크기로 — 작으면 덜 귀여워 보임
  return {
    walkW: Math.round(studyW),
    walkH: Math.round(studyH),
  };
}

/** 열과 열 사이 복도 중심 X (책상 바운딩 사이 중앙) */
export function columnAisleCenterX(layout, col) {
  const { gridLeft, cellW, studyW } = layout;
  const deskLeft = gridLeft + cellW * (col + 0.5) - studyW / 2;
  const prevDeskRight =
    col <= 0
      ? gridLeft - cellW * 0.05
      : gridLeft + cellW * (col - 0.5) + studyW / 2;
  return (prevDeskRight + deskLeft) / 2;
}

export function buildSeatLayout(stageW, stageH) {
  const COLS = 4;
  const ROWS = 4;
  const gridLeft = stageW * 0.1;
  const gridTop = stageH * 0.2;
  const gridW = stageW * 0.8;
  const gridH = Math.max(80, stageH * 0.66);
  const cellW = gridW / COLS;
  const cellH = gridH / ROWS;
  // 책상·캐릭터 원래 큰 크기
  const studyW = Math.min(cellW * 0.72, cellH * 0.56);
  const studyH = studyW * 1.28;

  const seats = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const index = row * COLS + col;
      const cx = gridLeft + cellW * (col + 0.5);
      const cy = gridTop + cellH * (row + 0.5);
      seats.push({
        index,
        col,
        row,
        seatX: cx - studyW / 2,
        seatY: cy - studyH / 2,
        studyW,
        studyH,
        z: (row + 1) * 10,
      });
    }
  }

  const { walkW, walkH } = getWalkSize(studyW, studyH);
  const lastDeskBottom = Math.max(...seats.map((s) => s.seatY + s.studyH));
  const rightDeskRight = Math.max(...seats.map((s) => s.seatX + s.studyW));

  // 하단 가로 복도: 모든 책상 발밑보다 아래 (걷기 스프라이트 top)
  const bottomAisleY = Math.min(
    stageH - walkH - 8,
    lastDeskBottom + Math.max(10, walkH * 0.4),
  );
  // 스폰: 그리드 오른쪽 밖
  const spawnX = Math.min(
    stageW - walkW - 6,
    rightDeskRight + Math.max(12, walkW * 0.9),
  );
  const spawnY = Math.min(stageH - walkH - 6, bottomAisleY);

  return {
    seats,
    studyW,
    studyH,
    walkW,
    walkH,
    spawnX,
    spawnY,
    bottomAisleY,
    gridLeft,
    cellW,
    cellH,
  };
}

/**
 * 책상 사이를 피한 입장:
 * 우하단 스폰 → 하단 복도 가로 → 열 사이 세로 복도 → 좌석으로 살짝 진입
 */
export function buildEnterWaypoints(layout, seat) {
  const { spawnX, spawnY, bottomAisleY, walkW, walkH } = layout;
  const aisleCenterX = columnAisleCenterX(layout, seat.col);
  const aisleLeft = aisleCenterX - walkW / 2;
  // 좌석 칸 앞에서 멈추는 세로 위치 (책상 옆 복도)
  const seatApproachY = seat.seatY + (seat.studyH - walkH) / 2;
  const seatCenterLeft = seat.seatX + (seat.studyW - walkW) / 2;

  return dedupePoints([
    { x: spawnX, y: spawnY },
    { x: spawnX, y: bottomAisleY },
    { x: aisleLeft, y: bottomAisleY },
    { x: aisleLeft, y: seatApproachY },
    { x: seatCenterLeft, y: seatApproachY },
  ]);
}

/** 퇴장: 좌석 → 열 복도 → 하단 복도 → 우하단 */
export function buildExitWaypoints(layout, seat, fromX, fromY) {
  const { spawnX, spawnY, bottomAisleY, walkW } = layout;
  const aisleCenterX = columnAisleCenterX(layout, seat.col);
  const aisleLeft = aisleCenterX - walkW / 2;

  return dedupePoints([
    { x: fromX, y: fromY },
    { x: aisleLeft, y: fromY },
    { x: aisleLeft, y: bottomAisleY },
    { x: spawnX, y: bottomAisleY },
    { x: spawnX, y: spawnY },
  ]);
}

function dedupePoints(points) {
  const out = [];
  points.forEach((p) => {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 3) {
      out.push(p);
    }
  });
  return out;
}
