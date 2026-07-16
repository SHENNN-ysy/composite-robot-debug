import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useEffect } from 'react';
import loginImage from '../assets/login-robot.png';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: { username: string; password: string }) => {
    const success = await login(values.username, values.password);
    if (success) {
      message.success('登录成功');
      navigate('/home');
    } else {
      message.error('用户名或密码错误');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ width: 800, display: 'flex' }}>
        {/* 左侧图片和标题 */}
        <div style={{
          flex: 1,
          background: '#ffffff',
          borderRadius: '12px 0 0 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}>
          <h2 style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#262626',
            marginBottom: 32,
            textAlign: 'center',
          }}>
            复合机器人调试平台
          </h2>
          <img
            src={loginImage}
            alt="Robot"
            style={{
              width: 280,
              height: 280,
              objectFit: 'contain',
            }}
          />
        </div>

        {/* 右侧登录表单 */}
        <div style={{ flex: 1, padding: 40 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#262626',
              marginBottom: 8,
            }}>
              登录
            </h1>
            <p style={{
              fontSize: 14,
              color: '#8c8c8c',
              marginBottom: 0,
            }}>
              欢迎使用
            </p>
          </div>

          <Form
            name="login"
            className="login-form"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item>
              <div className="login-actions">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>记住密码</Checkbox>
                </Form.Item>
                <a href="#" style={{ color: '#f58020' }}>
                  忘记密码？
                </a>
              </div>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="login-button"
                style={{
                  background: 'linear-gradient(135deg, #f58020 0%, #d66d10 100%)',
                  border: 'none',
                }}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
