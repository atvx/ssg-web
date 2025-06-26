import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Table, Pagination, ConfigProvider, Button, Select, Input, Tree, Tag, Spin, Modal, message, Alert, Card, Space, Empty } from 'antd';
import { HomeOutlined, EnvironmentOutlined, ShopOutlined, PlusOutlined, ReloadOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import zhCN from 'antd/locale/zh_CN';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { orgsAPI } from '@/lib/api';
import { OrgListItem } from '@/types/api';

const { Option } = Select;
const { Search } = Input;
const { confirm } = Modal;

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

// 定义组织树节点类型
interface OrgTreeNode {
  key: string;
  title: string;
  type: number;
  children?: OrgTreeNode[];
  isLeaf?: boolean;
}

const OrganizationsPage: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<OrgListItem[]>([]);
  const [treeData, setTreeData] = useState<OrgTreeNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgNameFilter, setOrgNameFilter] = useState<string>('');
  const [orgCodeFilter, setOrgCodeFilter] = useState<string>('');
  const [selectedOrgType, setSelectedOrgType] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [title, setTitle] = useState<string>("组织列表");
  const [isTreeExpanded, setIsTreeExpanded] = useState<boolean>(false);
  const isMobile = useIsMobile();

  // 检查用户权限
  const hasAdminPermission = user?.is_superuser === true;
  
  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取组织列表
  const fetchOrgs = async () => {
    if (isAuthenticated) {
      try {
        setIsLoadingData(true);
        const params: any = {};
        const response = await orgsAPI.getOrgs(params);
        if (response.data.success && response.data.data) {
          const orgsData = response.data.data as OrgListItem[];
          setOrgs(orgsData);
          
          // 构建树形结构
          const tree = buildOrgTree(orgsData);
          setTreeData(tree);
          
          // 初始筛选
          filterOrganizations(orgsData);
          
          // 展开所有节点
          const keys = getExpandedKeys(tree);
          setExpandedKeys(keys);
          
          setError(null);
        } else {
          setError('获取组织列表失败');
        }
      } catch (err) {
        setError('获取组织列表失败，请稍后再试');
      } finally {
        setIsLoadingData(false);
        setIsRefreshing(false);
      }
    }
  };

  // 构建组织树
  const buildOrgTree = (orgsData: OrgListItem[]): OrgTreeNode[] => {
    // 找到所有总部(org_type=1)
    const headquarters = orgsData.filter(org => org.org_type === 1);
    
    const buildChildren = (parentId: string): OrgTreeNode[] => {
      // 找到直接子节点
      const children = orgsData
        .filter(org => org.parent_id === parentId)
        .sort((a, b) => (a.sort || 0) - (b.sort || 0))
        .map(org => {
          const hasChildren = orgsData.some(child => child.parent_id === org.org_id);
          return {
            key: org.org_id,
            title: org.org_name || org.org_id,
            type: org.org_type || 0,
            children: hasChildren ? buildChildren(org.org_id) : undefined,
            isLeaf: !hasChildren
          };
        });
      
      return children;
    };
    
    // 从总部开始构建树
    return headquarters
      .sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .map(hq => ({
        key: hq.org_id,
        title: hq.org_name || hq.org_id,
        type: hq.org_type || 0,
        children: buildChildren(hq.org_id)
      }));
  };

  // 递归获取所有节点的key，用于默认展开
  const getExpandedKeys = (nodes: OrgTreeNode[]): string[] => {
    let keys: string[] = [];
    nodes.forEach(node => {
      keys.push(node.key as string);
      if (node.children) {
        keys = keys.concat(getExpandedKeys(node.children));
      }
    });
    return keys;
  };

  // 折叠所有节点
  const collapseAllNodes = () => {
    setExpandedKeys([]);
  };
  
  // 切换树的展开/折叠状态
  const toggleTreeExpansion = () => {
    if (isTreeExpanded) {
      // 当前是展开状态，切换到折叠状态
      setExpandedKeys([]);
    } else {
      // 当前是折叠状态，切换到展开状态
      setExpandedKeys(getExpandedKeys(treeData));
    }
    setIsTreeExpanded(!isTreeExpanded);
  };

  // 筛选组织
  const filterOrganizations = (orgsData: OrgListItem[] = orgs) => {
    let filtered = [...orgsData];
    
    // 按组织类型筛选
    if (selectedOrgType) {
      const typeNumber = parseInt(selectedOrgType);
      filtered = filtered.filter(org => org.org_type === typeNumber);
    }
    
    // 按组织名称筛选
    if (orgNameFilter) {
      filtered = filtered.filter(org => 
        org.org_name && org.org_name.toLowerCase().includes(orgNameFilter.toLowerCase())
      );
    }
    
    // 按组织编码筛选
    if (orgCodeFilter) {
      filtered = filtered.filter(org => 
        org.org_id && org.org_id.toLowerCase().includes(orgCodeFilter.toLowerCase())
      );
    }
    
    // 如果选中了树节点，只显示直接子节点
    if (selectedKeys.length > 0) {
      const selectedNodeId = selectedKeys[0] as string;
      // 只过滤出直接子节点
      filtered = filtered.filter(org => org.parent_id === selectedNodeId);
      
      // 更新标题
      const selectedNode = orgs.find(org => org.org_id === selectedNodeId);
      if (selectedNode && selectedNode.org_name) {
        setTitle(`${selectedNode.org_name}的下级机构`);
      } else {
        setTitle("组织列表");
      }
    } else {
      setTitle("组织列表");
    }
    
    setFilteredOrgs(filtered);
    setTotal(filtered.length);
  };

  // 监听查询条件变化，重新筛选数据
  useEffect(() => {
    if (orgs.length > 0) {
      filterOrganizations();
    }
  }, [orgNameFilter, orgCodeFilter, selectedOrgType, selectedKeys]);

  // 首次加载数据
  useEffect(() => {
    fetchOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
  
  // 监听expandedKeys变化，同步isTreeExpanded状态
  useEffect(() => {
    // 如果expandedKeys为空，则认为是折叠状态
    if (expandedKeys.length === 0) {
      setIsTreeExpanded(false);
    } 
    // 如果expandedKeys包含所有节点的key，则认为是完全展开状态
    else if (treeData.length > 0) {
      const allKeys = getExpandedKeys(treeData);
      setIsTreeExpanded(expandedKeys.length >= allKeys.length);
    }
  }, [expandedKeys, treeData]);

  // 刷新数据
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrgs();
  };

  // 删除组织
  const handleDelete = async (orgId: string) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除此机构吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const response = await orgsAPI.deleteOrg(orgId);
          if (response.data.success) {
            // 提示成功信息
            message.success('机构删除成功');
            // 重新获取数据，更新树结构
            fetchOrgs();
          } else {
            message.error(response.data.message || '删除失败');
          }
        } catch (err) {
          message.error('删除请求失败，请稍后再试');
        }
      },
      onCancel() {
        // 用户取消删除
      }
    });
  };

  // 获取组织类型信息
  const getOrgTypeInfo = (type?: number) => {
    switch (type) {
      case 1:
        return { 
          label: '总部', 
          color: 'blue',
          icon: <HomeOutlined />
        };
      case 2:
        return { 
          label: '区域', 
          color: 'green',
          icon: <EnvironmentOutlined />
        };
      case 3:
        return { 
          label: '门店', 
          color: 'orange',
          icon: <ShopOutlined />
        };
      default:
        return { 
          label: '未知', 
          color: 'default',
          icon: null
        };
    }
  };
  
  // 获取父级组织名称
  const getParentName = (parentId: string): string => {
    if (!parentId) return '-';
    const parent = orgs.find(org => org.org_id === parentId);
    return parent ? parent.org_name || parentId : parentId;
  };

  // 处理树节点选择
  const handleTreeSelect = (selectedKeys: React.Key[], info: any) => {
    setSelectedKeys(selectedKeys);
  };

  // 获取当前页数据
  const getPaginatedData = () => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredOrgs.slice(start, end);
  };

  // 渲染移动端卡片
  const renderMobileCard = (item: OrgListItem) => {
    const typeInfo = getOrgTypeInfo(item.org_type);
    
    return (
      <Card 
        key={item.org_id} 
        className="mb-3 rounded-xl shadow-md overflow-hidden"
        bodyStyle={{ padding: 0 }}
      >
        <div className={`px-4 py-3 flex justify-between items-center bg-${typeInfo.color}-50`}>
          <div className="flex items-center">
            {typeInfo.icon && <span className="mr-2">{typeInfo.icon}</span>}
            <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
          </div>
          <div className="text-xs text-gray-500">
            ID: {item.org_id}
          </div>
        </div>
        
        <div className="p-4">
          <div className="mb-3">
            <div className="text-lg font-medium">{item.org_name}</div>
            {item.parent_id && (
              <div className="text-xs text-gray-500 mt-1">
                上级机构: {getParentName(item.parent_id)}
              </div>
            )}
          </div>
          
          <div className="flex justify-end border-t border-gray-100 pt-3">
            <Space>
              <Button 
                type="text"
                icon={<EditOutlined />}
                onClick={() => router.push(`/organizations/edit/${item.org_id}`)}
                className="text-blue-500"
              >
                编辑
              </Button>
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(item.org_id)}
              >
                删除
              </Button>
            </Space>
          </div>
        </div>
      </Card>
    );
  };

  // 表格列定义
  const columns: ColumnsType<OrgListItem> = [
    {
      title: '机构名称',
      dataIndex: 'org_name',
      key: 'org_name',
      render: (text, record) => (
        <div className="flex items-center">
          {getOrgTypeInfo(record.org_type).icon}
          <span className="ml-2">{text}</span>
        </div>
      ),
    },
    {
      title: '机构ID',
      dataIndex: 'org_id',
      key: 'org_id',
    },
    {
      title: '类型',
      dataIndex: 'org_type',
      key: 'org_type',
      render: (type) => {
        const typeInfo = getOrgTypeInfo(type);
        return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>;
      },
    },
          {
        title: '上级机构',
        dataIndex: 'parent_id',
        key: 'parent_id',
        render: (parentId) => getParentName(parentId),
      },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => router.push(`/organizations/edit/${record.org_id}`)}
            size={isMobile ? "small" : "middle"}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDelete(record.org_id)}
            size={isMobile ? "small" : "middle"}
          />
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated || !hasAdminPermission) {
    return null; // 等待重定向或无权限
  }

  return (
    <Layout>
      <Head>
        <title>机构管理 | 销售助手</title>
        <meta name="description" content="管理机构和组织结构" />
      </Head>

      <div className={`py-4 md:py-6 ${isMobile ? 'px-3' : 'px-6'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 md:gap-0">
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>{title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理机构和组织结构。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-end md:self-auto">
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => router.push('/organizations/new')}
              className="rounded-lg"
              size={isMobile ? "middle" : "middle"}
            >
              新增机构
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={isRefreshing}
              className="rounded-lg"
              size={isMobile ? "middle" : "middle"}
            >
              刷新
            </Button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert message={error} type="error" showIcon className="mb-4 rounded-lg" />
        )}

        <div className="flex flex-col md:flex-row gap-4">
          {/* 左侧树形结构 */}
          <div className={`${isMobile ? 'w-full' : 'w-64'} bg-white rounded-xl shadow-md overflow-hidden`}>
            <div className="p-3 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-medium">组织架构</h2>
              <Button 
                type="text"
                icon={isTreeExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                onClick={toggleTreeExpansion}
                size="small"
              />
            </div>
            <div className="p-2 max-h-[500px] overflow-auto">
              {isLoadingData ? (
                <div className="flex justify-center py-8">
                  <Spin size="small" />
                </div>
              ) : (
                <Tree
                  treeData={treeData}
                  selectedKeys={selectedKeys}
                  expandedKeys={expandedKeys}
                  onSelect={handleTreeSelect}
                  onExpand={(expandedKeys) => setExpandedKeys(expandedKeys)}
                  blockNode
                />
              )}
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1">
            {/* 搜索筛选区 */}
            <div className="bg-white p-4 rounded-xl shadow-md mb-4">
              <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex flex-wrap items-center gap-3'}`}>
                <Input 
                  placeholder="机构名称" 
                  value={orgNameFilter}
                  onChange={(e) => setOrgNameFilter(e.target.value)}
                  className={`${isMobile ? 'w-full' : 'w-48'} rounded-lg`}
                  allowClear
                />
                <Input 
                  placeholder="机构ID" 
                  value={orgCodeFilter}
                  onChange={(e) => setOrgCodeFilter(e.target.value)}
                  className={`${isMobile ? 'w-full' : 'w-48'} rounded-lg`}
                  allowClear
                />
                <Select 
                  placeholder="机构类型" 
                  value={selectedOrgType || undefined}
                  onChange={(value) => setSelectedOrgType(value)}
                  className={`${isMobile ? 'w-full' : 'w-32'} rounded-lg`}
                  allowClear
                >
                  <Option value="1">总部</Option>
                  <Option value="2">区域</Option>
                  <Option value="3">门店</Option>
                </Select>
              </div>
            </div>

            {/* 组织列表 */}
            {isMobile ? (
              <div className="bg-gray-50 rounded-none pt-3 px-1">
                {isLoadingData ? (
                  <div className="flex justify-center items-center py-16">
                    <Spin size="default" tip="载入中..." />
                  </div>
                ) : getPaginatedData().length > 0 ? (
                  getPaginatedData().map(item => renderMobileCard(item))
                ) : (
                  <Empty
                    className="my-8" 
                    description="暂无机构数据"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
                
                <div className="flex justify-center mt-4 mb-2">
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={total}
                    onChange={(page) => setCurrentPage(page)}
                    size="small"
                    simple
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <Table
                  columns={columns}
                  dataSource={getPaginatedData()}
                  rowKey="org_id"
                  loading={isLoadingData}
                  pagination={false}
                  className="w-full"
                />
                <div className="flex justify-end p-4">
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={total}
                    onChange={(page, size) => {
                      setCurrentPage(page);
                      setPageSize(size || pageSize);
                    }}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total) => `共 ${total} 条记录`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrganizationsPage; 