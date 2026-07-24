/**
 * 登录页：平台的鉴权入口，也是唯一无需登录即可访问的页面（路由 /login）。
 *
 * 流程：表单提交 -> authStore.login -> POST /api/auth/login（报文 {username, password}，
 * 后端返回统一包装 ApiResponse<UserAccount>）-> 成功后用户信息写入 sessionStorage 并跳转 /home。
 * 已登录用户直接访问 /login 时会被 effect 重定向回 /home，避免重复登录。
 */
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useEffect } from 'react';
import loginImage from '../assets/login-robot.png';
import styles from './Login.module.css';

/** 登录页组件：左侧品牌展示区 + 右侧登录表单。 */
export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  // 已登录用户直接访问 /login 时自动回首页；登录成功翻转 isAuthenticated 后也由此跳转
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  /**
   * 提交登录：经 auth store 调用 POST /api/auth/login（报文 {username, password}，
   * 后端返回统一包装 ApiResponse<UserAccount>），成功后用户信息写入 sessionStorage。
   * 失败时按错误类型提示：400（凭证错误）显示后端返回的“用户名或密码错误”，
   * 5xx 或后端不可达统一显示“系统繁忙”。
   */
  const onFinish = async (values: { username: string; password: string }) => {
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/home');
    } catch (error) {
      // login 抛出的 Error 已在 http 拦截器规范化为可读文案，兜底文案防御非 Error 异常
      message.error(error instanceof Error ? error.message : '系统繁忙，请稍后重试');
    }
  };

  const pageTitle = '登录';

  // 左侧品牌区：平台名称 + 机器人示意图
  const renderLeftPanel = () => (
    <div className={styles.leftPanel}>
      <h2 className={styles.title}>复合机器人调试平台</h2>
      <img src={loginImage} alt="Robot" className={styles.image} />
    </div>
  );

  // 右侧登录表单：用户名/密码必填校验，提交走 onFinish
  const renderLoginForm = () => (
    <div className={styles.rightPanel}>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>{pageTitle}</h1>
        <p className={styles.headerSubtitle}>欢迎使用</p>
      </div>
      <Form name="login" className="login-form" onFinish={onFinish} size="large">
        <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="用户名" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="密码" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" className={styles.submitButton}>登 录</Button>
        </Form.Item>
      </Form>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {renderLeftPanel()}
        {renderLoginForm()}
      </div>
    </div>
  );
}
