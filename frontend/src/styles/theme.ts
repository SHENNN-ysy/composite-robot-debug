import type { ThemeConfig } from 'antd';

// 白橙配色主题配置
// 设计理念：清爽专业 + 活力橙点缀，适合工业调试界面
export const theme: ThemeConfig = {
  token: {
    // === 主色调 - 活力橙 ===
    colorPrimary: '#f58020',
    colorPrimaryHover: '#d66d10',
    colorPrimaryActive: '#b85a08',

    // === 功能色 ===
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorInfo: '#1890ff',

    // === 背景色 - 白灰系 ===
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorBgSpotlight: '#fff7ed',
    colorBgContainerDisabled: '#f5f5f5',

    // === 文字色 ===
    colorText: '#262626',
    colorTextSecondary: '#595959',
    colorTextTertiary: '#8c8c8c',
    colorTextQuaternary: '#bfbfbf',

    // === 边框色 ===
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',

    // === 其他配置 ===
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,

    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,

    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,

    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.12)',
  },

  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 56,
      headerPadding: '0 24px',
      bodyBg: '#f5f5f5',
      siderBg: '#ffffff',
      triggerBg: '#f58020',
    },

    Menu: {
      itemBg: '#ffffff',
      itemSelectedBg: '#fff7ed',
      itemSelectedColor: '#f58020',
      itemHoverBg: '#fff7ed',
      itemHoverColor: '#d66d10',
      itemActiveBg: '#ffe7d6',
      subMenuItemBg: '#ffffff',
      horizontalItemSelectedColor: '#f58020',
      horizontalItemHoverColor: '#d66d10',
      darkItemBg: '#1f1f1f',
    },

    Button: {
      primaryShadow: '0 2px 4px rgba(245, 128, 32, 0.3)',
      defaultBorderColor: '#d9d9d9',
      defaultColor: '#595959',
      fontWeight: 500,
    },

    Card: {
      colorBgContainer: '#ffffff',
      paddingLG: 20,
      borderRadiusLG: 12,
    },

    Input: {
      colorBgContainer: '#ffffff',
      activeBorderColor: '#f58020',
      hoverBorderColor: '#d66d10',
      activeShadow: '0 0 0 2px rgba(245, 128, 32, 0.1)',
    },

    Select: {
      colorBgContainer: '#ffffff',
      optionSelectedBg: '#fff7ed',
      colorPrimaryHover: '#f58020',
    },

    Table: {
      headerBg: '#fafafa',
      headerColor: '#262626',
      rowHoverBg: '#fff7ed',
      borderColor: '#f0f0f0',
    },

    Tabs: {
      inkBarColor: '#f58020',
      itemSelectedColor: '#f58020',
      itemHoverColor: '#d66d10',
      itemActiveColor: '#b85a08',
    },

    Slider: {
      trackBg: '#f58020',
      trackHoverBg: '#d66d10',
      handleColor: '#f58020',
      handleActiveColor: '#d66d10',
      railBg: '#e8e8e8',
      railHoverBg: '#d9d9d9',
    },

    Switch: {
      colorPrimary: '#f58020',
      colorPrimaryHover: '#d66d10',
    },

    Progress: {
      defaultColor: '#f58020',
    },

    Alert: {
      colorInfoBg: '#e6f7ff',
      colorInfoBorder: '#91d5ff',
    },

    Badge: {
      colorBgContainer: '#ffffff',
    },

    Modal: {
      headerBg: '#ffffff',
      contentBg: '#ffffff',
      titleFontSize: 18,
    },

    Message: {
      contentBg: '#ffffff',
    },

    Notification: {
      colorBgElevated: '#ffffff',
    },
  },
};
