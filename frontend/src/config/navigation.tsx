/**
 * 主布局侧边导航配置。
 *
 * 菜单项的 key 即目标路由路径（与 app/AppRouter 中的路由一一对应），MainLayout 点击菜单时
 * 直接 navigate(key)。「状态信息」「系统设置」在同一页面内用 ?tab= 区分页签，因此 key 带上
 * 查询串，并配套 getSelectedMenuKey / getDefaultOpenMenuKey 计算菜单的高亮与展开状态。
 */
import {
  DatabaseOutlined,
  HomeOutlined,
  LineChartOutlined,
  RobotOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

/** 侧边导航菜单树：首页、设备控制、系统流程、状态信息、系统设置五大业务入口。 */
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
      // 同一页面内用 ?tab= 区分页签，key 带上查询串才能精确高亮对应菜单项
      // 同一页面内用 ?tab= 区分页签，菜单 key 带上查询串才能精确高亮对应项
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

/**
 * 计算当前应高亮的菜单 key。
 * 仅当 URL 带 tab 参数时才拼接查询串：/status?tab=log 这类「同页不同页签」的菜单项
 * 才能各自精确高亮，不带 tab 的普通页面只按路径匹配。
 */
export function getSelectedMenuKey(pathname: string, search: string) {
  return `${pathname}${search.includes('tab=') ? search : ''}`;
}

/**
 * 根据当前路径推导默认展开的父级菜单分组（仅在菜单初次渲染时生效）。
 * /home 与 /device/* 等未命中前面分组的路径，统一默认展开「设备控制」。
 */
export function getDefaultOpenMenuKey(pathname: string) {
  if (pathname.startsWith('/flow')) return 'flow';
  if (pathname.startsWith('/status')) return 'data';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'device';
}
