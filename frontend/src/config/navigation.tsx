import {
  DatabaseOutlined,
  HomeOutlined,
  LineChartOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

export const mainMenuItems: MenuProps['items'] = [
  {
    key: '/home',
    icon: <HomeOutlined />,
    label: '首页',
  },
  {
    key: 'device',
    icon: <RobotOutlined />,
    label: '设备控制',
    children: [
      { key: '/device/robot-arm', label: '机械臂控制' },
      { key: '/device/agv', label: 'AGV控制' },
    ],
  },
  {
    key: 'flow',
    icon: <LineChartOutlined />,
    label: '系统流程',
    children: [
      { key: '/flow/process', label: '流程编排' },
      { key: '/flow/program', label: '程序编程' },
    ],
  },
  {
    key: 'data',
    icon: <DatabaseOutlined />,
    label: '状态信息',
    children: [
      { key: '/status?tab=log', label: '状态日志' },
      { key: '/status?tab=data', label: '数据监控' },
    ],
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '系统设置',
    children: [
      { key: '/settings?tab=general', label: '通用设置' },
      { key: '/settings?tab=user', label: '用户设置' },
      { key: '/settings?tab=about', label: '关于' },
    ],
  },
];

export function getSelectedMenuKey(pathname: string, search: string) {
  return `${pathname}${search.includes('tab=') ? search : ''}`;
}

export function getDefaultOpenMenuKey(pathname: string) {
  if (pathname.startsWith('/flow')) return 'flow';
  if (pathname.startsWith('/status')) return 'data';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'device';
}
