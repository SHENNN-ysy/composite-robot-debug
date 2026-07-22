import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import {
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import {
  getDefaultOpenMenuKey,
  getSelectedMenuKey,
  mainMenuItems,
} from '@/config/navigation';
import styles from './MainLayout.module.css';

const { Header, Sider, Content } = Layout;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useAuthStore();

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
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>R</div>
          <span>复合机器人调试平台</span>
        </div>
        <div className={styles.userInfo}>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space className={styles.userTrigger}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{username}</span>
            </Space>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        <Sider width={200} className={styles.sider}>
          <Menu
            mode="inline"
            selectedKeys={[getSelectedMenuKey(location.pathname, location.search)]}
            defaultOpenKeys={[getDefaultOpenMenuKey(location.pathname)]}
            items={mainMenuItems}
            onClick={({ key }) => navigate(key)}
            className={styles.menu}
          />
        </Sider>

        <Layout className={styles.contentLayout}>
          <Content className={styles.content}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
