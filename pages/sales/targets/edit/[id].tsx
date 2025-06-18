import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Form, Input, Select, DatePicker, Button, ConfigProvider, InputNumber } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI, orgsAPI } from '@/lib/api';
import { OrgListItem, MonthlySalesTarget } from '@/types/api';

// 设置 dayjs 为中文
dayjs.locale('zh-cn');

const EditTargetPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const targetId = typeof id === 'string' ? parseInt(id) : undefined;
  
  const [form] = Form.useForm();
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取机构列表
  useEffect(() => {
    const fetchOrgs = async () => {
      if (isAuthenticated) {
        try {
          const response = await orgsAPI.getOrgs({ type: '2,3' });
          if (response.data.success && response.data.data) {
            setOrgs(response.data.data as OrgListItem[]);
          }
        } catch (err) {
          setError('获取机构列表失败');
        }
      }
    };

    fetchOrgs();
  }, [isAuthenticated]);

  // 获取目标详情
  useEffect(() => {
    const fetchTargetDetails = async () => {
      if (isAuthenticated && targetId) {
        try {
          setIsLoadingData(true);
          const response = await salesAPI.getSalesTarget(targetId);
          
          if (response.data.success && response.data.data) {
            const targetData = response.data.data as MonthlySalesTarget;
            form.setFieldsValue({
              org_id: targetData.org_id,
              date: dayjs(`${targetData.year}-${targetData.month.toString().padStart(2, '0')}-01`),
              target_income: targetData.target_income,
              car_count: targetData.car_count || 0
            });
          } else {
            setError('获取月目标详情失败');
          }
        } catch (err) {
          setError('获取月目标详情失败，请稍后再试');
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    if (targetId) {
      fetchTargetDetails();
    }
  }, [isAuthenticated, targetId, form]);

  // 按父子关系对机构列表进行分组
  const groupOrgsByParent = () => {
    // 获取所有市场（父机构，类型为2）
    const parentOrgs = orgs.filter(org => org.org_type === 2);
    
    // 创建一个映射，key为父机构ID，value为该父机构下的所有子机构
    const orgGroups: { [key: string]: {parent: OrgListItem, children: OrgListItem[]} } = {};
    
    // 初始化映射
    parentOrgs.forEach(parentOrg => {
      orgGroups[parentOrg.org_id] = {
        parent: parentOrg,
        children: []
      };
    });
    
    // 将子机构添加到对应的父机构下
    orgs.forEach(org => {
      // 如果是子机构（类型为3）并且其父机构在我们的映射中
      if (org.org_type === 3 && org.parent_id && orgGroups[org.parent_id]) {
        orgGroups[org.parent_id].children.push(org);
      }
    });
    
    // 按照父机构的sort属性排序
    const sortedGroups = Object.values(orgGroups).sort((a, b) => 
      (a.parent.sort || 0) - (b.parent.sort || 0)
    );
    
    // 每个组内的子机构也按照sort属性排序
    sortedGroups.forEach(group => {
      group.children.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    });
    
    return sortedGroups;
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    if (!targetId) {
      setError('目标ID无效');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const date = values.date;
      const year = date.$y;
      const month = date.$M + 1; // dayjs月份是0-11，需要+1

      // 获取选中组织的名称
      const selectedOrg = orgs.find(org => org.org_id === values.org_id);
      const org_name = selectedOrg?.org_name || '';

      const response = await salesAPI.updateSalesTarget(targetId, {
        org_id: values.org_id,
        org_name: org_name,
        year,
        month,
        target_income: values.target_income,
        car_count: values.car_count || 0
      });
      
      if (response.data.success) {
        // 更新成功，返回列表页
        router.push('/sales/targets');
      } else {
        setError(response.data.message || '更新月目标失败');
      }
    } catch (err) {
      setError('更新月目标失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const orgGroups = groupOrgsByParent();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  if (!targetId) {
    return (
      <Layout>
        <div className="py-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            无效的目标ID
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>编辑月目标 | 销售助手</title>
        <meta name="description" content="编辑月目标" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">编辑月目标</h1>
            <Button 
              icon={<ArrowLeftIcon className="h-5 w-5 mr-1" />} 
              onClick={() => router.push('/sales/targets')}
              className="btn btn-outline"
            >
              返回列表
            </Button>
          </div>

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
                car_count: 0
              }}
              disabled={isLoadingData}
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* 年月 */}
                <Form.Item
                  name="date"
                  label="年月"
                  rules={[{ required: true, message: '请选择年月' }]}
                >
                  <DatePicker 
                    picker="month" 
                    style={{ width: '100%' }}
                    format="YYYY年MM月"
                    disabled={true}
                  />
                </Form.Item>
                
                {/* 仓库 */}
                <Form.Item
                  name="org_id"
                  label="仓库"
                  rules={[{ required: true, message: '请选择机构' }]}
                >
                  <Select
                    placeholder="请选择仓库"
                    loading={isLoadingData}
                    disabled={true}
                  >
                    {orgGroups.map(group => (
                      <Select.OptGroup key={group.parent.org_id} label={group.parent.org_name}>
                        {/* 仓库 */}
                        {group.children.map(child => (
                          <Select.Option key={child.org_id} value={child.org_id}>
                            {child.org_name}
                          </Select.Option>
                        ))}
                      </Select.OptGroup>
                    ))}
                  </Select>
                </Form.Item>

                {/* 目标金额 */}
                <Form.Item
                  name="target_income"
                  label="目标金额"
                  rules={[{ required: true, message: '请输入目标金额' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={1000}
                    prefix="¥"
                    placeholder="请输入目标金额"
                  />
                </Form.Item>

                {/* 车辆配置 */}
                <Form.Item
                  name="car_count"
                  label="车辆配置"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={1}
                    placeholder="请输入车辆配置数量"
                  />
                </Form.Item>
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={() => router.push('/sales/targets')}
                  className="mr-3"
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
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

export default EditTargetPage; 