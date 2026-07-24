/**
 * 系统设置页（通用设置 / 用户设置 / 关于 三个子页签）。
 *
 * <p>业务职责：
 * - 通用设置：时间设置（系统时间展示与校时）与网络设置（本机IP/子网掩码/网关/DNS 可编辑，
 *   联调原型仅界面展示与格式校验，不真正修改 Ubuntu 网络配置）；
 * - 用户设置：登录账号的增删改查，对接 REST /api/users（userApi），含角色与启用状态管理；
 * - 关于：设备信息、软件信息与技术支持联系方式（静态展示）。</p>
 *
 * <p>子页签由父级通过 initialTab 指定（路由菜单跳转），页内再以 activeTab 维护当前选中项。</p>
 */
import { useEffect, useState } from 'react';
import { Button, Form, Input, message, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import {
  CheckOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageHeader from '@/components/common/PageHeader/PageHeader';
import { userApi } from '@/services/api';
import type { UserAccount, UserRole, UserSaveRequest } from '@/types/backend';
import pageStyles from './Settings.module.css';

/** 设置页子页签：general=通用设置，user=用户设置，about=关于（设备/软件信息）。 */
export type SettingsTab = 'general' | 'user' | 'about';

interface SettingsProps {
  /** 初始子页签，由路由/菜单决定进入哪个设置分区。 */
  initialTab?: SettingsTab;
}

/** 用户编辑表单值：在后端 UserSaveRequest 基础上额外带仅前端校验用的确认密码。 */
interface UserFormValues extends UserSaveRequest {
  confirmPassword?: string;
}

/** 角色枚举到表格 Tag 配色与中文名的映射。 */
const roleMap: Record<UserRole, { color: string; label: string }> = {
  SUPER_ADMIN: { color: 'magenta', label: '超级管理员' },
  ADMIN: { color: 'red', label: '管理员' },
  TECHNICIAN: { color: 'cyan', label: '技术员' },
  USER: { color: 'orange', label: '普通用户' },
};

/** IPv4 地址格式校验（本机IP/子网掩码/网关/DNS 共用）。 */
const ipPattern = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

/** 统一提取后端/表单校验抛出的错误文案；非 Error 一律兜底为「操作失败」。 */
const errorText = (error: unknown) => error instanceof Error ? error.message : '操作失败';

/** 系统设置页组件：按 activeTab 渲染通用/用户/关于三个分区。 */
export default function Settings({ initialTab = 'general' }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  // editingUser 为 null 表示「添加」模式，非 null 表示「编辑」模式，共用同一个 Modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm] = Form.useForm<UserFormValues>();
  // 通用设置：网络参数表单与编辑态；系统时间每秒刷新一次
  const [networkForm] = Form.useForm();
  const [networkEditing, setNetworkEditing] = useState(false);
  const [currentTime, setCurrentTime] = useState(dayjs());

  useEffect(() => setActiveTab(initialTab), [initialTab]);

  // 进入「用户设置」页签才拉取账号列表
  useEffect(() => {
    if (activeTab === 'user') void loadUsers();
  }, [activeTab]);

  // 系统时间每秒刷新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /** GET /api/users：加载全部登录账号。 */
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      setUsers(await userApi.list());
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setUsersLoading(false);
    }
  };

  /** 校时：将显示时间同步为系统当前时间（联调原型仅前端展示，不下发设备）。 */
  const handleSyncTime = () => {
    setCurrentTime(dayjs());
    message.success('校时成功，已同步至系统当前时间');
  };

  /** 进入网络设置编辑态。 */
  const handleStartEditNetwork = () => {
    setNetworkEditing(true);
  };

  /** 取消网络设置修改：恢复表单原值并退出编辑态。 */
  const handleCancelEditNetwork = () => {
    networkForm.resetFields(['localIp', 'subnetMask', 'gateway', 'dns']);
    setNetworkEditing(false);
    message.info('已取消修改');
  };

  /** 保存网络设置：先做 IPv4 格式校验，通过后退出编辑态（联调原型不真正下发系统）。 */
  const handleSaveNetwork = async () => {
    try {
      const values = await networkForm.validateFields(['localIp', 'subnetMask', 'gateway', 'dns']);
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
      // 表单校验失败，antd 已就地提示
    }
  };

  /** 打开「添加账号」对话框：清空表单并给角色/启用填默认值。 */
  const openCreateUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    userForm.setFieldsValue({ role: 'USER', enabled: true });
    setUserModalOpen(true);
  };

  /** 打开「编辑账号」对话框：回填账号信息，密码置空（留空即不修改密码）。 */
  const openEditUser = (user: UserAccount) => {
    setEditingUser(user);
    userForm.setFieldsValue({
      username: user.username,
      nickname: user.nickname,
      role: user.role,
      enabled: user.enabled,
      password: '',
      confirmPassword: '',
    });
    setUserModalOpen(true);
  };

  /**
   * 保存账号：编辑走 PUT /api/users/{id}，新增走 POST /api/users。
   *
   * <p>编辑时密码留空则请求体不带 password 字段，后端保留原密码；
   * 表单校验失败（validateFields 抛错）属于正常分支，只在是真正的 Error 时才提示。</p>
   */
  const saveUser = async () => {
    try {
      const values = await userForm.validateFields();
      const request: UserSaveRequest = {
        username: values.username,
        nickname: values.nickname,
        role: values.role,
        enabled: values.enabled,
        ...(values.password ? { password: values.password } : {}),
      };
      if (editingUser) await userApi.update(editingUser.id, request);
      else await userApi.create(request);
      setUserModalOpen(false);
      message.success(editingUser ? '账号已更新' : '账号已添加');
      await loadUsers();
    } catch (error) {
      if (error instanceof Error) message.error(errorText(error));
    }
  };

  /** 删除账号：DELETE /api/users/{id}；二次确认后执行，超级管理员在表格中已被禁用此入口。 */
  const removeUser = (user: UserAccount) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除账号“${user.username}”吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        await userApi.remove(user.id);
        message.success('账号已删除');
        await loadUsers();
      },
    });
  };

  // 账号表格列：删除按钮对 SUPER_ADMIN 禁用，防止误删超级管理员
  const userColumns = [
    { title: '账号', dataIndex: 'username', key: 'username' },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
    { title: '密码', key: 'password', render: (_: unknown, user: UserAccount) => user.passwordSet ? '已设置' : '未设置' },
    {
      title: '账号等级', dataIndex: 'role', key: 'role',
      render: (role: UserRole) => <Tag color={roleMap[role].color}>{roleMap[role].label}</Tag>,
    },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', render: (enabled: boolean) => enabled ? '启用' : '停用' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => dayjs(value).format('YYYY-MM-DD') },
    {
      title: '操作', key: 'action', render: (_: unknown, user: UserAccount) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditUser(user)}>编辑</Button>
          <Button type="link" danger size="small" icon={<DeleteOutlined />} disabled={user.role === 'SUPER_ADMIN'} onClick={() => removeUser(user)}>删除</Button>
        </Space>
      ),
    },
  ];

  // 通用设置：时间设置 + 网络设置；网络参数仅界面展示与校验，不真正下发到 Ubuntu 系统
  const renderGeneral = () => (
    <Form form={networkForm} layout="vertical">
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
              rules={[{ pattern: ipPattern, message: '请输入有效的IP地址' }]}
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
              rules={[{ pattern: ipPattern, message: '请输入有效的子网掩码' }]}
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
              rules={[{ pattern: ipPattern, message: '请输入有效的网关' }]}
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
              rules={[{ pattern: ipPattern, message: '请输入有效的DNS服务器地址' }]}
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

  const renderUsers = () => (
    <div>
      <div className={pageStyles.userToolbar}><Button type="primary" icon={<PlusOutlined />} onClick={openCreateUser}>添加账号</Button></div>
      <Table rowKey="id" columns={userColumns} dataSource={users} loading={usersLoading} pagination={{ pageSize: 10 }} bordered />
    </div>
  );

  // 关于：设备信息、软件信息与技术支持，静态展示
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
      {activeTab === 'general' && renderGeneral()}
      {activeTab === 'user' && renderUsers()}
      {activeTab === 'about' && renderAbout()}

      <Modal title={editingUser ? '编辑账号' : '添加账号'} open={userModalOpen} onOk={saveUser} onCancel={() => setUserModalOpen(false)} okText="确认" cancelText="取消">
        <Form form={userForm} layout="vertical">
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}><Input /></Form.Item>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}><Input /></Form.Item>
          <Form.Item name="password" label={editingUser ? '新密码（留空不修改）' : '密码'} rules={[{ required: !editingUser, message: '请输入密码' }]}><Input.Password /></Form.Item>
          <Form.Item name="confirmPassword" label="确认密码" dependencies={['password']} rules={[({ getFieldValue }) => ({ validator(_, value) { const password = getFieldValue('password'); return !password || password === value ? Promise.resolve() : Promise.reject(new Error('两次输入的密码不一致')); } })]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="账号等级" rules={[{ required: true }]}><Select options={Object.entries(roleMap).map(([value, item]) => ({ value, label: item.label }))} /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
