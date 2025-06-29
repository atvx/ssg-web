import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Spin, 
  message, 
  InputNumber, 
  ConfigProvider,
  DatePicker,
  Card,
  Divider
} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI, orgsAPI } from '@/lib/api';
import { SalesRecord, SalesRecordUpdate, OrgListItem } from '@/types/api';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const { Option, OptGroup } = Select;

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

const EditSalesRecordPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const recordId = parseInt(id as string);
  
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<SalesRecord | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(true);
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const isMobile = useIsMobile();

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

  // 根据org_id获取org_name
  const getOrgNameById = (orgId: string) => {
    const org = orgs.find(org => org.org_id === orgId);
    return org ? org.org_name : '';
  };

  // 根据仓库名称查找对应的机构ID
  const findOrgIdByWarehouseName = (warehouseName: string) => {
    const org = orgs.find(org => org.org_name === warehouseName);
    return org ? org.org_id : undefined;
  };

  // 获取销售记录详情
  useEffect(() => {
    const fetchRecord = async () => {
      if (isAuthenticated && recordId) {
        try {
          setIsLoadingRecord(true);
          const response = await salesAPI.getSalesRecord(recordId);
          if (response.data.success && response.data.data) {
            const recordData = response.data.data as SalesRecord;
            setRecord(recordData);
            
            // 等待机构数据加载完成后再填充表单
            if (orgs.length > 0) {
              // 尝试根据仓库名称找到对应的机构ID
              const orgId = findOrgIdByWarehouseName(recordData.warehouse_name);
              
              // 填充表单
              form.setFieldsValue({
                date: dayjs(recordData.date),
                platform: recordData.platform,
                org_id: orgId, // 如果找到了对应的机构ID，则使用它
                warehouse_name: orgId ? undefined : recordData.warehouse_name, // 如果没找到对应的机构ID，则保留原始值
                income_amt: parseFloat(recordData.income_amt),
                sales_cart_count: recordData.sales_cart_count,
                avg_income_amt: parseFloat(recordData.avg_income_amt)
              });
            }
          } else {
            setError('获取销售记录详情失败');
          }
        } catch (err) {
          setError('获取销售记录详情失败，请稍后再试');
        } finally {
          setIsLoadingRecord(false);
        }
      }
    };

    fetchRecord();
  }, [isAuthenticated, recordId, form, orgs.length]);

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);
      
      // 处理日期格式
      const formattedValues = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        // 确保数字类型字段正确处理
        income_amt: values.income_amt.toString(),
        sales_cart_count: Number(values.sales_cart_count),
        // 如果选择的是机构ID，转换为机构名称
        warehouse_name: values.org_id ? getOrgNameById(values.org_id) : values.warehouse_name,
        // 如果车均没有填写，自动计算
        avg_income_amt: values.avg_income_amt 
          ? values.avg_income_amt.toString()
          : values.sales_cart_count > 0 
            ? (values.income_amt / values.sales_cart_count).toFixed(2)
            : '0.00'
      };

      // 删除临时字段
      delete formattedValues.org_id;

      const response = await salesAPI.updateSalesRecord(recordId, formattedValues);
      if (response.data.success) {
        message.success('销售记录更新成功');
        router.push('/sales/data');
      } else {
        setError(response.data.message || '更新失败，请稍后重试');
      }
    } catch (err) {
      setError('更新销售记录失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isLoadingRecord) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  if (!record && !isLoadingRecord) {
    return (
      <Layout>
        <div className={`${isMobile ? 'px-4 py-4' : 'py-6'}`}>
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center'} mb-6`}>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => router.back()}
              size={isMobile ? "large" : "middle"}
              className={isMobile ? "w-full" : "mr-4"}
            >
              返回
            </Button>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>
              销售记录不存在
            </h1>
          </div>
          <Card className={`${isMobile ? 'shadow-sm' : 'shadow'} rounded-xl text-center`}>
            <p className="text-gray-500 mb-4">未找到该销售记录或已被删除</p>
            <Button 
              type="primary" 
              onClick={() => router.push('/sales/data')}
              size={isMobile ? "large" : "middle"}
              className={`${isMobile ? 'w-full' : ''} rounded-lg`}
            >
              返回列表
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  const orgGroups = groupOrgsByParent();

  return (
    <Layout>
      <Head>
        <title>编辑销售记录 | 销售助手</title>
        <meta name="description" content="编辑销售记录" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className={`${isMobile ? 'px-4 py-4' : 'py-6'}`}>
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'} mb-6`}>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>
              编辑销售记录
            </h1>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={() => router.back()}
              size={isMobile ? "large" : "middle"}
              className={isMobile ? "w-full" : ""}
            >
              返回
            </Button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Card className={`${isMobile ? 'shadow-sm' : 'shadow'} rounded-xl`}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              {/* 基础信息 */}
              {isMobile && (
                <>
                  <div className="text-base font-medium text-gray-900 mb-4">基础信息</div>
                  <Divider className="my-4" />
                </>
              )}
              
              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2'}`}>
                <Form.Item
                  name="date"
                  label="日期"
                  rules={[{ required: true, message: '请选择日期' }]}
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                    size={isMobile ? "large" : "middle"}
                    placeholder="选择日期"
                  />
                </Form.Item>

                <Form.Item
                  name="platform"
                  label="平台"
                  rules={[{ required: true, message: '请选择平台' }]}
                >
                  <Select 
                    placeholder="请选择平台"
                    size={isMobile ? "large" : "middle"}
                  >
                    <Option value="duowei">多维</Option>
                    <Option value="meituan">美团</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="org_id"
                  label="仓库"
                  rules={[{ required: true, message: '请选择仓库' }]}
                  className={isMobile ? "md:col-span-2" : ""}
                >
                  <Select
                    disabled
                    placeholder="选择仓库"
                    style={{ width: '100%' }}
                    size={isMobile ? "large" : "middle"}
                  >
                    {orgGroups.map(group => (
                      <OptGroup key={group.parent.org_id} label={group.parent.org_name}>
                        {/* 仓库 */}
                        {group.children.map(child => (
                          <Option key={child.org_id} value={child.org_id}>
                            {child.org_name}
                          </Option>
                        ))}
                      </OptGroup>
                    ))}
                  </Select>
                </Form.Item>
              </div>

              {/* 销售数据 */}
              {isMobile && (
                <>
                  <div className="text-base font-medium text-gray-900 mb-4 mt-6">销售数据</div>
                  <Divider className="my-4" />
                </>
              )}

              <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2'}`}>
                <Form.Item
                  name="income_amt"
                  label="营业额"
                  rules={[{ required: true, message: '请输入营业额' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="输入营业额"
                    min={0}
                    precision={2}
                    size={isMobile ? "large" : "middle"}
                    formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value: string | undefined) => value ? parseFloat(value.replace(/\¥\s?|(,*)/g, '')) : 0}
                  />
                </Form.Item>

                <Form.Item
                  name="sales_cart_count"
                  label="车次"
                  rules={[{ required: true, message: '请输入车次数量' }]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="输入车次数量" 
                    min={0}
                    precision={0}
                    size={isMobile ? "large" : "middle"}
                  />
                </Form.Item>

                <Form.Item
                  name="avg_income_amt"
                  label="车均"
                  extra="留空将自动计算"
                  className={isMobile ? "md:col-span-2" : ""}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    placeholder="输入车均金额（可选）"
                    min={0}
                    precision={2}
                    size={isMobile ? "large" : "middle"}
                    formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                    parser={(value: string | undefined) => value ? parseFloat(value.replace(/\¥\s?|(,*)/g, '')) : 0}
                  />
                </Form.Item>
              </div>

              <Form.Item className={`${isMobile ? 'mt-8' : 'mt-4'}`}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isSubmitting}
                  icon={<SaveOutlined />}
                  size={isMobile ? "large" : "middle"}
                  className={`${isMobile ? 'w-full' : ''} rounded-lg`}
                >
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
      </ConfigProvider>
    </Layout>
  );
};

export default EditSalesRecordPage; 