import { Card, Table, Tag, Button, Space, DatePicker, message, Pagination, Select } from 'antd';
import { DownloadOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useRobotArmStore } from '../store/robotArm';
import { useAGVStore } from '../store/agv';
import { useAuthStore } from '../store/auth';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState, useRef } from 'react';
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

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
]);

type TabKey = 'log' | 'data';

interface OperationRecord {
  id: string;
  time: string;
  device: string;
  operation: string;
  operator: string;
  detail: string;
}

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

function RealTimeChart() {
  const joints = useRobotArmStore((state) => state.joints);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const jointsRef = useRef(joints);
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
      window.clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, []);

  return <div ref={chartContainerRef} className={pageStyles.chartContainer} />;
}

const initialRecords: OperationRecord[] = [
  { id: '1',  time: '2026-07-15 19:23:10', device: '机械臂', operation: '关节运动', operator: 'admin', detail: '执行完成' },
  { id: '2',  time: '2026-07-15 19:21:05', device: '机械臂', operation: '位置示教', operator: 'user',  detail: '示教点已保存' },
  { id: '3',  time: '2026-07-15 19:18:42', device: '机械臂', operation: '原点复归', operator: 'admin', detail: '原点复归完成' },
  { id: '4',  time: '2026-07-15 19:15:30', device: '机械臂', operation: '速度设置', operator: 'user',  detail: '速度已调整为50%' },
  { id: '5',  time: '2026-07-15 19:10:15', device: '机械臂', operation: '急停触发', operator: 'admin', detail: '急停按钮被按下' },
  { id: '6',  time: '2026-07-15 19:05:00', device: 'AGV',    operation: '导航到站点', operator: 'user',  detail: '前往工位1' },
  { id: '7',  time: '2026-07-15 18:52:21', device: '机械臂', operation: 'IO控制',    operator: 'admin', detail: '夹爪开合完成' },
  { id: '8',  time: '2026-07-15 18:45:08', device: 'AGV',    operation: '路径规划',  operator: 'user',  detail: '重新规划路径' },
  { id: '9',  time: '2026-07-15 18:33:55', device: '机械臂', operation: '示教保存',  operator: 'admin', detail: '保存示教点 P12' },
  { id: '10', time: '2026-07-15 18:20:11', device: '机械臂', operation: '坐标设定',  operator: 'user',  detail: '更新基坐标系' },
  { id: '11', time: '2026-07-15 18:10:02', device: 'AGV',    operation: '充电管理',  operator: 'admin', detail: '返回充电桩' },
  { id: '12', time: '2026-07-15 17:58:46', device: '机械臂', operation: '关节运动',  operator: 'user',  detail: '运动中...' },
  { id: '13', time: '2026-07-15 17:42:30', device: '机械臂', operation: '原点复归',  operator: 'admin', detail: '原点复归完成' },
  { id: '14', time: '2026-07-15 17:30:15', device: 'AGV',    operation: '避障上报',  operator: 'user',  detail: '检测到障碍物已规避' },
  { id: '15', time: '2026-07-15 17:22:09', device: '机械臂', operation: '模式切换',  operator: 'admin', detail: '切换至自动模式' },
  { id: '16', time: '2026-07-15 17:15:00', device: '机械臂', operation: '速度设置',  operator: 'user',  detail: '速度已调整为30%' },
  { id: '17', time: '2026-07-15 17:05:33', device: 'AGV',    operation: '任务下发',  operator: 'admin', detail: '已派发搬运任务' },
  { id: '18', time: '2026-07-15 16:58:20', device: '机械臂', operation: '关节运动',  operator: 'user',  detail: '执行完成' },
  { id: '19', time: '2026-07-15 16:45:12', device: '机械臂', operation: '坐标读取',  operator: 'admin', detail: '读取当前位置' },
  { id: '20', time: '2026-07-15 16:30:00', device: 'AGV',    operation: '低电警告',  operator: 'system',detail: '剩余电量18%' },
  { id: '21', time: '2026-07-14 18:08:00', device: 'AGV',    operation: '模式切换',  operator: 'admin', detail: '已切换至手动模式' },
  { id: '22', time: '2026-07-14 17:05:33', device: 'AGV',    operation: '关节运动',  operator: 'user',  detail: '运动中...' },
  { id: '23', time: '2026-07-14 16:42:10', device: '机械臂', operation: '关节运动',  operator: 'admin', detail: '执行完成' },
  { id: '24', time: '2026-07-14 15:33:48', device: '机械臂', operation: 'IO控制',    operator: 'user',  detail: '夹爪闭合' },
  { id: '25', time: '2026-07-14 14:21:05', device: 'AGV',    operation: '导航到站点', operator: 'admin', detail: '前往工位2' },
];

export default function StatusLog() {
  const [searchParams] = useSearchParams();
  const tab: TabKey = (searchParams.get('tab') as TabKey) || 'log';

  const robotArm = useRobotArmStore();
  const agv = useAGVStore();
  const currentUser = useAuthStore((state) => state.username);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [records] = useState<OperationRecord[]>(initialRecords);

  // 数据监控相关
  const [timeRange, setTimeRange] = useState('30s');
  const [chartType, setChartType] = useState('all');
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

  const deviceConnected = (device: string) => {
    if (device === '机械臂') return robotArm.isConnected;
    if (device === 'AGV') return agv.isConnected;
    return true;
  };

  const enrichedRecords = useMemo(() => {
    return records.map((r, idx) => {
      if (idx === 0 && currentUser) {
        return { ...r, operator: currentUser };
      }
      return r;
    });
  }, [records, currentUser]);

  const filteredRecords = useMemo(() => {
    const list = enrichedRecords;
    if (!selectedDate) return list;
    return list.filter((r) => dayjs(r.time).isSame(selectedDate, 'day'));
  }, [enrichedRecords, selectedDate]);

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      message.warning('当前没有可导出的日志');
      return;
    }
    const header = ['时间', '设备对象', '操作', '操作者', '详情'];
    const rows = filteredRecords.map((r) => [r.time, r.device, r.operation, r.operator, r.detail]);
    const csv = [header, ...rows]
      .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
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

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

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
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);
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
        </Space>
      </Card>

      <Card title="操作记录" size="small" styles={{ header: { fontSize: 14 } }}>
        <Table
          rowKey="id"
          columns={recordColumns}
          dataSource={pagedRecords}
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
