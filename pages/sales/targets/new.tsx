import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Form, Input, Select, DatePicker, Button, ConfigProvider, InputNumber, Alert, Spin, Card, Divider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI, orgsAPI } from '@/lib/api';
import { OrgListItem } from '@/types/api';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';

// 设置 dayjs 为中文
dayjs.locale('zh-cn');

// 判断是否为移动设备的Hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 初始检查
    checkIsMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkIsMobile);
    
    // 清理函数
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  return isMobile;
};

const NewTargetPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [form] = Form.useForm();
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<boolean>(false);
  const isMobile = useIsMobile();

  // 检查用户权限
  const hasAdminPermission = user?.is_superuser === true;

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取机构列表
  useEffect(() => {
    const fetchOrgs = async () => {
      if (isAuthenticated) {
        try {
          setIsLoadingData(true);
          const response = await orgsAPI.getOrgs({ type: '2,3' });
          if (response.data.success && response.data.data) {
            setOrgs(response.data.data as OrgListItem[]);
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
    // 首先检查权限
    if (!hasAdminPermission) {
      setPermissionError(true);
      setError('权限不足，需要管理员权限');
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

      const response = await salesAPI.createSalesTarget({
        org_id: values.org_id,
        org_name: org_name,
        year,
        month,
        target_income: values.target_income,
        car_count: values.car_count || 0
      });
      
      if (response.data.success) {
        // 创建成功，返回列表页
        router.push('/sales/targets');
      } else {
        setError(response.data.message || '创建月目标失败');
      }
    } catch (err) {
      setError('创建月目标失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const orgGroups = groupOrgsByParent();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  return (
    <Layout>
      <Head>
        <title>新增月目标 | 销售助手</title>
        <meta name="description" content="新增月目标" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className={`${isMobile ? 'px-4 py-4' : 'py-6'}`}>
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'} mb-6`}>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>
              新增月目标
            </h1>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => router.push('/sales/targets')}
              size={isMobile ? "large" : "middle"}
              className={`${isMobile ? 'w-full' : ''} rounded-lg`}
            >
              返回列表
            </Button>
          </div>
          
          {/* 权限提示 */}
          {!hasAdminPermission && (
            <Alert
              message="权限提示"
              description="创建月目标需要管理员权限，请联系系统管理员获取权限。"
              type="warning"
              showIcon
              className="mb-6 rounded-lg"
            />
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* 表单 */}
          <Card className={`${isMobile ? 'shadow-sm' : 'shadow'} rounded-xl`}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                date: dayjs(),
                target_income: 0,
                car_count: 0
              }}
            >
              {/* 基础信息 */}
              {isMobile && (
                <>
                  <div className="text-base font-medium text-gray-900 mb-4">基础信息</div>
                  <Divider className="my-4" />
                </>
              )}
              
              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 gap-6 md:grid-cols-2'}`}>
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
                    size={isMobile ? "large" : "middle"}
                    placeholder="选择年月"
                  />
                </Form.Item>
                
                {/* 仓库 */}
                <Form.Item
                  name="org_id"
                  label="仓库"
                  rules={[{ required: true, message: '请选择机构' }]}
                  className={isMobile ? "md:col-span-2" : ""}
                >
                  <Select
                    placeholder="请选择仓库"
                    loading={isLoadingData}
                    size={isMobile ? "large" : "middle"}
                    showSearch
                    optionFilterProp="children"
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
              </div>

              {/* 目标设置 */}
              {isMobile && (
                <>
                  <div className="text-base font-medium text-gray-900 mb-4 mt-6">目标设置</div>
                  <Divider className="my-4" />
                </>
              )}

              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 gap-6 md:grid-cols-2'}`}>
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
                    placeholder="请输入目标金额"
                    size={isMobile ? "large" : "middle"}
                    formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value: string | undefined) => value ? parseFloat(value.replace(/\¥\s?|(,*)/g, '')) : 0}
                  />
                </Form.Item>

                {/* 车辆配置 */}
                <Form.Item
                  name="car_count"
                  label="车辆配置"
                  extra="可选，用于计算平均指标"
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={1}
                    placeholder="请输入车辆配置数量"
                    size={isMobile ? "large" : "middle"}
                  />
                </Form.Item>
              </div>

              <div className={`${isMobile ? 'mt-8 flex flex-col gap-3' : 'mt-6 flex justify-end'}`}>
                <Button
                  onClick={() => router.push('/sales/targets')}
                  size={isMobile ? "large" : "middle"}
                  className={`${isMobile ? 'w-full' : 'mr-3'} rounded-lg`}
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
                  disabled={!hasAdminPermission || permissionError}
                  size={isMobile ? "large" : "middle"}
                  className={`${isMobile ? 'w-full' : ''} rounded-lg`}
                  icon={<SaveOutlined />}
                >
                  保存目标
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      </ConfigProvider>
    </Layout>
  );
};

export default NewTargetPage; 