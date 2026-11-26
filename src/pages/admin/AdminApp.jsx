import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { BarChart, ChartCard, LineChart } from '../../components/charts.jsx';
import * as api from '../../lib/api.js';
import { WEEKDAYS } from '../../lib/date.js';
import { match, navigate } from '../../router.js';
import { MEAL_TEXT, formatTime } from '../../time.js';

// ───── 공통 ─────

const fmtDay = (d) => {
  const [, m, dd] = String(d).slice(0, 10).split('-');
  return `${Number(m)}/${Number(dd)}`;
};
const fmtDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const fmtDate = (iso) => (iso ? fmtDateTime(iso).slice(0, 10) : '-');
const fmtPhone = (p) => (p && p.length === 11 ? `${p.slice(0, 3)}-${p.slice(3, 7)}-${p.slice(7)}` : p || '-');
const PROVIDER = { email: '아이디', kakao: '카카오', google: '구글' };
const daysText = (days) => (days.length === 7 ? '매일' : [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => WEEKDAYS[d]).join('·'));

function useLoad(fn, deps) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [key, setKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    fn().then(
      (data) => alive && setState({ loading: false, data, error: '' }),
      (e) => alive && setState({ loading: false, data: null, error: e.userMessage || '불러오지 못했어요' }),
    );
    return () => {
      alive = false;
    };
  }, [...deps, key]);
  return { ...state, reload: () => setKey((k) => k + 1) };
}

function Loading({ state, children }) {
  if (state.loading && !state.data) return <p className="adm-empty">불러오는 중…</p>;
  if (state.error)
    return (
      <div className="adm-empty">
        <p>{state.error}</p>
        <button type="button" className="btn-soft" style={{ padding: '0 20px' }} onClick={state.reload}>
          다시 시도
        </button>
      </div>
    );
  return children(state.data);
}

function Pct({ v }) {
  if (v == null) return <span className="muted">-</span>;
  return <span className={v >= 80 ? 'good' : v < 50 ? 'bad' : ''}>{v}%</span>;
}

// ───── 대시보드 ─────

function Kpi({ label, value, sub }) {
  return (
    <div className="card kpi">
      <span>{label}</span>
      <b>{value}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function Dashboard() {
  const st = useLoad(() => api.adminStats(), []);
  return (
    <Loading state={st}>
      {(s) => {
        const signups = (s.signups || []).map((d) => ({ label: fmtDay(d.day), value: d.n, title: fmtDay(d.day) }));
        const adh = (s.adherence || []).map((d) => ({
          label: fmtDay(d.day),
          value: d.pct,
          title: fmtDay(d.day),
          detail: d.due ? `${d.taken}/${d.due}번` : '',
        }));
        const total30 = signups.reduce((n, d) => n + d.value, 0);
        return (
          <>
            <div className="kpi-grid">
              <Kpi label="전체 회원" value={`${s.users_total}명`} sub={`최근 7일 신규 ${s.users_new_7d}명`} />
              <Kpi label="최근 7일 접속" value={`${s.users_active_7d}명`} sub={s.users_total ? `전체의 ${Math.round((s.users_active_7d / s.users_total) * 100)}%` : ''} />
              <Kpi label="최근 7일 평균 복용률" value={s.adherence_7d == null ? '-' : `${s.adherence_7d}%`} sub="어제까지 기준" />
              <Kpi label="약을 등록한 회원" value={`${s.users_with_meds}명`} sub={`등록된 약 ${s.meds_total}개`} />
              <Kpi label="알림 켠 기기" value={`${s.push_devices}대`} sub={`회원 ${s.push_users}명`} />
              <Kpi label="오늘 보낸 알림" value={`${s.reminders_today}건`} sub="정시 · 다시 알림 포함" />
            </div>
            <div className="chart-grid">
              <ChartCard
                title="일별 신규 가입"
                sub={`최근 30일 · 총 ${total30}명`}
                table={{ rows: signups, columns: [{ key: 'title', label: '날짜' }, { key: 'value', label: '가입자', format: (r) => `${r.value}명` }] }}
              >
                <BarChart data={signups} unit="명" />
              </ChartCard>
              <ChartCard
                title="일별 복용률"
                sub="최근 14일 · 먹어야 했던 약 중 드신 비율"
                table={{
                  rows: adh,
                  columns: [
                    { key: 'title', label: '날짜' },
                    { key: 'value', label: '복용률', format: (r) => (r.value == null ? '-' : `${r.value}%`) },
                    { key: 'detail', label: '드신 / 예정' },
                  ],
                }}
              >
                <LineChart data={adh} />
              </ChartCard>
            </div>
          </>
        );
      }}
    </Loading>
  );
}

// ───── 회원 목록 ─────

function Users() {
  const st = useLoad(() => api.adminUsers(), []);
  const [q, setQ] = useState('');
  return (
    <Loading state={st}>
      {(rows) => {
        const k = q.trim().toLowerCase();
        const list = !k
          ? rows
          : rows.filter((r) => [r.username, r.name, r.phone].some((v) => String(v || '').toLowerCase().includes(k.replace(/-/g, ''))));
        return (
          <>
            <div className="adm-toolbar">
              <label className="adm-search">
                <Icon name="user" size={18} />
                <input type="search" placeholder="아이디 · 이름 · 연락처 검색" value={q} onChange={(e) => setQ(e.target.value)} aria-label="회원 검색" />
              </label>
              <span className="muted">{list.length}명</span>
            </div>
            <div className="card adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>아이디</th>
                    <th>이름</th>
                    <th>연락처</th>
                    <th>가입</th>
                    <th>최근 접속</th>
                    <th className="num">약</th>
                    <th className="num">7일 복용률</th>
                    <th className="num">알림 기기</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} tabIndex={0} onClick={() => navigate(`/admin/users/${r.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/users/${r.id}`)}>
                      <td>
                        <b>{r.username || `(${PROVIDER[r.provider] || r.provider})`}</b>
                        {r.is_admin && <span className="badge on" style={{ marginLeft: 6 }}>관리자</span>}
                      </td>
                      <td>{r.name || '-'}</td>
                      <td>{fmtPhone(r.phone)}</td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>{fmtDateTime(r.last_sign_in_at)}</td>
                      <td className="num">{r.meds}</td>
                      <td className="num">
                        <Pct v={r.adherence_7d} />
                      </td>
                      <td className="num">{r.push_devices || <span className="muted">0</span>}</td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td colSpan={8} className="adm-empty">
                        {k ? '검색 결과가 없어요' : '아직 가입한 회원이 없어요'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        );
      }}
    </Loading>
  );
}

// ───── 회원 상세 ─────

function UserDetail({ id }) {
  const st = useLoad(() => api.adminUserDetail(id), [id]);
  return (
    <Loading state={st}>
      {(d) => {
        if (!d?.profile) return <p className="adm-empty">회원을 찾을 수 없어요</p>;
        const p = d.profile;
        const due = d.days.reduce((n, x) => n + x.due, 0);
        const taken = d.days.reduce((n, x) => n + x.taken, 0);
        return (
          <>
            <button type="button" className="back" onClick={() => navigate('/admin/users')}>
              <Icon name="back" size={20} strokeWidth={2.6} />
              회원 목록
            </button>
            <p className="adm-notice" role="note">
              <Icon name="bell" size={16} strokeWidth={2.4} />
              복용 중인 약은 민감한 건강 정보예요. 상담·관리 목적으로만 보고, 열람 기록이 남아요.
            </p>

            <div className="adm-detail-grid">
              <section className="card adm-panel">
                <h3>회원 정보</h3>
                <dl className="adm-dl">
                  <dt>아이디</dt>
                  <dd>{p.username || `(${PROVIDER[p.provider] || p.provider} 로그인)`}</dd>
                  <dt>이름</dt>
                  <dd>{p.name || '-'}</dd>
                  <dt>연락처</dt>
                  <dd>{fmtPhone(p.phone)}</dd>
                  <dt>가입</dt>
                  <dd>{fmtDateTime(p.created_at)}</dd>
                  <dt>최근 접속</dt>
                  <dd>{fmtDateTime(p.last_sign_in_at)}</dd>
                  <dt>알림</dt>
                  <dd>
                    {d.settings?.notify ? '켜짐' : '꺼짐'}
                    {d.settings?.notify && d.settings?.remind && ` · 안 드시면 ${d.settings.remind_minutes}분 뒤 다시`}
                    {` · 알림 기기 ${d.push_devices}대`}
                  </dd>
                </dl>
              </section>

              <section className="card adm-panel">
                <h3>최근 30일 복용</h3>
                <p className="adm-big">
                  <Pct v={due ? Math.round((taken / due) * 100) : null} />
                  <small>
                    {taken} / {due}번 드심
                  </small>
                </p>
                <div className="adm-strip" role="img" aria-label={`최근 30일 중 모두 드신 날 ${d.days.filter((x) => x.due && x.taken === x.due).length}일`}>
                  {d.days.map((x) => {
                    const cls = !x.due ? 'none' : x.taken === x.due ? 'done' : x.taken ? 'partial' : 'missed';
                    return <span key={x.day} className={cls} title={`${fmtDay(x.day)} · ${x.due ? `${x.taken}/${x.due}번` : '약 없음'}`} />;
                  })}
                </div>
                <div className="legend">
                  <div><i className="f" />모두 드심</div>
                  <div><i className="o" />일부 놓침</div>
                  <div><i className="x" />못 드심</div>
                </div>
              </section>
            </div>

            <section className="card adm-panel">
              <h3>등록한 약 ({d.meds.length})</h3>
              <div className="adm-table-wrap flat">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>약</th>
                      <th>복용 시간</th>
                      <th>요일 · 식사</th>
                      <th>기간</th>
                      <th className="num">30일 복용률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.meds.map((m) => (
                      <tr key={m.id} className="static">
                        <td>
                          <b>{m.name}</b> <span className="muted">{m.dose}</span>
                          {m.memo && <div className="muted small">{m.memo}</div>}
                        </td>
                        <td>{m.times.map(formatTime).join(', ') || '-'}</td>
                        <td>
                          {daysText(m.days)}
                          {MEAL_TEXT[m.meal] && ` · ${MEAL_TEXT[m.meal]}`}
                        </td>
                        <td>
                          {fmtDay(m.start_date)} ~ {m.end_date ? fmtDay(m.end_date) : '계속'}
                        </td>
                        <td className="num">
                          <Pct v={m.due_30d ? Math.round((m.taken_30d / m.due_30d) * 100) : null} />
                          <div className="muted small">
                            {m.taken_30d}/{m.due_30d}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!d.meds.length && (
                      <tr>
                        <td colSpan={5} className="adm-empty">
                          등록한 약이 없어요
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card adm-panel">
              <h3>최근 복용 기록</h3>
              {d.recent_logs.length ? (
                <ul className="adm-logs">
                  {d.recent_logs.map((l, i) => (
                    <li key={i}>
                      <b>{l.name}</b>
                      <span>
                        {fmtDay(l.taken_on)} {formatTime(l.minutes)} 예정
                      </span>
                      <span className="muted">{fmtDateTime(l.taken_at).slice(5)} 체크</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="adm-empty">아직 기록이 없어요</p>
              )}
            </section>
          </>
        );
      }}
    </Loading>
  );
}

// ───── 열람 기록 ─────

function Audit() {
  const st = useLoad(() => api.adminAuditLog(), []);
  return (
    <Loading state={st}>
      {(rows) => (
        <div className="card adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>시각</th>
                <th>관리자</th>
                <th>내용</th>
                <th>대상 회원</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="static">
                  <td>{fmtDateTime(r.at)}</td>
                  <td>{r.admin_username || '-'}</td>
                  <td>{r.action === 'view_user_detail' ? '회원 상세 열람' : r.action}</td>
                  <td>{r.target_username || '(탈퇴/간편 로그인 회원)'}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="adm-empty">
                    아직 열람 기록이 없어요
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Loading>
  );
}

// ───── 틀 ─────

const NAV = [
  { path: '/admin', label: '대시보드', icon: 'chart' },
  { path: '/admin/users', label: '회원', icon: 'user' },
  { path: '/admin/audit', label: '열람 기록', icon: 'calendar' },
];

export default function AdminApp({ ctx, path }) {
  const detail = match('/admin/users/:id', path);
  const section = detail ? '/admin/users' : NAV.find((n) => n.path === path)?.path || '/admin';
  const title = detail ? '회원 상세' : NAV.find((n) => n.path === section)?.label;
  const page = useMemo(() => {
    if (detail) return <UserDetail id={detail.id} />;
    if (section === '/admin/users') return <Users />;
    if (section === '/admin/audit') return <Audit />;
    return <Dashboard />;
  }, [path]);

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-brand">
          <span className="intro-logo">
            <Icon name="pill" size={16} color="#fff" strokeWidth={2.4} />
          </span>
          약속 관리자
        </div>
        <nav className="adm-nav" aria-label="관리자 메뉴">
          {NAV.map((n) => (
            <button key={n.path} type="button" aria-current={section === n.path ? 'page' : undefined} onClick={() => navigate(n.path)}>
              <Icon name={n.icon} size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="adm-me">
          <span className="muted">{ctx.user.username || ctx.user.name}</span>
          <button type="button" className="btn-soft" onClick={() => navigate('/settings')}>
            앱으로
          </button>
        </div>
      </header>
      <main className="adm-main">
        <h1 className="adm-title">{title}</h1>
        {page}
      </main>
    </div>
  );
}
