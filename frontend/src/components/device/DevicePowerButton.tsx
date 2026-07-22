import { PoweroffOutlined } from '@ant-design/icons';
import { Button } from 'antd';

interface DevicePowerButtonProps {
  connected: boolean;
  loading: boolean;
  onClick: () => void;
}

export default function DevicePowerButton({ connected, loading, onClick }: DevicePowerButtonProps) {
  return (
    <Button
      type={connected ? 'default' : 'primary'}
      danger={connected}
      icon={<PoweroffOutlined />}
      loading={loading}
      onClick={onClick}
    >
      {connected ? '卸载' : '加载'}
    </Button>
  );
}
