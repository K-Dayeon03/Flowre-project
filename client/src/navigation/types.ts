export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  StoreManage: undefined;
  EmployeeManage: undefined;
  EmployeeApproval: undefined;
  NoticeList: undefined;
  NoticeDetail: { noticeId: number };
  NoticeCreate: undefined;
  ScheduleList: undefined;
  ScheduleDetail: { scheduleId: number };
  ScheduleCreate: undefined;
  InventoryList: undefined;
  DocumentList: undefined;
  DocumentDetail: { documentId: number; title: string };
  DocumentUpload: { documentId?: number } | undefined;
  ChatRoomList: undefined;
  ChatRoom: { roomId: number; roomName: string; roomType: 'GROUP' | 'DIRECT' };
  StoreActivity: undefined;
  Support: { initialTab?: 'inquiries' | 'as-tickets'; query?: string } | undefined;
};
