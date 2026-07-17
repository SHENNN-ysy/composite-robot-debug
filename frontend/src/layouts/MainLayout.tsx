import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import {
  HomeOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  RobotOutlined,
  LineChartOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useAuthStore();

  const settingsSubItems = [
    { key: '/settings?tab=general', label: '通用设置' },
    { key: '/settings?tab=user', label: '用户设置' },
    { key: '/settings?tab=about', label: '关于' },
  ];
  
  const deviceSubItems = [
    { key: '/device?tab=list', label: '设备列表' },
    { key: '/device?tab=status', label: '设备状态' },
  ];
  
  const statusSubItems = [
    { key: '/status?tab=log', label: '状态日志' },
    { key: '/status?tab=data', label: '数据监控' },
  ];
  
  const programSubItems = [
    { key: '/flow/process', label: '流程编排' },
    { key: '/flow/program', label: '可视化编程' },
  ];
  const menuItems: MenuProps['items'] = [
    {
      key: '/home',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: 'device',
      icon: <RobotOutlined />,
      label: '设备控制',
      children: deviceSubItems,
    },
    {
      key: 'flow',
      icon: <LineChartOutlined />,
      label: '系统流程',
      children: programSubItems,
    },
    {
      key: 'data',
      icon: <DatabaseOutlined />,
      label: '状态信息',
      children: statusSubItems,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: settingsSubItems,
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout className="main-layout">
      <Header className="main-header">
        <div className="logo">
          <div className="logo-icon">R</div>
          <span>复合机器人调试平台</span>
        </div>
        <div className="user-info">
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{username}</span>
            </Space>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        <Sider width={200} className="main-sider">
          <Menu
            mode="inline"
            selectedKeys={[
              location.pathname.startsWith('/device')
                ? (location.search.includes('tab=list') ? '/device?tab=list' : '/device?tab=status')
                : location.pathname + (location.search.includes('tab=') ? location.search : ''),
            ]}
            defaultOpenKeys={[
              location.pathname.startsWith('/flow')
                ? 'flow'
                : location.pathname.startsWith('/status')
                  ? 'data'
                  : location.pathname.startsWith('/settings')
                    ? 'settings'
                    : 'device',
            ]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>

        <Layout style={{ padding: 0 }}>
          <Content className="main-content">
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
