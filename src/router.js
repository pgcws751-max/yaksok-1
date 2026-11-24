import { useEffect, useState } from 'react';

// 주소 뒤의 #/home 처럼 해시로 화면을 나눕니다. (GitHub Pages에서도 새로고침·뒤로가기가 동작)
const read = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute() {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => {
      setPath(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function navigate(path, { replace = false } = {}) {
  const url = `#${path}`;
  if (replace) {
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = path;
  }
}

export function goBack(fallback) {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}

// "/meds/:id/times" 같은 패턴과 맞추어 보고, 맞으면 { id } 를 돌려줍니다.
export function match(pattern, path) {
  const p = pattern.split('/');
  const a = path.split('/');
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i += 1) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}
