import { apiClient, unwrap } from './client';

export type InquiryStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
export type AsTicketStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';
export type AsTicketPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export interface InquiryTicket {
  id: number;
  storeId: number;
  storeName: string;
  requesterName: string;
  title: string;
  content?: string | null;
  status: InquiryStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface AsTicket {
  id: number;
  storeId: number;
  storeName: string;
  title: string;
  description?: string | null;
  status: AsTicketStatus;
  priority: AsTicketPriority;
  createdAt: string;
  updatedAt?: string;
}

export interface InquiryCreateRequest {
  storeId?: number;
  requesterName: string;
  title: string;
  content?: string;
}

export interface AsTicketCreateRequest {
  storeId?: number;
  title: string;
  description?: string;
  priority?: AsTicketPriority;
}

export const supportApi = {
  getInquiries: async (params?: { storeId?: number; limit?: number }): Promise<InquiryTicket[]> => {
    const res = await apiClient.get('/api/support/inquiries', { params });
    return unwrap(res);
  },
  getAsTickets: async (params?: { storeId?: number; limit?: number }): Promise<AsTicket[]> => {
    const res = await apiClient.get('/api/support/as-tickets', { params });
    return unwrap(res);
  },
  createInquiry: async (data: InquiryCreateRequest): Promise<InquiryTicket> => {
    const res = await apiClient.post('/api/support/inquiries', data);
    return unwrap(res);
  },
  createAsTicket: async (data: AsTicketCreateRequest): Promise<AsTicket> => {
    const res = await apiClient.post('/api/support/as-tickets', data);
    return unwrap(res);
  },
  changeInquiryStatus: async (id: number, status: InquiryStatus): Promise<InquiryTicket> => {
    const res = await apiClient.patch(`/api/support/inquiries/${id}/status`, null, { params: { status } });
    return unwrap(res);
  },
  changeAsTicketStatus: async (id: number, status: AsTicketStatus): Promise<AsTicket> => {
    const res = await apiClient.patch(`/api/support/as-tickets/${id}/status`, null, { params: { status } });
    return unwrap(res);
  },
};
