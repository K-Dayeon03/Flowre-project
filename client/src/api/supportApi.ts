import { apiClient, unwrap } from './client';

export type InquiryStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
export type AsTicketStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';
export type AsTicketPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export interface InquiryTicket {
  id: number;
  storeName: string;
  requesterName: string;
  title: string;
  content: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface AsTicket {
  id: number;
  storeName: string;
  requesterName: string;
  title: string;
  content: string;
  status: AsTicketStatus;
  priority: AsTicketPriority;
  createdAt: string;
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
  changeInquiryStatus: async (id: number, status: InquiryStatus): Promise<InquiryTicket> => {
    const res = await apiClient.patch(`/api/support/inquiries/${id}/status`, null, { params: { status } });
    return unwrap(res);
  },
  changeAsTicketStatus: async (id: number, status: AsTicketStatus): Promise<AsTicket> => {
    const res = await apiClient.patch(`/api/support/as-tickets/${id}/status`, null, { params: { status } });
    return unwrap(res);
  },
};
