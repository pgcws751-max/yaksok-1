// 로그인 방식에 따른 표시
const PROVIDER_LABEL = { kakao: '카카오 로그인', google: '구글 로그인' };

export const isSocial = (user) => !!PROVIDER_LABEL[user?.provider];

export function accountLabel(user) {
  if (user.username) return user.provider === 'demo' ? `${user.username} (체험 계정)` : user.username;
  return PROVIDER_LABEL[user.provider] || '';
}
