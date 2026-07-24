/**
 * 流程编排页面：以拖拽流程图的方式编排机械臂/AGV 的联合作业流程。
 *
 * <p>页面主体直接复用 FlowEditorContent 编辑器组件（节点库 + 画布 + 属性面板），
 * 本文件只负责套一层页面标题，不持有任何业务状态。</p>
 */
import { FlowEditorContent } from './FlowEditor';
import PageHeader from '@/components/common/PageHeader/PageHeader';

/** 流程编排页路由组件：PageHeader + 流程编辑器画布。 */
export default function ProcessOrchestration() {
  const pageTitle = '流程编排';

  // 页面主体即流程编辑器，保存/加载/执行逻辑全部封装在 FlowEditorContent 内
  const renderMainContent = () => <FlowEditorContent />;

  return (
    <div>
      <PageHeader title={pageTitle} />
      {renderMainContent()}
    </div>
  );
}
