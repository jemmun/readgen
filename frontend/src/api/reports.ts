import client from './client';

export interface Report {
  id: number;
  reporter_id: number;
  target_type: string;
  target_id: number;
  reason?: string;
  status: string;
  created_at: string;
}

export interface CreateReportRequest {
  target_type: string;
  target_id: number;
  reason?: string;
}

export const reportsApi = {
  create: (data: CreateReportRequest) => client.post<Report>('/reports', data),
  getMine: () => client.get<Report[]>('/reports/mine'),
};
