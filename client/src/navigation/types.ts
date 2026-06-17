export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  ScheduleTab: undefined;
  InventoryTab: undefined;
  DocumentTab: undefined;
  ChatTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Profile: undefined;
  StoreManage: undefined;
  EmployeeManage: undefined;
  EmployeeApproval: undefined;
  NoticeList: undefined;
  NoticeDetail: { noticeId: number };
  NoticeCreate: undefined;
};

export type ScheduleStackParamList = {
  ScheduleList: undefined;
  ScheduleDetail: { scheduleId: number };
  ScheduleCreate: undefined;
};

export type InventoryStackParamList = {
  InventoryList: undefined;
};

export type DocumentStackParamList = {
  DocumentList: undefined;
  DocumentDetail: { documentId: number; title: string };
  DocumentUpload: { documentId?: number } | undefined;
};

export type ChatStackParamList = {
  ChatRoomList: undefined;
  ChatRoom: { roomId: number; roomName: string; roomType: 'GROUP' | 'DIRECT' };
};
