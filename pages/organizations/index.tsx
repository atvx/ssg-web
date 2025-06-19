import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Table, Pagination, ConfigProvider, Button, Select, Input, Tree, Tag } from 'antd';
import { HomeOutlined, EnvironmentOutlined, ShopOutlined, PlusOutlined, ReloadOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import zhCN from 'antd/locale/zh_CN';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { orgsAPI } from '@/lib/api';
import { OrgListItem } from '@/types/api';

const { Option } = Select;
const { Search } = Input;

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
    if (!window.confirm('确定要删除此组织吗？')) {
      return;
    }

    try {
      const response = await orgsAPI.deleteOrg(orgId);
      if (response.data.success) {
        // 重新获取数据，更新树结构
        fetchOrgs();
      } else {
        setError('删除组织失败');
      }
    } catch (err) {
      setError('删除组织失败，请稍后再试');
    }
  };

  // 获取组织类型名称、标签颜色和图标
  const getOrgTypeInfo = (type?: number) => {
    switch (type) {
      case 1:
        return { 
          name: '总部', 
          color: 'blue',
          icon: <HomeOutlined /> 
        };
      case 2:
        return { 
          name: '区域', 
          color: 'green',
          icon: <EnvironmentOutlined /> 
        };
      case 3:
        return { 
          name: '仓库', 
          color: 'orange',
          icon: <ShopOutlined /> 
        };
      default:
        return { 
          name: '未知', 
          color: 'default',
          icon: null 
        };
    }
  };

  // 处理树选中事件
  const handleTreeSelect = (selectedKeys: React.Key[], info: any) => {
    setSelectedKeys(selectedKeys);
    setCurrentPage(1);  // 重置页码
  };

  // 分页组件显示的数据
  const getPaginatedData = () => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredOrgs.slice(start, end);
  };

  // 定义表格列
  const columns: ColumnsType<OrgListItem> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: '机构编码',
      dataIndex: 'org_id',
      key: 'org_id',
      ellipsis: true,
      width: '15%',
      sorter: (a, b) => a.org_id.localeCompare(b.org_id),
    },
    {
      title: '机构名称',
      dataIndex: 'org_name',
      key: 'org_name',
      ellipsis: true,
      width: '25%',
    },
    {
      title: '机构类型',
      dataIndex: 'org_type',
      key: 'org_type',
      width: '15%',
      sorter: (a, b) => (a.org_type || 0) - (b.org_type || 0),
      render: (type) => {
        const typeInfo = getOrgTypeInfo(type);
        return (
          <Tag color={typeInfo.color} icon={typeInfo.icon}>
            {typeInfo.name}
          </Tag>
        );
      },
    },
    {
      title: '上级机构',
      dataIndex: 'parent_id',
      key: 'parent_id',
      ellipsis: true,
      width: '20%',
      sorter: (a, b) => {
        // 获取上级机构名称
        const parentA = a.parent_id ? (orgs.find(org => org.org_id === a.parent_id)?.org_name || a.parent_id) : '';
        const parentB = b.parent_id ? (orgs.find(org => org.org_id === b.parent_id)?.org_name || b.parent_id) : '';
        return parentA.localeCompare(parentB);
      },
      render: (parentId) => {
        if (!parentId) return '-';
        const parent = orgs.find(org => org.org_id === parentId);
        return parent ? parent.org_name : parentId;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <div className="flex space-x-2">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/organizations/edit/${record.org_id}`)}
            disabled={!hasAdminPermission}
            title={hasAdminPermission ? '编辑' : '需要管理员权限'}
            className="text-blue-500"
            size="small"
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => router.push(`/organizations/edit/${record.org_id}`)}
            disabled={!hasAdminPermission}
            title={hasAdminPermission ? '编辑' : '需要管理员权限'}
            className="text-blue-500"
            size="small"
          >
            编辑
          </Button>
          {record.org_type !== 1 && (  // 不允许删除总部
            <Button
              type="link"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.org_id)}
              disabled={!hasAdminPermission}
              danger
              title={hasAdminPermission ? '删除' : '需要管理员权限'}
              size="small"
            >
              删除
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  return (
    <Layout>
      <Head>
        <title>组织管理 | 销售助手</title>
        <meta name="description" content="组织管理" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className="py-4 px-2 md:px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">组织管理</h1>
            <div className="flex flex-wrap gap-2">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push('/organizations/new')}
                disabled={!hasAdminPermission}
                title={hasAdminPermission ? '创建组织' : '需要管理员权限'}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                新增组织
              </Button>
              <Button
                icon={<ReloadOutlined spin={isRefreshing} />}
                onClick={handleRefresh}
                disabled={isRefreshing}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                刷新
              </Button>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            管理组织结构和层级关系。
          </p>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* 搜索区 */}
          <div className="bg-white p-3 sm:p-4 rounded-md shadow mb-4 mt-6">
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-end gap-3 sm:gap-4">
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">机构名称:</label>
                <Input
                  placeholder="请输入机构名称"
                  value={orgNameFilter}
                  onChange={e => setOrgNameFilter(e.target.value)}
                  style={{ width: '100%', maxWidth: '220px' }}
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">机构编码:</label>
                <Input
                  placeholder="请输入机构编码"
                  value={orgCodeFilter}
                  onChange={e => setOrgCodeFilter(e.target.value)}
                  style={{ width: '100%', maxWidth: '220px' }}
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">机构类型:</label>
                <Select
                  placeholder="全部"
                  style={{ width: '100%', maxWidth: '120px' }}
                  value={selectedOrgType || undefined}
                  onChange={value => setSelectedOrgType(value)}
                  allowClear
                >
                  <Option value="1">总部</Option>
                  <Option value="2">区域</Option>
                  <Option value="3">仓库</Option>
                </Select>
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <Button
                  type="primary"
                  onClick={() => filterOrganizations()}
                >
                  查询
                </Button>
                <Button
                  onClick={() => {
                    setOrgNameFilter('');
                    setOrgCodeFilter('');
                    setSelectedOrgType('');
                    setSelectedKeys([]);
                    filterOrganizations(orgs);
                  }}
                >
                  重置
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* 左侧树形菜单 - 在移动端上方显示，在大屏上左侧显示 */}
            <div className="w-full lg:w-64 bg-white p-4 rounded-md shadow">
              <div className="text-base font-medium mb-2 flex justify-between items-center">
                <span>组织结构</span>
                <Button 
                  type="link" 
                  onClick={toggleTreeExpansion}
                  className="p-0 h-auto text-xs"
                  size="small"
                >
                  {isTreeExpanded ? '折叠全部' : '展开全部'}
                </Button>
              </div>
              <Tree
                showLine
                treeData={treeData}
                expandedKeys={expandedKeys}
                selectedKeys={selectedKeys}
                onSelect={handleTreeSelect}
                onExpand={expandedKeys => setExpandedKeys(expandedKeys)}
              />
            </div>

            {/* 右侧内容区 */}
            <div className="flex-1 overflow-hidden">
              {/* 数据表格 */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table
                    columns={columns}
                    dataSource={getPaginatedData()}
                    rowKey="org_id"
                    pagination={false}
                    loading={isLoadingData}
                    scroll={{ x: 'max-content' }}
                    size="small"
                    tableLayout="auto"
                    bordered
                  />
                </div>
                <div className="p-2 sm:p-4 border-t border-gray-200">
                  <div className="flex justify-end">
                    <Pagination
                      current={currentPage}
                      pageSize={pageSize}
                      total={total}
                      onChange={setCurrentPage}
                      onShowSizeChange={(current, size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      showSizeChanger
                      pageSizeOptions={["10", "20", "50", "100"]}
                      showTotal={(total) => `共 ${total} 条记录`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ConfigProvider>
    </Layout>
  );
};

export default OrganizationsPage; 