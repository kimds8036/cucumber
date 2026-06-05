export const TIMETABLE_DUMMY = [
  {
    id: 1,
    name: '심화 국어',
    category: '국어',
    units: 3,
    classes: [
      {
        classId: '1반',
        teacher: '이서유',
        room: '국어실A',
        blocks: [
          { day: 0, periods: [1, 2] },
          { day: 3, periods: [3, 4] },
        ],
      },
      {
        classId: '2반',
        teacher: '신선옥',
        room: '국어실B',
        blocks: [
          { day: 1, periods: [1, 2] },
          { day: 4, periods: [3, 4] },
        ],
      },
    ],
  },
  {
    id: 2,
    name: '수학Ⅱ',
    category: '수학',
    units: 3,
    classes: [
      {
        classId: 'A반',
        teacher: '김수학',
        room: '수학실A',
        blocks: [
          { day: 1, periods: [2, 3] },
          { day: 4, periods: [4, 5] },
        ],
      },
      {
        classId: 'B반',
        teacher: '박수학',
        room: '수학실B',
        blocks: [
          { day: 0, periods: [3, 4] },
          { day: 3, periods: [1, 2] },
        ],
      },
    ],
  },
  {
    id: 3,
    name: '영어 독해',
    category: '영어',
    units: 2,
    classes: [
      {
        classId: 'A반',
        teacher: '이영어',
        room: '영어실1',
        blocks: [
          { day: 0, periods: [5] },
          { day: 2, periods: [5] },
        ],
      },
      {
        classId: 'B반',
        teacher: '최영어',
        room: '영어실2',
        blocks: [
          { day: 1, periods: [5] },
          { day: 3, periods: [5] },
        ],
      },
    ],
  },
  {
    id: 4,
    name: '물리학Ⅱ',
    category: '과학',
    units: 2,
    classes: [
      {
        classId: 'A반',
        teacher: '강물리',
        room: '과학실1',
        blocks: [
          { day: 2, periods: [1, 2] },
          { day: 4, periods: [1] },
        ],
      },
    ],
  },
  {
    id: 5,
    name: '생명과학Ⅰ',
    category: '과학',
    units: 2,
    classes: [
      {
        classId: 'A반',
        teacher: '오생명',
        room: '과학실2',
        blocks: [
          { day: 1, periods: [3] },
          { day: 4, periods: [2] },
        ],
      },
    ],
  },
  {
    id: 6,
    name: '한국사',
    category: '사회',
    units: 2,
    classes: [
      {
        classId: '전체',
        teacher: '정한국',
        room: '대강당',
        blocks: [
          { day: 2, periods: [3] },
          { day: 4, periods: [5] },
        ],
      },
    ],
  },
  {
    id: 7,
    name: '확률과 통계',
    category: '수학',
    units: 2,
    classes: [
      {
        classId: 'A반',
        teacher: '류확통',
        room: '수학실C',
        blocks: [
          { day: 0, periods: [6] },
          { day: 3, periods: [6] },
        ],
      },
      {
        classId: 'B반',
        teacher: '한확통',
        room: '수학실D',
        blocks: [
          { day: 1, periods: [6] },
          { day: 4, periods: [6] },
        ],
      },
    ],
  },
  {
    id: 8,
    name: '체육',
    category: '예체능',
    units: 1,
    classes: [
      {
        classId: '홀수반',
        teacher: '김체육',
        room: '운동장',
        blocks: [
          { day: 2, periods: [4] },
          { day: 4, periods: [3] },
        ],
      },
      {
        classId: '짝수반',
        teacher: '이체육',
        room: '체육관',
        blocks: [
          { day: 1, periods: [4] },
          { day: 3, periods: [4] },
        ],
      },
    ],
  },
];

export const SUBJECT_COLORS = [
  '#4f8ef7',
  '#e2644b',
  '#4db56a',
  '#f0a435',
  '#a06dd4',
  '#36b2c8',
  '#e06ead',
];
