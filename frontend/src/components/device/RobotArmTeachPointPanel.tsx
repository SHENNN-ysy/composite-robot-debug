/**
 * 机械臂示教点面板。
 *
 * <p>示教点 = 名称 + 笛卡尔位姿（X/Y/Z/RX/RY/RZ）+ 六轴关节角（J1~J6），
 * 用于把机械臂当前姿态记录下来、之后一键复现。面板提供按名称搜索、添加、编辑、
 * 「覆盖」（用机械臂当前位置刷新点位）、运行和删除。</p>
 *
 * <p>与后端的交互分两条通道：
 * - 持久化走 REST /api/teach-points（teachPointApi：GET 列表 / POST 新增 / PUT 更新 / DELETE 删除），落库 MySQL；
 * - “运行”调用 `POST /api/control/arm/teach-point/run`，请求体为
 *   {pointId, name, pose, joints}；返回“已受理”仅表示后端完成记录，不代表控制系统已执行。</p>
 *
 * <p>机械臂当前 TCP 位姿与关节角由父页面从 useRobotArmStore 传入（WebSocket 推送的实时值）。</p>
 */
import {
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { teachPointApi } from '@/services/api';
import type { CartesianPose, JointState, TeachPoint } from '@/store/robotArm';
import panelStyles from './RobotArmPanels.module.css';

/** 示教点编辑表单不允许修改内部 ID。 */
type TeachPointFormValues = Omit<TeachPoint, 'id'>;

/** 示教点面板组件对外参数。 */
interface RobotArmTeachPointPanelProps {
  /** 机械臂当前 TCP 笛卡尔位姿（WebSocket 实时值），用于新增/覆盖点位时取当前位置。 */
  tcp: CartesianPose;
  /** 机械臂当前六轴关节角（WebSocket 实时值），同上。 */
  joints: JointState;
  /** 运行示教点回调，即 store.runTeachPoint；返回是否被后端受理。 */
  onRun: (point: TeachPoint) => Promise<boolean>;
}

/** 所有数值字段按笛卡尔位姿和关节角度分组展示。 */
const numericFields: { key: keyof Omit<TeachPointFormValues, 'name'>; label: string; group: 'pose' | 'joint' }[] = [
  { key: 'x', label: 'X', group: 'pose' },
  { key: 'y', label: 'Y', group: 'pose' },
  { key: 'z', label: 'Z', group: 'pose' },
  { key: 'rx', label: 'RX', group: 'pose' },
  { key: 'ry', label: 'RY', group: 'pose' },
  { key: 'rz', label: 'RZ', group: 'pose' },
  { key: 'j1', label: 'J1', group: 'joint' },
  { key: 'j2', label: 'J2', group: 'joint' },
  { key: 'j3', label: 'J3', group: 'joint' },
  { key: 'j4', label: 'J4', group: 'joint' },
  { key: 'j5', label: 'J5', group: 'joint' },
  { key: 'j6', label: 'J6', group: 'joint' },
];

/**
 * 机械臂示教点面板，负责添加、编辑、当前位置覆盖、运行和删除。
 *
 * <p>示教点通过 REST 接口持久化到 MySQL，运行指令仍通过 WebSocket 下发。</p>
 */
export default function RobotArmTeachPointPanel({
  tcp,
  joints,
  onRun,
}: RobotArmTeachPointPanelProps) {
  const [form] = Form.useForm<TeachPointFormValues>();
  const [points, setPoints] = useState<TeachPoint[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  /** 页面加载时从后端读取示教点，卸载后不再写入组件状态。 */
  useEffect(() => {
    let active = true;
    setLoading(true);
    teachPointApi.list()
      .then((result) => {
        if (active) setPoints(result);
      })
      .catch(() => {
        if (active) message.error('示教点加载失败，请检查后端服务');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  /** 使用机械臂当前位姿构建表单默认值。 */
  const currentPositionValues = (name: string): TeachPointFormValues => ({
    name,
    ...tcp,
    ...joints,
  });

  /** 打开新增对话框，并以当前机械臂位置作为初始坐标。 */
  const openCreateModal = () => {
    setEditingId(null);
    let sequence = 1;
    while (points.some((point) => point.name.toLowerCase() === `point${sequence}`)) sequence += 1;
    form.setFieldsValue(currentPositionValues(`Point${sequence}`));
    setModalOpen(true);
  };

  /** 打开编辑对话框并回填当前行。 */
  const openEditModal = (point: TeachPoint) => {
    const { id: _id, ...values } = point;
    setEditingId(point.id);
    form.setFieldsValue(values);
    setModalOpen(true);
  };

  /** 校验表单后新增或更新示教点。 */
  const savePoint = async () => {
    try {
      const values = await form.validateFields();
      if (editingId !== null) {
        const saved = await teachPointApi.update(editingId, values);
        setPoints((current) => current.map((point) => (point.id === editingId ? saved : point)));
        message.success('示教点已更新');
      } else {
        const saved = await teachPointApi.create(values);
        setPoints((current) => [saved, ...current]);
        message.success('示教点已添加');
      }
      setModalOpen(false);
      form.resetFields();
    } catch (error) {
      if (error instanceof Error && !error.message.includes('validateFields')) {
        message.error('示教点保存失败，请检查名称是否重复或后端服务是否正常');
      }
    }
  };

  /** 用控制系统最新上报的 TCP 位姿和关节角度覆盖指定点位。 */
  const overwritePoint = async (point: TeachPoint) => {
    try {
      const saved = await teachPointApi.update(point.id, {
        name: point.name,
        ...tcp,
        ...joints,
      });
      setPoints((current) => current.map((item) => (item.id === point.id ? saved : item)));
      message.success(`已用当前位置覆盖“${point.name}”`);
    } catch {
      message.error(`覆盖示教点“${point.name}”失败`);
    }
  };

  /** 运行示教点并反馈同步下发结果；设备执行结果由全局消息统一提示。 */
  const runPoint = async (point: TeachPoint) => {
    try {
      const accepted = await onRun(point);
      if (!accepted) {
        message.warning('示教点运行请求未被后端受理');
        return;
      }
      message.info(`示教点“${point.name}”控制请求已受理`);
    } catch {
      message.error(`示教点“${point.name}”运行指令发送失败`);
    }
  };

  /** 删除指定示教点。 */
  const deletePoint = async (point: TeachPoint) => {
    try {
      await teachPointApi.remove(point.id);
      setPoints((current) => current.filter((item) => item.id !== point.id));
      message.success(`示教点“${point.name}”已删除`);
    } catch {
      message.error(`删除示教点“${point.name}”失败`);
    }
  };

  /** 名称搜索只影响表格显示，不修改原始示教点列表。 */
  const filteredPoints = useMemo(
    () => points.filter((point) => point.name.toLowerCase().includes(keyword.trim().toLowerCase())),
    [keyword, points],
  );

  /** 公共数值列格式，固定三位小数并提供足够宽度。 */
  const valueColumn = (
    key: keyof Omit<TeachPointFormValues, 'name'>,
    title: string,
  ): ColumnsType<TeachPoint>[number] => ({
    title,
    dataIndex: key,
    key,
    width: 92,
    align: 'center',
    render: (value: number) => (
      <span className={panelStyles.teachPointValue}>{value.toFixed(3)}</span>
    ),
  });

  const columns: ColumnsType<TeachPoint> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      fixed: 'left',
      align: 'center',
      render: (name: string) => <span className={panelStyles.teachPointValue}>{name}</span>,
    },
    ...numericFields.map((field) => valueColumn(field.key, field.label)),
    {
      title: '操作',
      key: 'actions',
      width: 300,
      fixed: 'right',
      align: 'center',
      render: (_, point) => (
        <div className={panelStyles.teachPointActions}>
          <Tooltip title="用机械臂当前位置覆盖">
            <Button type="link" icon={<ReloadOutlined />} onClick={() => overwritePoint(point)}>覆盖</Button>
          </Tooltip>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditModal(point)}>编辑</Button>
          <Button
            type="link"
            icon={<CaretRightOutlined />}
            onClick={() => runPoint(point)}
          >
            运行
          </Button>
          <Popconfirm
            title="删除示教点"
            description={`确定删除“${point.name}”吗？`}
            okText="删除"
            cancelText="取消"
            onConfirm={() => deletePoint(point)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card
        className={panelStyles.panelCard}
        title={<span><EnvironmentOutlined /> 示教点</span>}
        extra={(
          <Space>
            <Input
              allowClear
              value={keyword}
              prefix={<SearchOutlined />}
              placeholder="请输入名称"
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>添加</Button>
          </Space>
        )}
      >
        <Table<TeachPoint>
          rowKey="id"
          size="middle"
          bordered
          columns={columns}
          dataSource={filteredPoints}
          loading={loading}
          scroll={{ x: 1560 }}
          pagination={{
            pageSize: 8,
            showSizeChanger: true,
            pageSizeOptions: [8, 10, 20],
            showTotal: (total) => `共 ${total} 条数据`,
          }}
          locale={{ emptyText: '暂无示教点，请点击右上角“添加”创建' }}
        />
      </Card>

      <Modal
        width={820}
        title={editingId ? '编辑示教点' : '添加示教点'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        onOk={savePoint}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        destroyOnClose
      >
        <Form<TeachPointFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          className={panelStyles.teachPointForm}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[
              { required: true, whitespace: true, message: '请输入示教点名称' },
              { max: 64, message: '名称不能超过 64 个字符' },
            ]}
          >
            <Input placeholder="请输入示教点名称" maxLength={64} />
          </Form.Item>

          <div className={panelStyles.formSectionTitle}>笛卡尔位姿</div>
          <Row gutter={16}>
            {numericFields.filter((field) => field.group === 'pose').map((field) => (
              <Col xs={12} md={8} key={field.key}>
                <Form.Item
                  label={field.label}
                  name={field.key}
                  rules={[{ required: true, message: `请输入 ${field.label}` }]}
                >
                  <InputNumber className={panelStyles.coordinateInput} precision={3} step={0.1} />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <div className={panelStyles.formSectionTitle}>关节角度</div>
          <Row gutter={16}>
            {numericFields.filter((field) => field.group === 'joint').map((field) => (
              <Col xs={12} md={8} key={field.key}>
                <Form.Item
                  label={field.label}
                  name={field.key}
                  rules={[{ required: true, message: `请输入 ${field.label}` }]}
                >
                  <InputNumber
                    className={panelStyles.coordinateInput}
                    min={-360}
                    max={360}
                    precision={3}
                    step={0.1}
                    addonAfter="°"
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Form>
      </Modal>
    </>
  );
}
