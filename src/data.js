// 예시 데이터 — 실제 서비스에서는 서버나 기기 저장소에서 불러옵니다.

export const INITIAL_SLOTS = [
  {
    id: 'morning',
    label: '아침',
    icon: 'sunrise',
    minutes: 7 * 60 + 30,
    enabled: true,
    pills: [{ name: '혈압약', count: 1 }],
    taken: true,
  },
  {
    id: 'lunch',
    label: '점심',
    icon: 'sun',
    minutes: 12 * 60 + 30,
    enabled: true,
    pills: [
      { name: '혈압약', count: 1 },
      { name: '당뇨약', count: 1 },
    ],
    note: '식사 후에 물과 함께 드세요',
    taken: false,
  },
  {
    id: 'dinner',
    label: '저녁',
    icon: 'moon',
    minutes: 18 * 60 + 30,
    enabled: true,
    pills: [{ name: '당뇨약', count: 1 }],
    taken: false,
  },
];

// 이번 주 기록: done = 모두 드심, missed = 놓친 약 있음, today = 오늘, future = 아직
export const WEEK = [
  { day: '월', status: 'done' },
  { day: '화', status: 'done' },
  { day: '수', status: 'missed' },
  { day: '목', status: 'done' },
  { day: '오늘', status: 'today', date: 13 },
  { day: '토', status: 'future' },
  { day: '일', status: 'future' },
];

export const MISSED = [{ title: '수요일 저녁 약', minutes: 18 * 60 + 30 }];

export const WEEK_RANGE = '11월 9일 ~ 15일';
export const WEEK_TAKEN_BEFORE_TODAY = 11; // 월~목 복용 횟수 (수요일 1회 놓침)
export const WEEK_TOTAL_BEFORE_TODAY = 12;

export const SNOOZE_MINUTES = 10;
export const STEP_MINUTES = 10;
export const GUARDIAN_NOTICE_MINUTES = 30;
