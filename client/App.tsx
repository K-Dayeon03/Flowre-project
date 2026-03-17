import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation';
import { useAuthStore } from './src/store/useAuthStore';

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
