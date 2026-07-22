import { useState, useEffect } from 'react';
import { Form, Input, Button, Space, message, Select, Table, Modal, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, ClockCircleOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import pageStyles from './Settings.module.css';
import PageHeader from '@/components/common/PageHeader/PageHeader';

export type SettingsTab = 'general' | 'user' | 'about';

interface UserAccount {
  id: string;
  username: string;
  password: string;
  level: 'superadmin' | 'admin' | 'technician' | 'operator';
  createTime: string;
}

interface SettingsProps {
  initialTab?: SettingsTab;
}

export default function Settings({ initialTab = 'general' }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [form] = Form.useForm();
  const [userForm] = Form.useForm();
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [networkEditing, setNetworkEditing] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [users, setUsers] = useState<UserAccount[]>([
    { id: '1', username: 'admin', password: 'admin123', level: 'superadmin', createTime: '2026-01-15' },
    { id: '2', username: 'operator01', password: 'op123456', level: 'operator', createTime: '2026-02-20' },
    { id: '3', username: 'tech01', password: 'tech123', level: 'technician', createTime: '2026-03-10' },
  ]);

  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSyncTime = () => {
    setCurrentTime(dayjs());
    message.success('校时成功，已同步至系统当前时间');
  };

  const handleStartEditNetwork = () => {
    setNetworkEditing(true);
  };

  const handleCancelEditNetwork = () => {
    form.resetFields(['localIp', 'subnetMask', 'gateway', 'dns']);
    setNetworkEditing(false);
    message.info('已取消修改');
  };

  const handleSaveNetwork = async () => {
    try {
      const values = await form.validateFields(['localIp', 'subnetMask', 'gateway', 'dns']);
      const ipPattern = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
      if (!ipPattern.test(values.localIp)) {
        message.error('本机IP格式不正确');
        return;
      }
      if (!ipPattern.test(values.subnetMask)) {
        message.error('子网掩码格式不正确');
        return;
      }
      if (!ipPattern.test(values.gateway)) {
        message.error('默认网关格式不正确');
        return;
      }
      if (!ipPattern.test(values.dns)) {
        message.error('DNS服务器格式不正确');
        return;
      }
      setNetworkEditing(false);
      message.success('网络设置已保存');
    } catch {
      // validation failed
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setAddUserModalOpen(true);
  };

  const handleEditUser = (user: UserAccount) => {
    setEditingUser(user);
    userForm.setFieldsValue(user);
    userForm.setFieldsValue({ confirmPassword: user.password });
    setAddUserModalOpen(true);
  };

  const handleDeleteUser = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该账号吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setUsers(users.filter((u) => u.id !== id));
        message.success('账号已删除');
      },
    });
  };

  const handleUserSubmit = async () => {
    try {
      const values = await userForm.validateFields();
      const { confirmPassword: _unused, ...submitValues } = values;
      void _unused;
      if (editingUser) {
        setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...submitValues } : u)));
        message.success('账号已更新');
      } else {
        const newUser: UserAccount = {
          id: String(Date.now()),
          ...submitValues,
          createTime: dayjs().format('YYYY-MM-DD'),
        };
        setUsers([...users, newUser]);
        message.success('账号已添加');
      }
      setAddUserModalOpen(false);
    } catch {
      // validation failed
    }
  };

  const levelMap: Record<string, { color: string; label: string }> = {
    superadmin: { color: 'magenta', label: '超级管理员' },
    admin: { color: 'red', label: '管理员' },
    technician: { color: 'cyan', label: '技术员' },
    operator: { color: 'orange', label: '操作员' },
  };

  const userColumns = [
    { title: '账号', dataIndex: 'username', key: 'username', width: '20%' },
    {
      title: '密码',
      dataIndex: 'password',
      key: 'password',
      width: '20%',
      render: () => '••••••',
    },
    {
      title: '账号等级',
      dataIndex: 'level',
      key: 'level',
      width: '15%',
      render: (level: string) => (
        <Tag color={levelMap[level]?.color}>{levelMap[level]?.label}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: '15%' },
    {
      title: '操作',
      key: 'action',
      width: '20%',
      render: (_: unknown, record: UserAccount) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            disabled={record.username === 'admin'}
            onClick={() => handleEditUser(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            disabled={record.username === 'admin'}
            onClick={() => handleDeleteUser(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const renderGeneralSettings = () => (
    <Form form={form} layout="vertical">
      <div className="settings-section">
        <div className="settings-section-title">时间设置</div>

        <div className="settings-row">
          <div className="settings-label">系统时间</div>
          <div className="settings-control">
            <span className={pageStyles.systemTime}>
              {currentTime.format('YYYY-MM-DD HH:mm:ss')}
            </span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">操作</div>
          <div className="settings-control">
            <Button type="primary" icon={<ClockCircleOutlined />} onClick={handleSyncTime}>
              校时
            </Button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">网络设置</div>

        <div className="settings-row">
          <div className="settings-label">本机IP</div>
          <div className="settings-control">
            <Form.Item
              name="localIp"
              initialValue="192.168.1.10"
              style={{ marginBottom: 0 }}
              rules={[
                {
                  pattern: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
                  message: '请输入有效的IP地址',
                },
              ]}
            >
              <Input style={{ width: 300 }} placeholder="192.168.1.10" disabled={!networkEditing} />
            </Form.Item>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">子网掩码</div>
          <div className="settings-control">
            <Form.Item
              name="subnetMask"
              initialValue="255.255.255.0"
              style={{ marginBottom: 0 }}
              rules={[
                {
                  pattern: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
                  message: '请输入有效的子网掩码',
                },
              ]}
            >
              <Input style={{ width: 300 }} placeholder="255.255.255.0" disabled={!networkEditing} />
            </Form.Item>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">默认网关</div>
          <div className="settings-control">
            <Form.Item
              name="gateway"
              initialValue="192.168.1.1"
              style={{ marginBottom: 0 }}
              rules={[
                {
                  pattern: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
                  message: '请输入有效的网关',
                },
              ]}
            >
              <Input style={{ width: 300 }} placeholder="192.168.1.1" disabled={!networkEditing} />
            </Form.Item>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">DNS服务器</div>
          <div className="settings-control">
            <Form.Item
              name="dns"
              initialValue="8.8.8.8"
              style={{ marginBottom: 0 }}
              rules={[
                {
                  pattern: /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
                  message: '请输入有效的DNS服务器地址',
                },
              ]}
            >
              <Input style={{ width: 300 }} placeholder="8.8.8.8" disabled={!networkEditing} />
            </Form.Item>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-label">操作</div>
          <div className="settings-control">
            <Space>
              {networkEditing ? (
                <>
                  <Button type="primary" icon={<CheckOutlined />} onClick={handleSaveNetwork}>
                    保存设置
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleCancelEditNetwork}>
                    取消
                  </Button>
                </>
              ) : (
                <Button icon={<EditOutlined />} onClick={handleStartEditNetwork}>
                  修改设置
                </Button>
              )}
            </Space>
          </div>
        </div>
      </div>
    </Form>
  );

  const renderUserSettings = () => (
    <div>
      <div className={pageStyles.userToolbar}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>
          添加账号
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={userColumns}
        dataSource={users}
        pagination={{ pageSize: 10 }}
        bordered
      />

      <Modal
        title={editingUser ? '编辑账号' : '添加账号'}
        open={addUserModalOpen}
        onOk={handleUserSubmit}
        onCancel={() => setAddUserModalOpen(false)}
        okText="确认"
        cancelText="取消"
      >
        <Form form={userForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input placeholder="请输入账号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            dependencies={['password']}
            rules={[
              { required: true, message: '请再次输入密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>
          <Form.Item name="level" label="账号等级" rules={[{ required: true, message: '请选择账号等级' }]}>
            <Select
              placeholder="请选择账号等级"
              options={[
                { value: 'admin', label: '管理员' },
                { value: 'technician', label: '技术员' },
                { value: 'operator', label: '操作员' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  const renderAbout = () => (
    <div className="settings-section">
      <div className="settings-section-title">设备信息</div>

      <div className="settings-row">
        <div className="settings-label">机器人型号</div>
        <div className="settings-control">
          <span className={pageStyles.infoValue}>CR-2026-Pro 复合机器人</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">机器人编号</div>
        <div className="settings-control">
          <span>RB-2026-0715-001</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">激活日期</div>
        <div className="settings-control">
          <span>2026-07-15</span>
        </div>
      </div>

      <div className={pageStyles.sectionTitle}>软件信息</div>

      <div className="settings-row">
        <div className="settings-label">软件名称</div>
        <div className="settings-control">
          <span className={pageStyles.infoValue}>复合机器人调试平台</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">软件版本号</div>
        <div className="settings-control">
          <span>v1.0.0</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">构建时间</div>
        <div className="settings-control">
          <span>2026-07-15</span>
        </div>
      </div>

      <div className={pageStyles.sectionTitle}>技术支持</div>

      <div className="settings-row">
        <div className="settings-label">技术支持方</div>
        <div className="settings-control">
          <span>复合机器人研发团队</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">联系电话</div>
        <div className="settings-control">
          <span>400-888-8888</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">邮箱</div>
        <div className="settings-control">
          <span>support@robot-debug.com</span>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">官网</div>
        <div className="settings-control">
          <a href="#" className={pageStyles.link}>www.robot-debug.com</a>
        </div>
      </div>

      <div className="settings-row">
        <div className="settings-label">版权信息</div>
        <div className="settings-control">
          <span>© 2026 复合机器人研发团队 版权所有</span>
        </div>
      </div>
    </div>
  );

  const pageTitle = activeTab === 'general' ? '通用设置' : activeTab === 'user' ? '用户设置' : '关于';

  return (
    <div>
      <PageHeader title={pageTitle} />
      {activeTab === 'general' && renderGeneralSettings()}
      {activeTab === 'user' && renderUserSettings()}
      {activeTab === 'about' && renderAbout()}
    </div>
  );
}
