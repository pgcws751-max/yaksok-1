# 약속 · 복약 관리 서비스

"복약 관리 서비스 메뉴 구조" 문서를 바탕으로 만든 웹 서비스입니다.
로그인 전 **시작 화면**과 로그인 후 **하단 탭 4개(홈 · 약 관리 · 복용이력 · 설정)**로 구성돼요.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 폴더에 배포용 파일 생성
```

`main` 브랜치에 올리면 GitHub Pages로 자동 배포됩니다 (`.github/workflows/deploy.yml`).
로그인 화면의 **"가입 없이 체험해 보기"**를 누르면 약 3개와 지난 30일 기록이 들어 있는 체험 계정으로 둘러볼 수 있어요.

## 메뉴와 화면

| 메뉴 | 화면 | 주소 | 기능 |
|---|---|---|---|
| 시작 화면 | 로그인 | `#/login` | 아이디/비밀번호, 자동 로그인 |
| | 회원가입 | `#/signup` | 아이디, 비밀번호, 이름, 연락처, 알림 수신 동의 |
| | 아이디 찾기 | `#/find-id` | 이름 + 연락처 |
| | 비밀번호 찾기 | `#/find-password` | 본인 확인 후 재설정 |
| 홈 | 오늘의 복용 | `#/home` | 시간순 오늘 약, "먹었어요" 체크(취소 가능), 다음 복용까지 남은 시간 |
| | 복용 알림 | `#/alarm/:분` | 복용시간에 뜨는 알림 화면, 먹었어요 / 다시 알림 |
| 약 관리 | 약 목록 | `#/meds` | 복용 중 · 시작 전 · 종료 구분 |
| | 약 등록/수정 | `#/meds/new`, `#/meds/:id` | 약 이름, 1회 용량, 복용 기간, 메모, 삭제 |
| | 복용시간 설정 | `#/meds/:id/times` | 하루 횟수와 시간, 요일 반복, 식전/식후 |
| 복용이력 | 달력 보기 | `#/history` | 날짜별 복용/미복용 표시, 날짜를 누르면 상세 기록 (지난 기록 추가·취소 가능) |
| | 복용률 | `#/history` (복용률 탭) | 주간/월간 복용률, 요일별·주별·약별 막대 |
| 설정 | 알림 설정 | `#/settings/notify` | 알림 켜기/끄기, 미복용 시 다시 알림(5~30분) |
| | 내 정보 | `#/settings/profile` | 이름·연락처 수정, 비밀번호 변경 |
| | 계정 | `#/settings/account` | 로그아웃, 회원탈퇴 |

## 데이터 저장 (Supabase)

| 무엇 | 어디 |
|---|---|
| 회원 계정 | Supabase Auth. 아이디 가입은 내부적으로 `아이디@id.yaksok.app` 계정으로 연결 |
| 내 정보 | `profiles` (아이디, 이름, 연락처) |
| 약 | `meds` (이름, 1회 용량, 기간, 메모, 복용시각 배열, 요일 배열, 식전/식후) |
| 복용 기록 | `dose_logs` (약 + 날짜 + 시각당 한 줄) |
| 알림 설정 | `settings` |
| 서버 함수 | `account` (아이디 가입·아이디 찾기·비밀번호 재설정), `delete-account` (탈퇴) |

- 모든 테이블에 "본인 데이터만" 보안 규칙(RLS)이 걸려 있어요.
- "가입 없이 체험해 보기"는 서버를 쓰지 않고 이 기기에만 저장해요.
- 카카오·구글 버튼은 Supabase에서 해당 로그인을 켜 두었을 때만 나타나요.

## 폴더 구조

```
src/
  App.jsx              화면 연결, 로그인 상태, 데이터 불러오기·변경분 저장, 복용 알림
  router.js            #/주소 기반 화면 이동
  lib/api.js           데이터 창구 (회원 → remoteApi, 체험 → localApi)
  lib/remoteApi.js     Supabase 처리
  lib/localApi.js      체험 모드용 기기 저장소 처리
  lib/supabase.js      Supabase 연결 정보 (공개 키)
  lib/schedule.js      그날 먹을 약, 복용 여부, 복용률, 연속 복용일 계산
  lib/notify.js        브라우저 알림
  components/          아이콘, 하단 탭, 약 색 아이콘, 입력칸 등
  pages/               화면들
```

## 앱 설치 · 앱이 닫혀 있어도 오는 알림

- `public/manifest.webmanifest`, 아이콘, `public/sw.js`(화면 저장 + 푸시 표시)로 홈 화면에 설치할 수 있어요.
- 알림 흐름: Supabase `pg_cron`이 1분마다 `send-reminders` 함수를 부름 → `claim_due_reminders()`가 지금 보낼 알림(정시 · 다시 알림 · 10분 뒤)을 찾고 중복을 막음 → 웹 푸시 전송.
- 테이블: `push_subscriptions`(기기별 구독), `push_snoozes`(10분 뒤 다시), `push_sent`(보낸 기록, 3일 보관). 푸시 키는 Supabase Vault에 보관.
- 아이폰은 홈 화면에 추가한 앱에서만 푸시를 받을 수 있어요(iOS 16.4 이상).

## 약 등록 (고르기 + 말하기)

- 새 약 등록(`#/meds/new`)은 5단계 고르기: 약 이름(자주 쓰는 약 버튼·직접 입력) → 먹는 때(아침·점심·저녁·자기 전, ±10분) → 용량·식전/식후 → 시작일·기간 → 확인.
- **말로 한 번에 등록:** "혈압약 아침 저녁 한 알씩 식후 오늘부터 한 달" → `src/lib/medVoice.js`의 `parseMedSpeech()`가 이름·시간·용량·식사·시작일·기간을 채움. 단계별 마이크도 있음.
- 음성 인식: 안드로이드 앱은 휴대폰 내장 음성 인식(`@capacitor-community/speech-recognition`, 마이크 권한), 웹은 브라우저 음성 인식(휴대폰 크롬), 둘 다 없으면 예시 문장 샘플. 기존 약 수정은 이전 화면(`MedEdit`) 그대로.

## 도우미 (샘플)

- 하단 탭 "도우미"(`#/chat`): 복약(오늘 약·복용률 카드), 약국·병원 찾기(샘플 목록 + 실제 카카오맵 검색), 가족·지인 전화·문자(실제 `tel:`/`sms:`), 119 긴급 연결(확인 후 실제 전화).
- 가족·지인 연락처: 설정 > 가족·지인 연락처 (이 기기에만 저장).
- 음성: 입력창이 비면 마이크 버튼 → 듣는 화면(샘플: 예시 문장을 받아 적고 자동 전송). 실제 음성 인식은 `src/lib/voice.js`의 `listen()`만 바꾸면 돼요. 말풍선의 '듣기'는 기기의 읽기 기능(speechSynthesis)으로 실제 동작.
- AI 연결 준비: `src/lib/chatbot.js`의 `SYSTEM_PROMPT`(지시문 초안), `TOOLS`(AI가 고를 기능 목록), `buildContext()`(내 기록·연락처 요약), `getReply()`(지금은 샘플 → 서버 함수 호출로 교체).

## 관리자 화면 (`#/admin`)

- 관리자 전용 로그인: `#/admin/login` (관리자가 아니면 들어갈 수 없음, 브라우저를 닫으면 로그아웃). 관리자 계정은 아이디·비밀번호 찾기 불가.
- 관리자: `admins` 테이블에 있는 회원만. 앱의 설정에도 "관리자 화면" 메뉴가 생겨요.
- 대시보드(회원 수, 7일 접속, 7일 평균 복용률, 알림 기기, 오늘 보낸 알림, 일별 가입·복용률 차트), 회원 목록·검색, 회원 상세(약·30일 복용·최근 기록), 열람 기록.
- 모든 관리자 데이터는 `admin_*` 함수가 서버에서 관리자인지 확인한 뒤 돌려줘요. 회원 상세를 열 때마다 `admin_audit`에 기록돼요.
- 관리자 추가: Supabase SQL Editor에서 `insert into admins (user_id) select id from profiles where username = '아이디';`

## 안드로이드 앱 (APK)

- Capacitor로 웹앱을 감싼 안드로이드 프로젝트: `android/`, 설정 `capacitor.config.json` (앱 ID `com.pgcws751.yaksok`)
- 알림: 앱에서는 웹 푸시 대신 **휴대폰 자체 예약 알림**(앞으로 14일치, 기록이 바뀔 때마다 다시 예약, 인터넷 없어도 울림). `src/lib/native.js`
- 빌드: `main`에 올리면 GitHub Actions(`.github/workflows/android.yml`)가 시험용 APK를 만들어 Releases의 **android-latest**에 올려요.
- 직접 빌드: `npm run android:sync` 후 Android Studio로 `android/` 열기

## 남은 할 일

- 카카오·구글 로그인: Supabase 대시보드에서 각 제공자를 켜고 키 입력, Redirect URL 등록
- 아이디·비밀번호 찾기는 이름 + 연락처로 확인해요. 더 안전하게 하려면 문자 인증을 붙여야 해요.
