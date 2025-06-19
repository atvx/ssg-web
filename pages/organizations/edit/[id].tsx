import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Form, Input, Select, Button, ConfigProvider, InputNumber, Alert, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { orgsAPI } from '@/lib/api';
import { OrgListItem, OrgDetail } from '@/types/api';

const { Option } = Select;

const EditOrganizationPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const orgId = typeof id === 'string' ? id : undefined;
  
  const [form] = Form.useForm();
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOrgType, setCurrentOrgType] = useState<number | undefined>(undefined);
  const [permissionError, setPermissionError] = useState<boolean>(false);

  // 检查用户权限
  const hasAdminPermission = user?.is_superuser === true;

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取组织列表
  useEffect(() => {
    const fetchOrgs = async () => {
      if (isAuthenticated) {
        try {
          const response = await orgsAPI.getOrgs();
          if (response.data.success && response.data.data) {
            setOrgs(response.data.data as OrgListItem[]);
          }
        } catch (err) {
          setError('获取组织列表失败');
        }
      }
    };

    fetchOrgs();
  }, [isAuthenticated]);

  // 获取组织详情
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (isAuthenticated && orgId) {
        try {
          setIsLoadingData(true);
          const response = await orgsAPI.getOrg(orgId);
          
          if (response.data.success && response.data.data) {
            const orgData = response.data.data as OrgDetail;
            setCurrentOrgType(orgData.org_type);
            form.setFieldsValue({
              org_id: orgData.id,
              org_name: orgData.name,
              org_type: orgData.org_type,
              parent_id: orgData.parent_id,
              sort: orgData.sort || 0
            });
          } else {
            setError('获取组织详情失败');
          }
        } catch (err) {
          setError('获取组织详情失败，请稍后再试');
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    if (orgId) {
      fetchOrgDetails();
    }
  }, [isAuthenticated, orgId, form]);

  // 根据选择的组织类型，过滤可选的父组织
  const getParentOptions = (selectedType?: number) => {
    if (!selectedType) return [];
    
    // 如果选择的是总部(1)，则没有父组织选项
    if (selectedType === 1) return [];
    
    // 如果选择的是市场(2)，则父组织只能是总部(1)
    if (selectedType === 2) {
      return orgs.filter(org => org.org_type === 1);
    }
    
    // 如果选择的是仓库(3)，则父组织只能是市场(2)
    if (selectedType === 3) {
      return orgs.filter(org => org.org_type === 2);
    }
    
    return [];
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    // 首先检查权限
    if (!hasAdminPermission) {
      setPermissionError(true);
      setError('权限不足，需要管理员权限');
      return;
    }

    if (!orgId) {
      setError('组织ID无效');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await orgsAPI.updateOrg(orgId, {
        name: values.org_name,
        org_type: values.org_type,
        parent_id: values.parent_id || undefined,
        sort: values.sort || 0
      });
      
      if (response.data.success) {
        // 更新成功，返回列表页
        router.push('/organizations');
      } else {
        setError(response.data.message || '更新组织失败');
      }
    } catch (err) {
      setError('更新组织失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  if (!orgId) {
    return (
      <Layout>
        <div className="py-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            无效的组织ID
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>编辑组织 | 销售助手</title>
        <meta name="description" content="编辑组织" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">编辑组织</h1>
            <Button 
              icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />} 
              onClick={() => router.push('/organizations')}
              className="btn btn-outline"
            >
              返回列表
            </Button>
          </div>

          {/* 权限提示 */}
          {!hasAdminPermission && (
            <Alert
              message="权限提示"
              description="更新组织需要管理员权限，请联系系统管理员获取权限。"
              type="warning"
              showIcon
              className="mb-6"
            />
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* 表单 */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              className="p-6"
              initialValues={{
                sort: 0
              }}
              disabled={isLoadingData}
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* 组织ID */}
                <Form.Item
                  name="org_id"
                  label="组织ID"
                  rules={[{ required: true, message: '请输入组织ID' }]}
                >
                  <Input placeholder="请输入组织ID" disabled />
                </Form.Item>

                {/* 组织名称 */}
                <Form.Item
                  name="org_name"
                  label="组织名称"
                  rules={[{ required: true, message: '请输入组织名称' }]}
                >
                  <Input placeholder="请输入组织名称" />
                </Form.Item>

                {/* 组织类型 */}
                <Form.Item
                  name="org_type"
                  label="组织类型"
                  rules={[{ required: true, message: '请选择组织类型' }]}
                >
                  <Select 
                    placeholder="请选择组织类型"
                    onChange={(value) => {
                      // 当组织类型变更时，清除父组织选择
                      setCurrentOrgType(value as number);
                      form.setFieldValue('parent_id', undefined);
                    }}
                    disabled={true} // 不允许修改组织类型
                  >
                    <Option value={1}>总部</Option>
                    <Option value={2}>市场</Option>
                    <Option value={3}>仓库</Option>
                  </Select>
                </Form.Item>

                {/* 父组织 */}
                <Form.Item
                  name="parent_id"
                  label="父组织"
                  rules={[
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const orgType = getFieldValue('org_type');
                        if (orgType === 2 || orgType === 3) {
                          if (!value) {
                            return Promise.reject('请选择父组织');
                          }
                        }
                        return Promise.resolve();
                      },
                    }),
                  ]}
                >
                  <Select
                    placeholder="请选择父组织"
                    disabled={!currentOrgType || currentOrgType === 1 || true} // 不允许修改父组织
                  >
                    {getParentOptions(currentOrgType).map(org => (
                      <Option key={org.org_id} value={org.org_id}>
                        {org.org_name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 排序 */}
                <Form.Item
                  name="sort"
                  label="排序"
                  rules={[{ required: true, message: '请输入排序值' }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    placeholder="请输入排序值" 
                    min={0}
                  />
                </Form.Item>
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end space-x-4 mt-6">
                <Button onClick={() => router.push('/organizations')}>
                  取消
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
                  disabled={!hasAdminPermission || isSubmitting}
                >
                  保存
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </ConfigProvider>
    </Layout>
  );
};

export default EditOrganizationPage; 