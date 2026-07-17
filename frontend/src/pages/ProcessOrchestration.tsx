import { FlowEditorContent } from './FlowEditor';
import commonStyles from '../styles/common.module.css';

export default function ProcessOrchestration() {
  const pageTitle = '流程编排';

  const renderMainContent = () => <FlowEditorContent />;

  return (
    <div>
      <div className={commonStyles.pageHeader}><h2>{pageTitle}</h2></div>
      {renderMainContent()}
    </div>
  );
}
