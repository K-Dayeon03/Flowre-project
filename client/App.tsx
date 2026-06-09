import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation';
import { useAuthStore, bindSessionExpiredHandler } from './src/store/useAuthStore';

// 앱 부팅 시 1회: refresh 영구 실패 → 인증 상태 정리 핸들러를 인터셉터에 바인딩.
// 모듈 import 부수효과가 아닌 명시적 호출로 등록 누락 위험을 제거한다.
bindSessionExpiredHandler();

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // 앱 시작 시 저장된 토큰으로 세션 복원
  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}
