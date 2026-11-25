import { createClient } from '@supabase/supabase-js';

// 공개(publishable) 키는 웹 앱에 들어가도 되는 키입니다.
// 데이터는 데이터베이스의 보안 규칙(RLS)으로 "본인 것만" 보이게 막혀 있습니다.
export const SUPABASE_URL = 'https://eazifwcaxjlqveesqdzv.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_OviLMqJqhicRKEYtI6T-qQ_cqTfHwUP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    flowType: 'pkce', // 간편 로그인 후 ?code= 로 돌아오므로 #/화면 주소와 겹치지 않습니다
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// 간편 로그인에서 돌아온 뒤 주소창의 ?code= 를 지웁니다.
export function cleanAuthParams() {
  const url = new URL(window.location.href);
  if (url.searchParams.has('code') || url.searchParams.has('error')) {
    url.searchParams.delete('code');
    url.searchParams.delete('error');
    url.searchParams.delete('error_code');
    url.searchParams.delete('error_description');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}
