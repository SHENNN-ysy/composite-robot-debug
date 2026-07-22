export interface LuaProgram {
  id: string;
  name: string;
  code: string;
  updatedAt: string;
}

const STORAGE_KEY = 'generatedLuaPrograms';

const initialPrograms: LuaProgram[] = [
  {
    id: 'example-main',
    name: 'main_workflow.lua',
    updatedAt: '示例程序',
    code: `-- 图形化流程生成的 Lua 程序\nlocal robot = require("robot")\n\nfunction main()\n  robot:connect()\n  robot:move_home()\n  robot:disconnect()\nend\n\nmain()`,
  },
];

export function getLuaPrograms(): LuaProgram[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : initialPrograms;
  } catch {
    return initialPrograms;
  }
}

export function saveGeneratedLuaProgram(labels: string[]) {
  const now = new Date();
  const id = `flow-${now.getTime()}`;
  const steps = labels.length ? labels.map((label, index) => `  -- 步骤 ${index + 1}: ${label}`).join('\n') : '  -- 暂无流程节点';
  const program: LuaProgram = {
    id,
    name: `${id}.lua`,
    updatedAt: now.toLocaleString('zh-CN'),
    code: `-- 由流程编排自动生成\nlocal workflow = {}\n\nfunction workflow.run()\n${steps}\nend\n\nworkflow.run()`,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([program, ...getLuaPrograms()]));
  return program;
}
