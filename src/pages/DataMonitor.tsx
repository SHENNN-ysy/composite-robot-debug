import { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Table, Button, Space, Select, DatePicker, Tabs, Tag } from 'antd';
import { Line } from '@ant-design/charts';
import * as echarts from 'echarts';
import { DownloadOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useRobotArmStore } from '../store/robotArm';

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

export default function DataMonitor() {
  const robotArm = useRobotArmStore();
  const chartRef = useRef<HTMLDivElement>(null);
  const [timeRange, setTimeRange] = useState('30s');
  const [chartType, setChartType] = useState('all');

  // 模拟数据
  const [dataRecords, setDataRecords] = useState<DataRecord[]>(() => {
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

  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    const option: echarts.EChartsOption = {
      title: {
        text: '实时数据监控',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 500, color: '#262626' },
      },
      tooltip: {
        trigger: 'axis',
      },
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
        data: Array.from({ length: 30 }, (_, i) => `${i}s`),
      },
      yAxis: {
        type: 'value',
        name: '角度 (°)',
        axisLabel: { formatter: '{value}°' },
      },
      series: [
        { name: 'J1', type: 'line', data: Array.from({ length: 30 }, () => robotArm.joints.j1 + (Math.random() * 4 - 2)), smooth: true, color: '#f58020' },
        { name: 'J2', type: 'line', data: Array.from({ length: 30 }, () => robotArm.joints.j2 + (Math.random() * 4 - 2)), smooth: true, color: '#1890ff' },
        { name: 'J3', type: 'line', data: Array.from({ length: 30 }, () => robotArm.joints.j3 + (Math.random() * 4 - 2)), smooth: true, color: '#52c41a' },
        { name: 'J4', type: 'line', data: Array.from({ length: 30 }, () => robotArm.joints.j4 + (Math.random() * 4 - 2)), smooth: true, color: '#722ed1' },
        { name: 'J5', type: 'line', data: Array.from({ length: 30 }, () => robotArm.joints.j5 + (Math.random() * 4 - 2)), smooth: true, color: '#faad14' },
        { name: 'J6', type: 'line', data: Array.from({ length: 30 }, () => robotArm.joints.j6 + (Math.random() * 4 - 2)), smooth: true, color: '#ff4d4f' },
      ],
    };

    chart.setOption(option);

    // 定时更新
    const interval = setInterval(() => {
      const newData = [...option.xAxis!.data as string[], `${(option.xAxis!.data as string[]).length}s`];
      newData.shift();
      option.xAxis!.data = newData;

      (option.series as echarts.SeriesOption[]).forEach((s, i) => {
        const jointKeys: (keyof typeof robotArm.joints)[] = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6'];
        const jointValue = robotArm.joints[jointKeys[i]];
        (s.data as number[]).push(jointValue + (Math.random() * 4 - 2));
        (s.data as number[]).shift();
      });

      chart.setOption(option);
    }, 1000);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [robotArm.joints]);

  const columns = [
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

  return (
    <div>
      <div className="page-header">
        <h2>数据监控</h2>
      </div>

      <Tabs
        defaultActiveKey="chart"
        items={[
          {
            key: 'chart',
            label: '实时图表',
            children: (
              <Card bordered={false}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <div ref={chartRef} style={{ width: '100%', height: 400 }} />
              </Card>
            ),
          },
          {
            key: 'table',
            label: '数据表格',
            children: (
              <Card bordered={false}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  columns={columns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 20, showSizeChanger: false }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
