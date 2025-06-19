import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Form, Input, Select, Button, ConfigProvider, InputNumber, Alert, TreeSelect, message, Spin } from 'antd';
import { HomeOutlined, EnvironmentOutlined, ShopOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { orgsAPI } from '@/lib/api';
import { OrgListItem } from '@/types/api';

const { Option } = Select;

// 定义组织树节点类型
interface OrgTreeNode {
  title: string;
  value: string;
  key: string;
  icon?: React.ReactNode;
  children?: OrgTreeNode[];
  selectable?: boolean;
  org_type?: number; // 添加机构类型信息
}

const NewOrganizationPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [form] = Form.useForm();
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [treeData, setTreeData] = useState<OrgTreeNode[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>();
  const [orgTypeName, setOrgTypeName] = useState<string>(''); // 用于显示的机构类型名称
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);

  // 检查用户权限
  const hasAdminPermission = user?.is_superuser === true;

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 构建组织树结构数据
  const buildTreeData = (orgsData: OrgListItem[]) => {
    // 只查找类型为1(总部)和2(市场)的机构
    const validOrgs = orgsData.filter(org => org.org_type === 1 || org.org_type === 2);
    
    const buildChildren = (parentId: string): OrgTreeNode[] => {
      // 找到直接子节点
      const children = validOrgs
        .filter(org => org.parent_id === parentId)
        .sort((a, b) => (a.sort || 0) - (b.sort || 0))
        .map(org => {
          const hasChildren = validOrgs.some(child => child.parent_id === org.org_id);
          
          // 获取图标
          let icon;
          switch (org.org_type) {
            case 1:
              icon = <HomeOutlined />;
              break;
            case 2:
              icon = <EnvironmentOutlined />;
              break;
            default:
              icon = null;
          }
          
          return {
            title: org.org_name || org.org_id,
            value: org.org_id,
            key: org.org_id,
            icon,
            selectable: true,
            org_type: org.org_type,
            children: hasChildren ? buildChildren(org.org_id) : undefined,
          };
        });
      
      return children;
    };
    
    // 从总部开始构建树
    const headquarters = validOrgs.filter(org => org.org_type === 1);
    return headquarters
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map(hq => ({
        title: hq.org_name || hq.org_id,
        value: hq.org_id,
        key: hq.org_id,
        icon: <HomeOutlined />,
        selectable: true,
        org_type: hq.org_type,
        children: buildChildren(hq.org_id)
      }));
  };

  // 获取组织列表
  useEffect(() => {
    const fetchOrgs = async () => {
      if (isAuthenticated) {
        try {
          setIsLoadingData(true);
          const response = await orgsAPI.getOrgs();
          if (response.data.success && response.data.data) {
            const orgsData = response.data.data as OrgListItem[];
            setOrgs(orgsData);
            // 构建树形结构
            setTreeData(buildTreeData(orgsData));
          }
        } catch (err) {
          setError('获取机构列表失败');
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    fetchOrgs();
  }, [isAuthenticated]);

  // 获取机构类型名称
  const getOrgTypeName = (type?: number) => {
    switch (type) {
      case 1: return '总部';
      case 2: return '市场';
      case 3: return '仓库';
      default: return '';
    }
  };

  // 处理上级机构选择变更
  const handleParentChange = (value: string) => {
    setSelectedParentId(value);
    
    if (value) {
      // 查找所选机构的类型
      const selectedParent = orgs.find(org => org.org_id === value);
      if (selectedParent) {
        // 如果上级是总部(类型1)，则新机构是市场(类型2)
        // 如果上级是市场(类型2)，则新机构是仓库(类型3)
        const newOrgType = selectedParent.org_type === 1 ? 2 : 3;
        
        // 设置表单中的数字值
        form.setFieldValue('org_type', newOrgType);
        
        // 获取并设置显示用的中文名
        const typeName = getOrgTypeName(newOrgType);
        setOrgTypeName(typeName);
      }
    } else {
      // 如果清除上级机构选择，也清除机构类型
      form.setFieldValue('org_type', undefined);
      setOrgTypeName('');
    }
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    // 首先检查权限
    if (!hasAdminPermission) {
      setPermissionError(true);
      setError('权限不足，需要管理员权限');
      message.error('权限不足，需要管理员权限');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await orgsAPI.createOrg({
        id: values.org_id,
        name: values.org_name,
        org_type: values.org_type,
        parent_id: values.parent_id || undefined,
        sort: values.sort || 0
      });
      
      if (response.data.success) {
        // 显示成功消息
        message.success('机构创建成功！');
        // 创建成功，返回列表页
        router.push('/organizations');
      } else {
        message.error(response.data.message || '创建机构失败');
        setError(response.data.message || '创建机构失败');
      }
    } catch (err) {
      message.error('创建机构失败，请稍后再试');
      setError('创建机构失败，请稍后再试');
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

  return (
    <Layout>
      <Head>
        <title>新增机构 | 销售助手</title>
        <meta name="description" content="新增机构" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">新增机构</h1>
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
              description="创建机构需要管理员权限，请联系系统管理员获取权限。"
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
                org_type: undefined,
                sort: 0
              }}
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* 上级机构 */}
                <Form.Item
                  name="parent_id"
                  label="上级机构"
                  rules={[{ required: true, message: '请选择上级机构' }]}
                >
                  <TreeSelect
                    placeholder="请选择上级机构"
                    treeDefaultExpandAll
                    showSearch
                    allowClear
                    treeData={treeData}
                    styles={{
                      popup: {
                        root: {
                          maxHeight: 400,
                          overflow: 'auto'
                        }
                      }
                    }}
                    filterTreeNode={(input, node) => 
                      (node?.title as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                    onChange={handleParentChange}
                    treeIcon
                    treeLine
                  />
                </Form.Item>

                {/* 机构类型 - 仅用于展示中文，实际数值存在form中 */}
                <Form.Item
                  label="机构类型"
                  required
                >
                  <div style={{ position: 'relative' }}>
                    <Input
                      placeholder="请先选择上级机构"
                      disabled
                      value={orgTypeName}
                      readOnly
                    />
                    <Form.Item 
                      name="org_type"
                      noStyle
                      rules={[{ required: true, message: '请选择上级机构以确定机构类型' }]}
                    >
                      <Input type="hidden" />
                    </Form.Item>
                  </div>
                </Form.Item>

                {/* 机构ID */}
                <Form.Item
                  name="org_id"
                  label="机构ID"
                  rules={[{ required: true, message: '请输入机构ID' }]}
                >
                  <Input placeholder="请输入机构ID" />
                </Form.Item>

                {/* 机构名称 */}
                <Form.Item
                  name="org_name"
                  label="机构名称"
                  rules={[{ required: true, message: '请输入机构名称' }]}
                >
                  <Input placeholder="请输入机构名称" />
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

export default NewOrganizationPage; 