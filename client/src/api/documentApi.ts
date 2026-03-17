import { apiClient, unwrap } from './client';

export type DocumentCategory = 'MANUAL' | 'NOTICE' | 'REPORT';

export interface Document {
  id: number;
  title: string;
  category: DocumentCategory;
  fileType: string;
  size: string;
  s3Url: string;
  uploader: string;
  brandId: number;
  description?: string;
  createdAt: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  s3Key: string;
}

export const documentApi = {
  getList: async (params?: { category?: DocumentCategory }): Promise<Document[]> => {
    const res = await apiClient.get('/api/documents', { params });
    return unwrap(res);
  },

  getById: async (id: number): Promise<Document> => {
    const res = await apiClient.get(`/api/documents/${id}`);
    return unwrap(res);
  },

  /** S3 Presigned URL 발급 */
  getPresignedUrl: async (fileName: string, contentType: string): Promise<PresignedUrlResponse> => {
    const res = await apiClient.post('/api/documents/presigned-url', { fileName, contentType });
    return unwrap(res);
  },

  /** S3 업로드 후 메타데이터 등록 */
  create: async (data: {
    title: string;
    category: DocumentCategory;
    s3Key: string;
    description?: string;
  }): Promise<Document> => {
    const res = await apiClient.post('/api/documents', data);
    return unwrap(res);
  },

  /** S3에 직접 PUT 업로드 */
  uploadToS3: async (presignedUrl: string, file: Blob, contentType: string): Promise<void> => {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType },
    });
    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
    }
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/documents/${id}`);
  },
};
