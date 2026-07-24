/**
 * 主布局：登录后所有业务页面的统一框架（仅挂载在受保护路由下，见 AppRouter）。
 *
 * - 结构：顶部 Header（平台标识 + 当前用户下拉菜单）、左侧 Sider 导航、右侧 Outlet 渲染子路由页面；
 * - 侧边导航的菜单项、高亮与展开状态由 config/navigation 按当前 URL 推导；
 * - 还承担「实时通道」的生命周期：进入主布局即建立 /ws/control WebSocket，把后端推送的
 *   机械臂/AGV 状态写入对应 store；离开主布局时断开连接并退订（见 store/realtime.ts）。
 */
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
import { useEffect } from 'react';
import { useRealtimeStore } from '@/store/realtime';

const { Header, Sider, Content } = Layout;

/** 主布局组件：顶部栏 + 侧边导航 + 内容区，并负责实时通道的初始化与清理。 */
export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useAuthStore();
  // 实时通道初始化动作：建立 /ws/control 连接，订阅后端推送并写入机械臂/AGV store
  const initializeRealtime = useRealtimeStore((state) => state.initialize);

  // 挂载时建立 WebSocket，返回的清理函数在卸载时断连退订；
  // store 内部有 initialized 幂等保护，StrictMode 双执行不会重复连接（见 store/realtime.ts）
  useEffect(() => initializeRealtime(), [initializeRealtime]);

  // 右上角用户下拉菜单；「退出登录」清除 sessionStorage 中的登录信息后回到登录页
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
          {/* 菜单高亮/展开状态由当前 URL 推导，刷新或直接访问链接也能正确定位 */}
          <Menu
            mode="inline"
            selectedKeys={[getSelectedMenuKey(location.pathname, location.search)]}
            defaultOpenKeys={[getDefaultOpenMenuKey(location.pathname)]}
            items={mainMenuItems}
            /* 菜单项 key 即目标路由路径（可含 ?tab= 查询串），点击直接跳转 */
            onClick={({ key }) => navigate(key)}
            className={styles.menu}
          />
        </Sider>

        <Layout className={styles.contentLayout}>
          <Content className={styles.content}>
            {/* 子路由页面渲染出口 */}
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
