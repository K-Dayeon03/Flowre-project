import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { Colors, FontSize } from '../constants/theme';
import { RootStackParamList, AuthStackParamList, MainStackParamList } from './types';
import AppHeader from '../components/AppHeader';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/home/HomeScreen';
import ProfileScreen from '../screens/home/ProfileScreen';
import StoreManageScreen from '../screens/home/StoreManageScreen';
import EmployeeManageScreen from '../screens/home/EmployeeManageScreen';
import EmployeeApprovalScreen from '../screens/home/EmployeeApprovalScreen';
import NoticeListScreen from '../screens/notice/NoticeListScreen';
import NoticeDetailScreen from '../screens/notice/NoticeDetailScreen';
import NoticeCreateScreen from '../screens/notice/NoticeCreateScreen';
import ScheduleListScreen from '../screens/schedule/ScheduleListScreen';
import ScheduleDetailScreen from '../screens/schedule/ScheduleDetailScreen';
import ScheduleCreateScreen from '../screens/schedule/ScheduleCreateScreen';
import InventoryListScreen from '../screens/inventory/InventoryListScreen';
import DocumentListScreen from '../screens/document/DocumentListScreen';
import DocumentDetailScreen from '../screens/document/DocumentDetailScreen';
import DocumentUploadScreen from '../screens/document/DocumentUploadScreen';
import ChatRoomListScreen from '../screens/chat/ChatRoomListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import StoreActivityScreen from '../screens/home/StoreActivityScreen';
import SupportScreen from '../screens/support/SupportScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={({ route }) => ({
        header: () => <AppHeader currentRoute={route.name} />,
      })}
    >
      <MainStack.Screen name="Home" component={HomeScreen} />
      <MainStack.Screen name="Profile" component={ProfileScreen} options={{ title: '내 프로필' }} />
      <MainStack.Screen name="StoreManage" component={StoreManageScreen} options={{ title: '매장 등록' }} />
      <MainStack.Screen name="EmployeeManage" component={EmployeeManageScreen} options={{ title: '직원 등록' }} />
      <MainStack.Screen name="EmployeeApproval" component={EmployeeApprovalScreen} options={{ title: '직원 승인' }} />
      <MainStack.Screen name="NoticeList" component={NoticeListScreen} options={{ title: '공지' }} />
      <MainStack.Screen name="NoticeDetail" component={NoticeDetailScreen} options={{ title: '공지 상세' }} />
      <MainStack.Screen name="NoticeCreate" component={NoticeCreateScreen} options={{ title: '공지 작성' }} />
      <MainStack.Screen name="ScheduleList" component={ScheduleListScreen} options={{ title: '스케줄' }} />
      <MainStack.Screen name="ScheduleDetail" component={ScheduleDetailScreen} options={{ title: '스케줄 상세' }} />
      <MainStack.Screen name="ScheduleCreate" component={ScheduleCreateScreen} options={{ title: '스케줄 등록' }} />
      <MainStack.Screen name="InventoryList" component={InventoryListScreen} options={{ title: '재고' }} />
      <MainStack.Screen name="DocumentList" component={DocumentListScreen} options={{ title: '문서' }} />
      <MainStack.Screen
        name="DocumentDetail"
        component={DocumentDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <MainStack.Screen
        name="DocumentUpload"
        component={DocumentUploadScreen}
        options={({ route }) => ({ title: route.params?.documentId ? '문서 수정' : '문서 업로드' })}
      />
      <MainStack.Screen name="ChatRoomList" component={ChatRoomListScreen} options={{ title: '채팅' }} />
      <MainStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.roomName })}
      />
      <MainStack.Screen name="StoreActivity" component={StoreActivityScreen} options={{ title: '매장 현황' }} />
      <MainStack.Screen name="Support" component={SupportScreen} options={{ title: '문의/AS' }} />
    </MainStack.Navigator>
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
