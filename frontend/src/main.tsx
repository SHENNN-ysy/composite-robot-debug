/**
 * 前端应用入口（由 index.html 以 <script type="module"> 方式加载）。
 *
 * 业务职责：
 * - 创建 React 根节点，渲染整个「复合机器人单机联调系统」前端；
 * - 通过 antd ConfigProvider 注入全局主题（平台定制的配色与组件风格，见 styles/theme）；
 * - 通过 BrowserRouter 启用前端路由，登录页及登录后的各业务页面均由路由表驱动（见 app/AppRouter）。
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App';
import { theme } from './styles/theme';
import './styles/global.css';

// 挂载根组件；StrictMode 会在开发环境故意双渲染以暴露副作用问题，属预期行为
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
