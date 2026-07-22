import { FlowEditorContent } from './FlowEditor';
import PageHeader from '@/components/common/PageHeader/PageHeader';

export default function ProcessOrchestration() {
  const pageTitle = '流程编排';

  const renderMainContent = () => <FlowEditorContent />;

  return (
    <div>
      <PageHeader title={pageTitle} />
      {renderMainContent()}
    </div>
  );
}
