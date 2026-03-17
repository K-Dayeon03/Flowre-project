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
  DocumentTab: undefined;
  ChatTab: undefined;
};

export type ScheduleStackParamList = {
  ScheduleList: undefined;
  ScheduleDetail: { scheduleId: number };
  ScheduleCreate: undefined;
};

export type DocumentStackParamList = {
  DocumentList: undefined;
  DocumentDetail: { documentId: number; title: string };
  DocumentUpload: undefined;
};

export type ChatStackParamList = {
  ChatRoomList: undefined;
  ChatRoom: { roomId: number; roomName: string; roomType: 'GROUP' | 'DIRECT' };
};
