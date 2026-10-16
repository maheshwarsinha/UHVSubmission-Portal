import axios from 'axios';
import { AssignmentConfig, ExpectedFilenames, StagedFile, SubmissionReceipt, AdminMetrics, FolderVerificationResult } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Admin JWT token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('uhv_admin_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  // Public Assignment Guidelines
  async getAssignmentInfo(): Promise<AssignmentConfig> {
    const res = await api.get('/system/assignment-info');
    return res.data;
  },

  // Filename preview and validation
  async getExpectedFilenames(roll_number: string, section: string, name: string, category: string = 'Regular'): Promise<ExpectedFilenames> {
    const res = await api.post('/uploads/expected-filenames', { roll_number, section, name, category });
    return res.data;
  },

  async validateFilename(roll_number: string, section: string, name: string, uploaded_filename: string, file_type: string, category: string = 'Regular') {
    const res = await api.post('/uploads/validate-filename', {
      roll_number,
      section,
      name,
      uploaded_filename,
      file_type,
      category,
    });
    return res.data;
  },

  async verifyDriveFolder(payload: {
    folder_url: string;
    roll_number: string;
    section: string;
    name: string;
    category?: string;
  }): Promise<FolderVerificationResult> {
    const res = await api.post('/uploads/verify-drive-folder', payload);
    return res.data;
  },

  async verifyDriveLink(url: string, file_type: string): Promise<{
    url: string;
    file_type: string;
    is_valid: boolean;
    file_id: string | null;
    status: 'ACCESSIBLE' | 'RESTRICTED' | 'INVALID' | 'NOT_FOUND';
    clean_url?: string;
    message: string;
  }> {
    const res = await api.post('/uploads/verify-drive-link', { url, file_type });
    return res.data;
  },

  async transferSingleFile(submissionId: string, fileId: string) {
    const res = await api.post(`/admin/submissions/${submissionId}/transfer-file/${fileId}`);
    return res.data;
  },

  // Chunked Upload
  async uploadChunk(formData: FormData, onUploadProgress?: (progressEvent: any) => void) {
    const res = await api.post('/uploads/upload-chunk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
      timeout: 120000,
    });
    return res.data;
  },

  async assembleFile(payload: {
    upload_id: string;
    total_chunks: number;
    target_filename: string;
    file_type: string;
    roll_number: string;
    section: string;
    name: string;
    category?: string;
  }) {
    const res = await api.post('/uploads/assemble-file', payload);
    return res.data;
  },

  async checkRollSubmission(rollNumber: string): Promise<{ already_submitted: boolean; tracking_id?: string; student_name?: string }> {
    const res = await api.get(`/submissions/check-roll/${encodeURIComponent(rollNumber.trim())}`);
    return res.data;
  },

  // Final Student Submission
  async submitAssignment(payload: any): Promise<SubmissionReceipt> {
    const res = await api.post('/submissions', payload);
    return res.data;
  },

  async getReceipt(trackingId: string): Promise<SubmissionReceipt> {
    const res = await api.get(`/submissions/${trackingId}`);
    return res.data;
  },

  // Admin API
  async resetAllData(): Promise<{ success: boolean; message: string; drive_items_deleted: number }> {
    const res = await api.delete('/admin/reset-all-data');
    return res.data;
  },

  async adminLogin(username: string, password: string) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const res = await api.post('/auth/login', formData);
    return res.data;
  },

  async getAdminMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async getMetrics(): Promise<AdminMetrics> {
    const res = await api.get('/admin/metrics');
    return res.data;
  },

  async getSubmissions(params?: any) {
    const res = await api.get('/admin/submissions', { params });
    return res.data;
  },

  async getSubmissionDetail(id: string) {
    const res = await api.get(`/admin/submissions/${id}`);
    return res.data;
  },

  async retryJob(jobId: string) {
    const res = await api.post(`/admin/jobs/${jobId}/retry`);
    return res.data;
  },

  async getSettings() {
    const res = await api.get('/admin/settings');
    return res.data;
  },

  async updateSettings(payload: any) {
    const res = await api.put('/admin/settings', payload);
    return res.data;
  },

  async triggerDriveUpload(submissionId: string) {
    const res = await api.post(`/admin/submissions/${submissionId}/upload-drive`);
    return res.data;
  },

  getCsvExportUrl(filters: { section?: string; branch?: string; category?: string; deadline_status?: string; search?: string; sort_by?: string; sort_order?: string } = {}) {
    const params = new URLSearchParams();
    const token = localStorage.getItem('uhv_admin_token');
    if (token) params.append('token', token);
    if (filters.section) params.append('section', filters.section);
    if (filters.branch) params.append('branch', filters.branch);
    if (filters.category) params.append('category', filters.category);
    if (filters.deadline_status) params.append('deadline_status', filters.deadline_status);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);
    const qs = params.toString();
    return `/api/v1/admin/export-csv${qs ? `?${qs}` : ''}`;
  },

  getExcelExportUrl(filters: { section?: string; branch?: string; category?: string; deadline_status?: string; search?: string; sort_by?: string; sort_order?: string } = {}) {
    const params = new URLSearchParams();
    const token = localStorage.getItem('uhv_admin_token');
    if (token) params.append('token', token);
    if (filters.section) params.append('section', filters.section);
    if (filters.branch) params.append('branch', filters.branch);
    if (filters.category) params.append('category', filters.category);
    if (filters.deadline_status) params.append('deadline_status', filters.deadline_status);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_order) params.append('sort_order', filters.sort_order);
    const qs = params.toString();
    return `/api/v1/admin/export-excel${qs ? `?${qs}` : ''}`;
  },

  async exportExcelBlob(filters: {
    section?: string;
    branch?: string;
    category?: string;
    deadline_status?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  } = {}): Promise<{ blob: Blob; filename: string }> {
    const res = await api.get('/admin/export-excel', {
      params: filters,
      responseType: 'blob',
    });
    const disposition = res.headers['content-disposition'];
    let filename = `uhv_submissions_${Date.now()}.xlsx`;
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    return { blob: res.data, filename };
  },

  async exportCsvBlob(filters: {
    section?: string;
    branch?: string;
    category?: string;
    deadline_status?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  } = {}): Promise<{ blob: Blob; filename: string }> {
    const res = await api.get('/admin/export-csv', {
      params: filters,
      responseType: 'blob',
    });
    const disposition = res.headers['content-disposition'];
    let filename = `uhv_submissions_${Date.now()}.csv`;
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }
    return { blob: res.data, filename };
  },

  async getNetworkInfo(): Promise<{ wifi_ip: string; portal_url: string; port: number }> {
    const res = await api.get('/system/network-info');
    return res.data;
  },

  async updateNetworkInfo(wifi_ip: string) {
    const res = await api.post('/system/network-info', { wifi_ip });
    return res.data;
  }
};
