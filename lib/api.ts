import axios, { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { APIResponse, Login, UserCreate, UserUpdate, PasswordChangeRequest, MonthlySalesTargetCreate, MonthlySalesTargetUpdate, OrgCreate, OrgUpdate, SalesRecordCreate, SalesRecordUpdate } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 创建用于报表导出的特殊axios实例（更长超时时间）
const exportApiClient = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2分钟超时，用于报表导出
  headers: {
    'Content-Type': 'application/json',
  },
});

// 创建用于数据同步的特殊axios实例（超长超时时间）
const syncApiClient = axios.create({
  baseURL: API_URL,
  timeout: 360000, // 6分钟超时，用于数据同步
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器，添加token到请求头
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器，处理错误
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 检查是否是验证码相关的API响应
    const url = response.config.url || '';
    if (url.includes('/verification/')) {
      // 不显示验证码相关的任何提示，直接返回响应
      return response;
    }
    return response;
  },
  (error: AxiosError) => {
    // 拦截验证码相关的错误
    const url = error.config?.url || '';
    if (url.includes('/verification/')) {
      // 不显示验证码相关的错误提示，直接返回错误
      return Promise.reject(error);
    }
    
    // 处理401未授权错误
    if (error.response && error.response.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 为导出API客户端也添加拦截器
exportApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

exportApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // 处理401未授权错误
    if (error.response && error.response.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 为数据同步API客户端也添加拦截器
syncApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

syncApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // 处理401未授权错误
    if (error.response && error.response.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 认证相关API
export const authAPI = {
  // 用户注册
  register: (data: UserCreate) => {
    return apiClient.post<APIResponse>('/api/auth/register', data);
  },
  
  // 用户登录
  login: (data: Login) => {
    return apiClient.post<APIResponse>('/api/auth/login', data);
  },
  
  // 获取当前用户信息
  getCurrentUser: () => {
    return apiClient.get<APIResponse>('/api/auth/me');
  },
  
  // 更新当前用户信息
  updateCurrentUser: (data: UserUpdate) => {
    return apiClient.put<APIResponse>('/api/auth/me', data);
  },
  
  // 修改密码
  changePassword: (data: PasswordChangeRequest) => {
    return apiClient.post<APIResponse>('/api/auth/change-password', data);
  },
  
  // 获取验证任务状态
  getVerificationStatus: (taskId: string) => {
    return apiClient.get<APIResponse>(`/api/auth/verification/${taskId}`);
  },
  
  // 提交验证码
  submitVerificationCode: (taskId: string, code: string) => {
    return apiClient.post<APIResponse>(`/api/auth/verification/${taskId}/submit`, { code });
  },
};

// 销售数据相关API
export const salesAPI = {
  // 获取销售数据
  fetchData: (params?: { date?: string; platform?: string; user_id?: number; sync?: boolean }) => {
    // 如果是同步请求，使用专门的长超时客户端
    const client = params?.sync ? syncApiClient : apiClient;
    return client.get<APIResponse>('/api/sales/fetch', { params });
  },
  
  // 获取销售目标列表
  getSalesTargets: (params?: { skip?: number; limit?: number; org_id?: string; year?: number; month?: number }) => {
    return apiClient.get<APIResponse>('/api/sales/targets', { params });
  },
  
  // 获取单个销售目标详情
  getSalesTarget: (targetId: number) => {
    return apiClient.get<APIResponse>(`/api/sales/targets/${targetId}`);
  },
  
  // 创建销售目标
  createSalesTarget: (data: MonthlySalesTargetCreate) => {
    return apiClient.post<APIResponse>('/api/sales/targets', data);
  },
  
  // 更新销售目标
  updateSalesTarget: (targetId: number, data: MonthlySalesTargetUpdate) => {
    return apiClient.put<APIResponse>(`/api/sales/targets/${targetId}`, data);
  },
  
  // 删除销售目标
  deleteSalesTarget: (targetId: number) => {
    return apiClient.delete<APIResponse>(`/api/sales/targets/${targetId}`);
  },

  // 获取销售记录列表
  getSalesRecords: (params?: { skip?: number; limit?: number; org_id?: string; start_date?: string; end_date?: string; status?: string }) => {
    return apiClient.get<APIResponse>('/api/sales/records', { params });
  },
  
  // 获取单个销售记录详情
  getSalesRecord: (recordId: number) => {
    return apiClient.get<APIResponse>(`/api/sales/records/${recordId}`);
  },
  
  // 创建销售记录
  createSalesRecord: (data: SalesRecordCreate) => {
    return apiClient.post<APIResponse>('/api/sales/records', data);
  },
  
  // 更新销售记录
  updateSalesRecord: (recordId: number, data: SalesRecordUpdate) => {
    return apiClient.put<APIResponse>(`/api/sales/records/${recordId}`, data);
  },
  
  // 删除销售记录
  deleteSalesRecord: (recordId: number) => {
    return apiClient.delete<APIResponse>(`/api/sales/records/${recordId}`);
  },
  
  // 导出日报
  exportDailyReport: (params?: { date?: string; file_type?: 'excel' | 'pdf' | 'png' }) => {
    return exportApiClient.get<APIResponse>('/api/sales/daily/export', { params });
  },
  
  // 获取周度统计数据
  getWeeklyStats: (params?: { query_date?: string }) => {
    return apiClient.get<APIResponse>('/api/sales/weekly-stats', { params });
  },

  // 获取月度统计数据
  getMonthlyStats: (params?: { query_date?: string }) => {
    return apiClient.get<APIResponse>('/api/sales/monthly-stats', { params });
  },

  // 获取销售记录统计数据
  getSalesRecordsStats: (params?: { query_date?: string }) => {
    return apiClient.get<APIResponse>('/api/sales/sales-records-stats', { params });
  },
};

// 任务相关API
export const tasksAPI = {
  // 获取任务列表
  getTasks: (params?: { skip?: number; limit?: number }) => {
    return apiClient.get<APIResponse>('/api/tasks', { params });
  },
  
  // 获取任务详情
  getTask: (taskId: number) => {
    return apiClient.get<APIResponse>(`/api/tasks/${taskId}`);
  },
  
  // 删除任务
  deleteTask: (taskId: number) => {
    return apiClient.delete<APIResponse>(`/api/tasks/${taskId}`);
  },
  
  // 获取任务状态
  getTaskStatus: (taskId: number) => {
    return apiClient.get<APIResponse>(`/api/tasks/${taskId}/status`);
  },
  
  // 执行任务
  executeTask: (taskId: number) => {
    return apiClient.post<APIResponse>(`/api/tasks/execute/${taskId}`);
  },
};

// 组织机构相关API
export const orgsAPI = {
  // 获取机构列表
  getOrgs: (params?: { skip?: number; limit?: number; type?: string }) => {
    return apiClient.get<APIResponse>('/api/orgs/list', { params });
  },
  
  // 获取机构详情
  getOrg: (orgId: string) => {
    return apiClient.get<APIResponse>(`/api/orgs/${orgId}`);
  },
  
  // 创建机构
  createOrg: (data: OrgCreate) => {
    return apiClient.post<APIResponse>('/api/orgs', data);
  },
  
  // 更新机构
  updateOrg: (orgId: string, data: OrgUpdate) => {
    return apiClient.put<APIResponse>(`/api/orgs/${orgId}`, data);
  },
  
  // 删除机构
  deleteOrg: (orgId: string) => {
    return apiClient.delete<APIResponse>(`/api/orgs/${orgId}`);
  },
};

export default apiClient; 