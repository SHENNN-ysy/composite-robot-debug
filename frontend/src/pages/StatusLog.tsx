/**
 * 状态日志页（操作日志 / 数据监控两个子页签）。
 *
 * <p>通过 URL 查询参数 ?tab=log|data 切换子页（由侧边菜单跳转时携带），默认为操作日志。</p>
 *
 * <p>操作日志：调用 GET /api/logs/operations（logApi.operations）拉取后端落库的操作记录，
 * 映射为表格行后支持按日期筛选、前端本地分页和导出 CSV；
 * 「设备对象」列结合机械臂/AGV store 的实时在线状态（WebSocket 推送维护）显示在线圆点。</p>
 *
 * <p>数据监控：RealTimeChart 以 1s 周期读取机械臂 store 中由 WebSocket 推送刷新的关节角，
 * 叠加随机扰动绘制 30 点滚动曲线（联调原型的演示效果）；「历史数据」表格为前端生成的模拟数据，
 * 工具栏与筛选器尚未接入真实后端接口。</p>
 */
import { Card, Table, Tag, Button, Space, DatePicker, message, Pagination, Select } from 'antd';
import { DownloadOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRobotArmStore } from '../store/robotArm';
import { useAGVStore } from '../store/agv';
import { useAuthStore } from '../store/auth';
import { useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from 'echarts';
import styles from '../styles/common.module.css';
import pageStyles from './StatusLog.module.css';
import PageHeader from '@/components/common/PageHeader/PageHeader';
import { logApi } from '@/services/api';

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

/** 子页签标识：log=操作日志，data=数据监控；取自 URL 查询参数 tab。 */
type TabKey = 'log' | 'data';

/** 操作日志表格行，由后端 OperationLogRecord（/api/logs/operations）映射而来。 */
interface OperationRecord {
  id: string;
  time: string;
  device: string;
  operation: string;
  operator: string;
  detail: string;
}

/** 数据监控历史表格行；联调原型为前端生成的模拟数据，未接后端。 */
interface DataRecord {
  id: string;
  time: string;
  type: string;
  j1: string;
  j2: string;
  j3: string;
  j4: string;
  j5: string;
  j6: string;
}

/**
 * 实时关节角监控折线图（数据监控页签）。
 *
 * <p>订阅机械臂 store 的 joints（由 WebSocket 推送的 arm.status/device.snapshot 刷新），
 * 以 1s 定时器把最新关节角追加进 30 点滑动窗口并重绘曲线；为演示波动效果叠加了 ±2° 随机扰动。</p>
 */
function RealTimeChart() {
  const joints = useRobotArmStore((state) => state.joints);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  // jointsRef 保存最新关节角供定时器闭包读取，避免 setInterval 捕获到过期的渲染值
  const jointsRef = useRef(joints);
  // 图表数据放在 ref 中维护：每秒仅调用 chart.setOption 增量刷新，不触发 React 重渲染
  const dataRef = useRef<{ time: string[]; series: number[][] }>({
    time: Array.from({ length: 30 }, (_, i) => `${i}s`),
    series: [
      Array.from({ length: 30 }, () => joints.j1),
      Array.from({ length: 30 }, () => joints.j2),
      Array.from({ length: 30 }, () => joints.j3),
      Array.from({ length: 30 }, () => joints.j4),
      Array.from({ length: 30 }, () => joints.j5),
      Array.from({ length: 30 }, () => joints.j6),
    ],
  });

  useEffect(() => {
    jointsRef.current = joints;
  }, [joints]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // echarts 实例只初始化一次，之后靠定时器 setOption 推动画
    const chart = echarts.init(chartContainerRef.current);
    const option: EChartsOption = {
      title: {
        text: '实时数据监控',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 500, color: '#262626' },
      },
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'],
        top: 30,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '80px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dataRef.current.time,
      },
      yAxis: {
        type: 'value',
        name: '角度 (°)',
        axisLabel: { formatter: '{value}°' },
      },
      series: [
        { name: 'J1', type: 'line', data: dataRef.current.series[0], smooth: true, color: '#f58020' },
        { name: 'J2', type: 'line', data: dataRef.current.series[1], smooth: true, color: '#1890ff' },
        { name: 'J3', type: 'line', data: dataRef.current.series[2], smooth: true, color: '#52c41a' },
        { name: 'J4', type: 'line', data: dataRef.current.series[3], smooth: true, color: '#722ed1' },
        { name: 'J5', type: 'line', data: dataRef.current.series[4], smooth: true, color: '#faad14' },
        { name: 'J6', type: 'line', data: dataRef.current.series[5], smooth: true, color: '#ff4d4f' },
      ],
    };

    chart.setOption(option);

    // 每秒把 30 点滑动窗口左移一格，追加最新关节角（叠加 ±2° 随机扰动模拟现场波动）
    const interval = window.setInterval(() => {
      const nextSecond = Number.parseInt(dataRef.current.time[dataRef.current.time.length - 1], 10) + 1;
      dataRef.current.time = [...dataRef.current.time.slice(1), `${nextSecond}s`];

      const jointKeys = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'] as const;
      dataRef.current.series = dataRef.current.series.map((series, index) => [
        ...series.slice(1),
        jointsRef.current[jointKeys[index]] + (Math.random() * 4 - 2),
      ]);

      chart.setOption({
        xAxis: { data: dataRef.current.time },
        series: dataRef.current.series.map((data) => ({ data })),
      });
    }, 1000);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      // 卸载时清理定时器与 resize 监听并销毁图表实例，防止内存泄漏与重复绘制
      window.clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  return <div ref={chartContainerRef} className={pageStyles.chartContainer} />;
}

/** 状态日志页组件：操作日志（真实后端数据）与数据监控（联调原型演示）两个子页签。 */
export default function StatusLog() {
  const [searchParams] = useSearchParams();
  // 子页签来自 URL 查询参数（侧边菜单跳转时携带 ?tab=log|data），默认操作日志
  const tab: TabKey = (searchParams.get('tab') as TabKey) || 'log';

  const robotArm = useRobotArmStore();
  const agv = useAGVStore();
  const currentUser = useAuthStore((state) => state.username);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [records, setRecords] = useState<OperationRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  /** 从后端重新加载操作日志，并统一维护表格加载状态和错误提示。 */
  const loadOperationLogs = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const items = await logApi.operations();
      // targetType→设备对象、action→操作、operatorName→操作者、详情优先取 detailJson 否则 result
      setRecords(items.map((item) => ({
          id: String(item.id),
          time: dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
          device: item.targetType,
          operation: item.action,
          operator: item.operatorName || 'unknown',
          detail: item.detailJson || item.result,
      })));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作日志加载失败';
      message.error(errorMessage);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  // 进入操作日志页签时自动加载数据库中的最新记录。
  useEffect(() => {
    if (tab === 'log') void loadOperationLogs();
  }, [tab, loadOperationLogs]);

  // 数据监控相关
  const [timeRange, setTimeRange] = useState('30s'); // 图表时间范围，仅界面状态，暂未作用于数据
  const [chartType, setChartType] = useState('all'); // 图表关节筛选，仅界面状态，暂未作用于数据
  // 历史数据表格：前端按每分钟一条生成 50 条模拟记录，联调原型未接后端历史接口
  const [dataRecords] = useState<DataRecord[]>(() => {
    const records: DataRecord[] = [];
    const now = new Date();
    for (let i = 0; i < 50; i++) {
      const time = new Date(now.getTime() - i * 60000);
      records.push({
        id: `record-${i}`,
        time: time.toLocaleString('zh-CN'),
        type: ['角度变化', '速度变化', '位置变化'][i % 3],
        j1: (Math.random() * 10 - 5).toFixed(1),
        j2: (Math.random() * 10 - 45).toFixed(1),
        j3: (Math.random() * 10 + 85).toFixed(1),
        j4: (Math.random() * 10 - 5).toFixed(1),
        j5: (Math.random() * 10 + 40).toFixed(1),
        j6: (Math.random() * 10 - 5).toFixed(1),
      });
    }
    return records;
  });

  // 把日志中的设备名称映射到对应 store 的实时在线状态；无法识别的设备默认按在线显示
  const deviceConnected = (device: string) => {
    if (device === '机械臂') return robotArm.isConnected;
    if (device === 'AGV') return agv.isConnected;
    return true;
  };

  // 联调展示用：把最新一条记录的操作者强制显示为当前登录用户（表格中再高亮为「我」）
  const enrichedRecords = useMemo(() => {
    return records.map((r, idx) => {
      if (idx === 0 && currentUser) {
        return { ...r, operator: currentUser };
      }
      return r;
    });
  }, [records, currentUser]);

  // 日期筛选：未选日期显示全部；选了日期则按「天」粒度过滤，全部在前端完成
  const filteredRecords = useMemo(() => {
    const list = enrichedRecords;
    if (!selectedDate) return list;
    return list.filter((r) => dayjs(r.time).isSame(selectedDate, 'day'));
  }, [enrichedRecords, selectedDate]);

  // 导出当前筛选结果为 CSV：前端拼接、浏览器下载，不经过后端
  const handleExport = () => {
    if (filteredRecords.length === 0) {
      message.warning('当前没有可导出的日志');
      return;
    }
    const header = ['时间', '设备对象', '操作', '操作者', '详情'];
    const rows = filteredRecords.map((r) => [r.time, r.device, r.operation, r.operator, r.detail]);
    const csv = [header, ...rows]
      // 每字段加双引号包裹并转义内部引号，防止内容中的逗号/换行破坏 CSV 结构
      .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    // 前置 BOM（\ufeff）保证 Excel 打开 CSV 时中文不乱码
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `状态日志_${dayjs().format('YYYYMMDD_HHmmss')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success(`已导出 ${filteredRecords.length} 条日志`);
  };

  // 操作日志为前端本地分页（后端一次返回全部记录）
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]); // 切换筛选日期后回到第一页，避免停留在超出结果范围的页码

  // 数据监控历史表格列定义（数据源为前端模拟数据）
  const dataColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 180 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 120, render: (type: string) => {
      const colors: Record<string, string> = {
        '角度变化': 'blue',
        '速度变化': 'green',
        '位置变化': 'orange',
      };
      return <Tag color={colors[type] || 'default'}>{type}</Tag>;
    }},
    { title: 'J1', dataIndex: 'j1', key: 'j1', width: 80 },
    { title: 'J2', dataIndex: 'j2', key: 'j2', width: 80 },
    { title: 'J3', dataIndex: 'j3', key: 'j3', width: 80 },
    { title: 'J4', dataIndex: 'j4', key: 'j4', width: 80 },
    { title: 'J5', dataIndex: 'j5', key: 'j5', width: 80 },
    { title: 'J6', dataIndex: 'j6', key: 'j6', width: 80 },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: DataRecord) => (
        <Button type="link" size="small" onClick={() => console.log('查看详情', record)}>
          详情
        </Button>
      ),
    },
  ];

  const total = filteredRecords.length;
  // 本地分页切片：从筛选结果中截取当前页
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);
  // 操作日志表格列：设备对象列叠加实时在线圆点，操作者列把当前用户高亮为「我」
  const recordColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 170 },
    {
      title: '设备对象',
      dataIndex: 'device',
      key: 'device',
      width: 110,
      render: (val: string) => {
        const online = deviceConnected(val);
        return (
          <Tag color={online ? 'geekblue' : 'default'} style={{ opacity: online ? 1 : 0.6 }}>
            {online ? '● ' : '○ '}{val}
          </Tag>
        );
      },
    },
    { title: '操作', dataIndex: 'operation', key: 'operation', width: 130 },
    {
      title: '操作者',
      dataIndex: 'operator',
      key: 'operator',
      width: 110,
      render: (val: string) => (
        <Tag color={val === currentUser ? 'blue' : 'default'}>
          {val === currentUser ? `${val}（我）` : val}
        </Tag>
      ),
    },
    { title: '详情', dataIndex: 'detail', key: 'detail' },
  ];

  const pageTitle = tab === 'log' ? '操作日志' : '数据监控';

  // 操作日志页签：日期筛选 + 导出 + 本地分页表格
  const renderOperationLog = () => (
    <>
      <Card size="small" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <Space size={12} wrap>
          <span className={styles.textSecondary}>日志日期：</span>
          <DatePicker
            value={selectedDate}
            onChange={(val) => setSelectedDate(val)}
            allowClear
            placeholder="选择日期"
          />
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出日志
          </Button>
          <Button icon={<ReloadOutlined />} loading={recordsLoading} onClick={() => void loadOperationLogs()}>
            刷新
          </Button>
        </Space>
      </Card>

      <Card title="操作记录" size="small" styles={{ header: { fontSize: 14 } }}>
        <Table
          rowKey="id"
          columns={recordColumns}
          dataSource={pagedRecords}
          loading={recordsLoading}
          size="small"
          pagination={false}
          footer={() => (
            <div className={pageStyles.footer}>
              <span className={pageStyles.footerInfo}>
                共 {total} 条记录
                {selectedDate && `（${selectedDate.format('YYYY-MM-DD')}）`}
              </span>
              <Select
                size="small"
                value={pageSize}
                onChange={(v) => {
                  setPageSize(v);
                  setCurrentPage(1);
                }}
                style={{ width: 110 }}
                options={[
                  { value: 10, label: '10/页' },
                  { value: 20, label: '20/页' },
                  { value: 50, label: '50/页' },
                ]}
              />
              <Pagination
                size="small"
                current={currentPage}
                pageSize={pageSize}
                total={total}
                showSizeChanger={false}
                showQuickJumper
                onChange={(p) => setCurrentPage(p)}
                locale={{ jump_to: '跳至', page: '页' }}
              />
            </div>
          )}
          locale={{ emptyText: '所选日期暂无日志' }}
        />
      </Card>
    </>
  );

  // 历史数据表格：工具栏按钮（导出/清空/范围筛选）均为占位 UI，尚未实现
  const renderDataTable = () => (
    <Card variant="borderless">
      <div className={pageStyles.tableToolbar}>
        <Space>
          <Button icon={<DownloadOutlined />}>导出CSV</Button>
          <Button icon={<DownloadOutlined />}>导出Excel</Button>
          <Button danger icon={<DeleteOutlined />}>清空数据</Button>
        </Space>
        <Space>
          <DatePicker.RangePicker />
          <Select defaultValue="20" style={{ width: 100 }}>
            <Select.Option value="10">10条/页</Select.Option>
            <Select.Option value="20">20条/页</Select.Option>
            <Select.Option value="50">50条/页</Select.Option>
          </Select>
        </Space>
      </div>
      <Table
        dataSource={dataRecords}
        columns={dataColumns}
        rowKey="id"
        size="small"
        pagination={{ pageSize: 20, showSizeChanger: false }}
      />
    </Card>
  );

  // 数据监控页签：上方实时曲线 + 下方历史数据表格；
  // 关节/时间范围筛选与刷新按钮目前仅维护界面状态，未真正作用于图表与表格数据
  const renderDataMonitor = () => (
    <>
      <Card variant="borderless" style={{ marginBottom: 16 }}>
        <div className={pageStyles.toolbar}>
          <Space>
            <Select value={chartType} onChange={setChartType} style={{ width: 120 }}>
              <Select.Option value="all">全部关节</Select.Option>
              <Select.Option value="j1">J1</Select.Option>
              <Select.Option value="j2">J2</Select.Option>
              <Select.Option value="j3">J3</Select.Option>
            </Select>
            <Select value={timeRange} onChange={setTimeRange} style={{ width: 120 }}>
              <Select.Option value="30s">30秒</Select.Option>
              <Select.Option value="1m">1分钟</Select.Option>
              <Select.Option value="5m">5分钟</Select.Option>
            </Select>
          </Space>
          <Button icon={<ReloadOutlined />}>刷新</Button>
        </div>
        <RealTimeChart />
      </Card>

      <Card variant="borderless">
        <div className={pageStyles.sectionTitle}>历史数据</div>
        {renderDataTable()}
      </Card>
    </>
  );

  return (
    <div>
      <PageHeader title={pageTitle} />
      {tab === 'log' ? renderOperationLog() : renderDataMonitor()}
    </div>
  );
}
