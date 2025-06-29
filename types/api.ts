// 通用API响应类型
export interface APIResponse<T = any> {
  code: number;
  success: boolean;
  message: string;
  data: T | null;
  total?: number;
}

// 认证相关类型
export interface UserCreate {
  username: string;
  mobile?: string;
  password: string;
}

export interface Login {
  username: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserInfo {
  id: number;
  username: string;
  mobile: string;
  is_active: boolean;
  is_superuser: boolean;
}

export interface UserUpdate {
  username?: string;
  mobile?: string;
  password?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface UserUpdateInfo {
  id: number;
  username: string;
  mobile: string;
}

export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
}

export interface VerificationResponse {
  task_id: string;
  status: string;
  message: string;
  data: Record<string, any>;
}

// 销售记录相关类型
export interface SalesRecord {
  id: number;
  date: string;
  platform: string;
  warehouse_name: string;
  income_amt: string;
  sales_cart_count: number;
  avg_income_amt: string;
  created_at: string;
  updated_at: string;
}

export interface SalesRecordCreate {
  date: string;
  platform: string;
  warehouse_name: string;
  income_amt: string;
  sales_cart_count: number;
  avg_income_amt?: string;
}

export interface SalesRecordUpdate {
  date?: string;
  platform?: string;
  warehouse_name?: string;
  income_amt?: string;
  sales_cart_count?: number;
  avg_income_amt?: string;
}

export interface SalesRecordListResponse {
  items: SalesRecord[];
  total: number;
  current?: number;
  pageSize?: number;
}

// 销售目标相关类型
export interface MonthlySalesTarget {
  id?: number;
  org_id: string;
  year: number;
  month: number;
  target_income: number;
  car_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlySalesTargetCreate {
  org_id: string;
  org_name?: string;
  year: number;
  month: number;
  target_income: number;
  car_count?: number;
}

export interface MonthlySalesTargetUpdate {
  org_id?: string;
  org_name?: string;
  year?: number;
  month?: number;
  target_income?: number;
  car_count?: number;
}

export interface SalesTargetProgress {
  org_id: string;
  org_name?: string;
  year: number;
  month: number;
  target_income: number;
  actual_income: number;
  completion_rate: number;
  remaining_days: number;
  daily_target: number;
}

// 组织机构相关类型
export interface OrgCreate {
  id: string;
  name: string;
  org_type?: number;
  parent_id?: string;
  sort?: number;
}

export interface OrgUpdate {
  name?: string;
  org_type?: number;
  parent_id?: string;
  sort?: number;
}

export interface OrgDetail {
  id: string;
  name?: string;
  org_type?: number;
  parent_id?: string;
  sort?: number;
}

export interface OrgListItem {
  org_id: string;
  org_name?: string;
  org_type?: number;
  parent_id?: string;
  sort?: number;
}

// 任务相关类型
export interface Task {
  id: number;
  user_id: number;
  task_type: string;
  status: string;
  progress?: number;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
  params?: string;
}

// 销售数据相关类型
export interface SalesData {
  date: string;
  platform: string;
  amount: number;
  count: number;
  details: any[];
} 