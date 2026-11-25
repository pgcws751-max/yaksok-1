import { useState } from 'react';
import { SubHeader } from '../../components/ui.jsx';
import { FONT_SIZES, fontSize, setFontSize } from '../../lib/fontSize.js';

export default function Display({ ctx }) {
  const [px, setPx] = useState(fontSize);
  const choose = (v) => {
    setPx(v);
    setFontSize(v);
    ctx.toast('글자 크기를 바꿨어요');
  };

  return (
    <main className="screen">
      <SubHeader title="글자 크기" sub="보기 편한 크기를 골라 주세요" back="/settings" />

      <div className="seg" role="group" aria-label="글자 크기" style={{ marginTop: 20 }}>
        {FONT_SIZES.map((f) => (
          <button key={f.px} type="button" aria-pressed={px === f.px} onClick={() => choose(f.px)}>
            {f.label}
          </button>
        ))}
      </div>

      <section className="card size-preview" aria-label="미리보기">
        <div className="k">미리보기</div>
        <div className="name">점심 약 드실 시간이에요</div>
        <p>혈압약 1알 · 당뇨약 1알 (식후)</p>
      </section>

      <p className="field-hint" style={{ margin: '14px 20px 0' }}>
        이 기기에 저장돼요. 로그인 화면에도 같은 크기가 적용돼요.
      </p>
    </main>
  );
}
