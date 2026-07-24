/**
 * 编程编排业务：流程程序的本地组装与远端存取。
 *
 * <p>前端把流程编辑器产出的流程 JSON（nodes/edges）与自动生成的 Lua 脚本一起，
 * 通过 REST 接口 `/api/programs` 保存到后端（统一 ApiResponse 包装，service 层已解包）；
 * 程序的执行/暂停/恢复/停止使用各自独立的 HTTP POST 控制接口。</p>
 */
import { programApi } from '@/services/api';
import { CONTROL_ENDPOINT, sendControlRequest } from '@/services/controlHttp';
import { useAuthStore } from '@/store/auth';

/** 前端使用的 Lua 程序视图模型，由后端 ProgramInfo 转换而来。 */
export interface LuaProgram {
  /** 程序主键（后端数值 ID 转字符串，便于路由/状态使用）。 */
  id: string;
  /** 程序文件名，形如 flow-<时间戳>.lua 或 flow-<id>.lua。 */
  name: string;
  /** Lua 脚本内容（对应后端字段 luaContent）。 */
  code: string;
  /** 本地化（zh-CN）后的最近更新时间，仅用于展示。 */
  updatedAt: string;
  /** 流程编辑器产出的流程 JSON（{ nodes, edges }），用于回显编辑。 */
  flow: Record<string, unknown>;
  /** 程序版本号，由后端维护并随更新返回。 */
  version: number;
}

/** 后端 ProgramInfo -> 前端 LuaProgram：ID 转字符串、时间本地化、luaContent 对齐为 code。 */
const toLuaProgram = (program: Awaited<ReturnType<typeof programApi.list>>[number]): LuaProgram => ({
  id: String(program.id),
  name: program.name,
  code: program.luaContent,
  updatedAt: new Date(program.updatedAt).toLocaleString('zh-CN'),
  flow: program.flow,
  version: program.version,
});

/** 拉取后端全部已保存程序：GET /api/programs，返回转换为 LuaProgram 后的列表。 */
export async function getLuaPrograms(): Promise<LuaProgram[]> {
  return (await programApi.list()).map(toLuaProgram);
}

/**
 * 把流程 JSON 与自动生成的 Lua 脚本保存到后端。
 *
 * <p>Lua 内容在此处拼装：流程节点 label 依次生成为 Lua 注释步骤，包在 workflow.run() 中；
 * 文件名沿用 flow-<existingId>.lua（更新场景）或 flow-<时间戳>.lua（新建场景）。
 * existingId 为空走 POST /api/programs 新建，否则走 PUT /api/programs/{id} 覆盖更新。</p>
 */
export async function saveGeneratedLuaProgram(labels: string[], flow: Record<string, unknown>, existingId?: string) {
  const now = new Date();
  // 每个节点生成一行 Lua 注释步骤；空流程给占位注释，保证脚本结构完整
  const steps = labels.length
    ? labels.map((label, index) => `  -- 步骤 ${index + 1}: ${label}`).join('\n')
    : '  -- 暂无流程节点';
  const name = existingId ? `flow-${existingId}.lua` : `flow-${now.getTime()}.lua`;
  const request = {
    name,
    flow,
    // createdBy 取当前登录用户名，未登录时兜底 'unknown'
    createdBy: useAuthStore.getState().username || 'unknown',
    luaContent: `-- 由流程编排自动生成\nlocal workflow = {}\n\nfunction workflow.run()\n${steps}\nend\n\nworkflow.run()`,
  };
  // 已有 ID 则整体覆盖更新，否则新建
  const saved = existingId
    ? await programApi.update(Number(existingId), request)
    : await programApi.create(request);
  return toLuaProgram(saved);
}

/**
 * 发送程序执行请求：POST /api/control/program/execute，请求体为 {programId}。
 * 返回成功仅代表后端已经受理，不代表程序执行完成。
 */
export function executeProgram(programId: string) {
  return sendControlRequest(CONTROL_ENDPOINT.PROGRAM_EXECUTE, {
    programId: Number(programId),
  });
}

/** 程序运行控制分别使用 pause、resume、stop 三个独立接口，请求体为空对象。 */
export function controlProgram(action: 'pause' | 'resume' | 'stop') {
  const endpoint = action === 'pause'
    ? CONTROL_ENDPOINT.PROGRAM_PAUSE
    : action === 'resume'
      ? CONTROL_ENDPOINT.PROGRAM_RESUME
      : CONTROL_ENDPOINT.PROGRAM_STOP;
  return sendControlRequest(endpoint, {});
}
