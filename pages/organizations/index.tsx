import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Table, Pagination, ConfigProvider, Button, Select, Input, Tree, Tag, Spin, Modal, message, Alert, Card, Space, Empty, FloatButton, Cascader } from 'antd';
import { HomeOutlined, EnvironmentOutlined, ShopOutlined, PlusOutlined, ReloadOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import zhCN from 'antd/locale/zh_CN';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { orgsAPI } from '@/lib/api';
import { OrgListItem } from '@/types/api';
import { usePullToRefresh } from '@/lib/usePullToRefresh';
import { useInView } from 'react-intersection-observer';

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
  const [selectedOrgType, setSelectedOrgType] = useState<string>('1');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSizeMobile = 10; // 固定移动端每次加载数量
  const [title, setTitle] = useState<string>("总部列表");
  const [isTreeExpanded, setIsTreeExpanded] = useState<boolean>(false);
  const isMobile = useIsMobile();
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);

  // 监控滚动到底部
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px 0px'
  });

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
    // 重置移动端分页
    setCurrentPage(1);
    setIsLoadingMore(false);
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

  // 获取移动端当前显示的数据
  const getMobileData = () => {
    return filteredOrgs.slice(0, currentPage * pageSizeMobile);
  };

  // 桌面端分页数据
  const getPaginatedData = () => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredOrgs.slice(start, end);
  };

  // 当滚动到底部时加载更多（移动端）
  useEffect(() => {
    if (!isMobile) return;
    const hasMore = getMobileData().length < filteredOrgs.length;
    if (inView && hasMore && !isLoadingMore) {
      setIsLoadingMore(true);
      // 模拟异步加载，可直接同步更新页数
      setCurrentPage(prev => prev + 1);
      setIsLoadingMore(false);
    }
  }, [inView, filteredOrgs, isLoadingMore, isMobile]);

  // 渲染移动端卡片
  const renderMobileCard = (item: OrgListItem, index: number) => {
    const typeInfo = getOrgTypeInfo(item.org_type);
    
    return (
      <div 
        key={item.org_id} 
        className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 active:scale-[0.98] transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          {/* 左侧主要信息 */}
          <div className="flex items-center space-x-2.5 flex-1 min-w-0">
            {/* 序号圆圈，从1开始 */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              item.org_type === 2 ? 'bg-lime-500' : 'bg-orange-500'
            }`}>
              <span className="text-white font-medium text-base">
                {index + 1}
              </span>
            </div>
            
            {/* 机构信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {item.org_name}
                </h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  item.org_type === 1 ? 'bg-blue-100 text-blue-700' :
                  item.org_type === 2 ? 'bg-emerald-100 text-emerald-700' :
                  item.org_type === 3 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {typeInfo.label}
                </span>
              </div>
              
              <div className="mt-0.5 flex items-center space-x-3 text-xs text-gray-500">
                <span className="font-mono">#{item.org_id}</span>
                {item.parent_id && (
                  <span className="truncate">
                    <span className="text-gray-400 mr-0.5">{getParentName(item.parent_id)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* 右侧操作按钮 */}
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={() => router.push(`/organizations/edit/${item.org_id}`)}
              className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors duration-200"
            >
              <EditOutlined className="text-xs text-gray-600" />
            </button>
            <button
              onClick={() => handleDelete(item.org_id)}
              className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors duration-200"
            >
              <DeleteOutlined className="text-xs text-red-600" />
            </button>
          </div>
        </div>
      </div>
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

  // 按层级对机构分组
  const groupOrgsByLevel = () => {
    // 获取所有总部(org_type=1)
    const headquarters = orgs.filter(org => org.org_type === 1);
    
    // 创建分层结构
    interface HierarchyNode {
      parent: OrgListItem;
      children: HierarchyNode[];
    }
    
    const buildHierarchy = (parentOrgs: OrgListItem[], parentLevel: number): HierarchyNode[] => {
      return parentOrgs.map(parent => {
        // 找到直接子节点
        const children = orgs
          .filter(org => org.parent_id === parent.org_id)
          .sort((a, b) => (a.sort || 0) - (b.sort || 0));
          
        return {
          parent,
          children: children.length > 0 ? buildHierarchy(children, parentLevel + 1) : []
        };
      });
    };
    
    // 从总部开始构建
    return buildHierarchy(headquarters.sort((a, b) => (a.sort || 0) - (b.sort || 0)), 1);
  };
  
  // 将机构数据转换为Cascader所需的options格式
  const getCascaderOptions = () => {
    interface CascaderOption {
      value: string;
      label: string;
      children?: CascaderOption[];
    }
    
    const buildOptions = (orgsData: OrgListItem[]): CascaderOption[] => {
      // 找到所有顶级机构(没有parent_id或parent_id不在当前列表中)
      const topOrgs = orgsData.filter(org => 
        org.org_type === 1 || 
        !org.parent_id || 
        !orgsData.some(o => o.org_id === org.parent_id)
      );
      
      return topOrgs
        .sort((a, b) => (a.sort || 0) - (b.sort || 0))
        .map(org => {
          // 找到该机构的所有直接子机构
          const children = orgsData.filter(child => child.parent_id === org.org_id);
          
          // 创建选项
          const option: CascaderOption = {
            value: org.org_id,
            label: org.org_name || org.org_id,
            children: children.length > 0 ? buildOptions(children) : undefined
          };
          
          return option;
        });
    };
    
    return buildOptions(orgs);
  };
  
  // 处理级联选择器选择变化
  const handleCascaderChange = (value: string[]) => {
    if (value && value.length > 0) {
      // 保存选择的ID
      setSelectedOrgIds(value);
      
      // 获取最后一级选择的机构ID
      const selectedOrgId = value[value.length - 1];
      
      // 设置选中的树节点(兼容树形结构)
      setSelectedKeys([selectedOrgId]);
      
      // 更新标题
      const selectedNode = orgs.find(org => org.org_id === selectedOrgId);
      if (selectedNode && selectedNode.org_name) {
        setTitle(`${selectedNode.org_name}的下级机构`);
      } else {
        setTitle("机构管理");
      }
      
      // 清除机构类型筛选，因为已经通过级联选择了特定机构
      setSelectedOrgType('');
    } else {
      // 如果清除选择，重置为总部视图
      setSelectedOrgIds([]);
      setSelectedKeys([]);
      setSelectedOrgType('1');
      setTitle("总部列表");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated || !hasAdminPermission) {
    return null; // 等待重定向或无权限
  }
  
  // 启用下拉刷新
  usePullToRefresh(handleRefresh, isMobile && isAuthenticated);

  return (
    <Layout>
      <Head>
        <title>机构管理 | 销售助手</title>
        <meta name="description" content="管理机构和组织结构" />
      </Head>

      <div className={`py-4 md:py-6 ${isMobile ? 'px-3' : 'px-6'} bg-gray-50 min-h-screen`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 md:gap-0">
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>{title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理机构和组织结构。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-end md:self-auto">
            {!isMobile && (
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => router.push('/organizations/new')}
                className="rounded-lg"
                size={isMobile ? "middle" : "middle"}
              >
                新增机构
              </Button>
            )}
            {!isMobile && (
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={isRefreshing}
                className="rounded-lg"
                size={isMobile ? "middle" : "middle"}
              >
                刷新
              </Button>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert message={error} type="error" showIcon className="mb-4 rounded-lg" />
        )}

        <div className="flex flex-col md:flex-row gap-4">
          {/* 左侧树形结构 - 仅在桌面端显示 */}
          {!isMobile && (
            <div className="w-64 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-base font-semibold text-gray-900">组织架构</h2>
                <button
                  onClick={toggleTreeExpansion}
                  className="w-6 h-6 rounded-md bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors duration-200"
                >
                  {isTreeExpanded ? 
                    <ChevronDownIcon className="h-3 w-3 text-gray-600" /> : 
                    <ChevronRightIcon className="h-3 w-3 text-gray-600" />
                  }
                </button>
              </div>
              <div className="p-3 max-h-[500px] overflow-auto">
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
                    className="custom-tree"
                  />
                )}
              </div>
            </div>
          )}

          {/* 右侧内容区 */}
          <div className="flex-1">
            {/* 搜索筛选区 */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* 移动端机构选择器 */}
                {isMobile && (
                  <Cascader
                    options={getCascaderOptions()}
                    placeholder="选择机构"
                    allowClear
                    onChange={handleCascaderChange as any}
                    className="w-full mb-2"
                    size="middle"
                    showSearch={{ filter: (inputValue, path) => 
                      path.some(option => option.label && 
                        (typeof option.label === 'string' ? 
                          option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1 : 
                          false))
                    }}
                    expandTrigger="hover"
                    changeOnSelect={true}
                  />
                )}
                
                {/* 桌面端筛选条件 */}
                {!isMobile && (
                  <>
                    <Input 
                      placeholder="搜索机构名称" 
                      value={orgNameFilter}
                      onChange={(e) => setOrgNameFilter(e.target.value)}
                      className="w-48 rounded-xl border-gray-200"
                      allowClear
                    />
                    <Input 
                      placeholder="搜索机构ID" 
                      value={orgCodeFilter}
                      onChange={(e) => setOrgCodeFilter(e.target.value)}
                      className="w-48 rounded-xl border-gray-200"
                      allowClear
                    />
                    <Select 
                      placeholder="选择机构类型" 
                      value={selectedOrgType || undefined}
                      onChange={(value) => setSelectedOrgType(value || '1')}
                      className="w-32"
                      allowClear={false}
                    >
                      <Option value="1">总部</Option>
                      <Option value="2">区域</Option>
                      <Option value="3">门店</Option>
                    </Select>
                  </>
                )}
              </div>
            </div>

            {/* 组织列表 */}
            {isMobile ? (
              <div>
                {isLoadingData ? (
                  <div className="flex flex-col justify-center items-center py-20">
                    <Spin size="large" tip="加载中..." />
                  </div>
                ) : getMobileData().length > 0 ? (
                  <Spin spinning={isRefreshing} tip="加载中...">
                    <div className="flex flex-col gap-3">
                      {getMobileData().map((item, index) => renderMobileCard(item, index))}
                    </div>
                  </Spin>
                ) : (
                  <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HomeOutlined className="text-2xl text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">暂无机构数据</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      还没有创建任何机构，点击上方按钮开始添加
                    </p>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      onClick={() => router.push('/organizations/new')}
                      className="rounded-xl"
                      size="large"
                    >
                      创建第一个机构
                    </Button>
                  </div>
                )}
                
                {/* load more indicator */}
                <div
                  ref={loadMoreRef}
                  className="h-16 flex items-center justify-center"
                >
                  {isLoadingMore && (
                    <span className="text-sm text-gray-400">正在加载...</span>
                  )}
                  {!isLoadingMore && getMobileData().length === filteredOrgs.length && filteredOrgs.length > 0 && (
                    <div className="flex items-center justify-center w-full py-2 text-gray-400">
                      <div className="flex-1 h-[1px] bg-gray-200"></div>
                      <span className="mx-4 whitespace-nowrap text-sm">没有更多数据了</span>
                      <div className="flex-1 h-[1px] bg-gray-200"></div>
                    </div>
                  )}
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

        {/* 移动端浮动按钮 */}
        {isMobile && (
          <FloatButton
            icon={<PlusOutlined />}
            tooltip="新增机构"
            onClick={() => router.push('/organizations/new')}
            type="primary"
            style={{ right: 24 }}
          />
        )}
      </div>
    </Layout>
  );
};

export default OrganizationsPage; 