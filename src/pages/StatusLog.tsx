import { Card, Table, Tag, Button, Space, DatePicker, message, Pagination, Select } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useRobotArmStore } from '../store/robotArm';
import { useAGVStore } from '../store/agv';
import { useAuthStore } from '../store/auth';
import { useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';

interface OperationRecord {
  id: string;
  time: string;
  device: string;
  operation: string;
  operator: string;
  detail: string;
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
  const robotArm = useRobotArmStore();
  const agv = useAGVStore();
  const currentUser = useAuthStore((state) => state.username);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [records] = useState<OperationRecord[]>(initialRecords);

  // 与真实设备连接状态联动：当前已连接设备高亮，未连接置灰
  const deviceConnected = (device: string) => {
    if (device === '机械臂') return robotArm.isConnected;
    if (device === 'AGV') return agv.isConnected;
    return true;
  };

  const enrichedRecords = useMemo(() => {
    return records.map((r, idx) => {
      // 最新一条记录的操作者联动为当前登录用户，模拟"实时新增的日志"
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

  // 日期筛选后回到第 1 页
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate]);

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

  return (
    <div>
      <div className="page-header">
        <h2>状态日志</h2>
      </div>

      {/* 顶部：日期筛选 + 导出 */}
      <Card size="small" styles={{ body: { padding: 16 } }} style={{ marginBottom: 16 }}>
        <Space size={12} wrap>
          <span style={{ color: '#595959' }}>日志日期：</span>
          <DatePicker
            value={selectedDate}
            onChange={(val) => setSelectedDate(val)}
            allowClear
            placeholder="选择日期"
          />
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出日志
          </Button>
        </Space>
      </Card>

      {/* 操作记录 */}
      <Card
        title="操作记录"
        size="small"
        styles={{ header: { fontSize: 14 } }}
      >
        <Table
          rowKey="id"
          columns={recordColumns}
          dataSource={pagedRecords}
          size="small"
          pagination={false}
          footer={() => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '4px 0' }}>
              <span style={{ color: '#595959', fontSize: 13 }}>
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
    </div>
  );
}
