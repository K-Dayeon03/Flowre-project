module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/api/authApi.ts',
    'src/api/client.ts',
    'src/store/useAuthStore.ts',
    'src/api/scheduleApi.ts',
    'src/store/useScheduleStore.ts',
    'src/api/documentApi.ts',
    'src/api/chatApi.ts',
    'src/store/useChatStore.ts',
    'src/hooks/useStompChat.ts',
  ],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
};
