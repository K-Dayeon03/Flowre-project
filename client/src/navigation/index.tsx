import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { Colors, FontSize } from '../constants/theme';
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
  HomeStackParamList,
  ScheduleStackParamList,
  DocumentStackParamList,
  ChatStackParamList,
} from './types';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ProfileScreen from '../screens/home/ProfileScreen';
import ScheduleListScreen from '../screens/schedule/ScheduleListScreen';
import ScheduleDetailScreen from '../screens/schedule/ScheduleDetailScreen';
import ScheduleCreateScreen from '../screens/schedule/ScheduleCreateScreen';
import DocumentListScreen from '../screens/document/DocumentListScreen';
import DocumentDetailScreen from '../screens/document/DocumentDetailScreen';
import DocumentUploadScreen from '../screens/document/DocumentUploadScreen';
import ChatRoomListScreen from '../screens/chat/ChatRoomListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ScheduleStack = createNativeStackNavigator<ScheduleStackParamList>();
const DocumentStack = createNativeStackNavigator<DocumentStackParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();

/** 탭 아이콘 컴포넌트 */
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    홈: '🏠',
    스케줄: '📅',
    문서: '📁',
    채팅: '💬',
  };
  return (
    <View style={styles.tabIcon}>
      <Text style={styles.tabEmoji}>{icons[label]}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTitleStyle: { fontSize: FontSize.lg, color: Colors.textPrimary },
        headerTintColor: Colors.primary,
      }}
    >
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} options={{ title: '내 프로필' }} />
    </HomeStack.Navigator>
  );
}

function ScheduleNavigator() {
  return (
    <ScheduleStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTitleStyle: { fontSize: FontSize.lg, color: Colors.textPrimary },
        headerTintColor: Colors.primary,
      }}
    >
      <ScheduleStack.Screen
        name="ScheduleList"
        component={ScheduleListScreen}
        options={{ title: '스케줄' }}
      />
      <ScheduleStack.Screen
        name="ScheduleDetail"
        component={ScheduleDetailScreen}
        options={{ title: '스케줄 상세' }}
      />
      <ScheduleStack.Screen
        name="ScheduleCreate"
        component={ScheduleCreateScreen}
        options={{ title: '스케줄 등록' }}
      />
    </ScheduleStack.Navigator>
  );
}

function DocumentNavigator() {
  return (
    <DocumentStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTitleStyle: { fontSize: FontSize.lg, color: Colors.textPrimary },
        headerTintColor: Colors.primary,
      }}
    >
      <DocumentStack.Screen
        name="DocumentList"
        component={DocumentListScreen}
        options={{ title: '문서' }}
      />
      <DocumentStack.Screen
        name="DocumentDetail"
        component={DocumentDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <DocumentStack.Screen
        name="DocumentUpload"
        component={DocumentUploadScreen}
        options={{ title: '문서 업로드' }}
      />
    </DocumentStack.Navigator>
  );
}

function ChatNavigator() {
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTitleStyle: { fontSize: FontSize.lg, color: Colors.textPrimary },
        headerTintColor: Colors.primary,
      }}
    >
      <ChatStack.Screen
        name="ChatRoomList"
        component={ChatRoomListScreen}
        options={{ title: '채팅' }}
      />
      <ChatStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.roomName })}
      />
    </ChatStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="홈" focused={focused} /> }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="스케줄" focused={focused} /> }}
      />
      <Tab.Screen
        name="DocumentTab"
        component={DocumentNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="문서" focused={focused} /> }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatNavigator}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="채팅" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 4,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  tabEmoji: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabLabelFocused: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
