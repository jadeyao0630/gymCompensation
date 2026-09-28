export type PermissionKey =
  | 'plan:view'
  | 'plan:edit'
  | 'target:edit'
  | 'payroll:calc'
  | 'user:add'
  | 'user:resetPwd'
  | 'simulation:access'
  | 'ops:view'              // ⭐ 新增：查看运营主管数据
  | 'simulation:cost:property'
  | 'simulation:cost:electricity'
  | 'simulation:cost:rent'
  | 'simulation:cost:water'
  | 'simulation:cost:network'
  | 'simulation:cost:other'
  | 'simulation:share'
  | 'simulation:gender'
  | 'simulation:course'
  | 'export:payroll'
  | 'export:personal';

export interface PermissionMeta {
  key: PermissionKey;
  label: string;
  desc: string;
  group: '方案' | '计算' | '用户' | '测算' | '导出';
}

export const PERMISSION_LIST: PermissionMeta[] = [
  /* 方案 */
  { key: 'plan:view',   label: '查看方案',     desc: '查看佣金薪酬方案',               group: '方案' },
  { key: 'plan:edit',   label: '设置方案',     desc: '新增/修改/删除/导入佣金薪酬方案', group: '方案' },
  { key: 'target:edit', label: '业绩目标设置', desc: '修改各岗位的业绩目标',           group: '方案' },
  { key: 'ops:view',    label: '查看运营主管', desc: '查看运营主管的薪酬与测算数据',   group: '方案' },   // ⭐ 从「测算」挪到「方案」

  /* 计算 */
  { key: 'payroll:calc', label: '计算工资佣金', desc: '进入薪酬计算页并计算工资佣金', group: '计算' },

  /* 用户 */
  { key: 'user:add',      label: '用户添加', desc: '新增后台用户',           group: '用户' },
  { key: 'user:resetPwd', label: '密码重置', desc: '重置其他用户的登录密码', group: '用户' },

  /* 测算 */
  { key: 'simulation:access',          label: '测算（总入口）', desc: '进入经营测算页',                 group: '测算' },
  { key: 'simulation:cost:property',   label: '物业费',        desc: '测算中修改物业费',               group: '测算' },
  { key: 'simulation:cost:electricity', label: '电费',          desc: '测算中修改电费',                 group: '测算' },
  { key: 'simulation:cost:rent',       label: '租金',          desc: '测算中修改租金',                 group: '测算' },
  { key: 'simulation:cost:water',      label: '水费',          desc: '测算中修改水费',                 group: '测算' },
  { key: 'simulation:cost:network',    label: '网络费',        desc: '测算中修改网络费',               group: '测算' },
  { key: 'simulation:cost:other',      label: '其他杂项',      desc: '测算中修改其他杂项',             group: '测算' },
  { key: 'simulation:share',           label: '业绩分配比例',  desc: '测算中调整业绩分配比例',         group: '测算' },
  { key: 'simulation:gender',          label: '性别人数',      desc: '测算中调整性别人数',             group: '测算' },
  { key: 'simulation:course',          label: '课提设置',      desc: '测算中调整课提设置',             group: '测算' },

  /* 导出 */
  { key: 'export:payroll',  label: '导出工资佣金计算结果', desc: '导出全员工资佣金汇总表', group: '导出' },
  { key: 'export:personal', label: '导出个人结算结果',     desc: '导出单个员工工资佣金结算', group: '导出' },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_LIST.map(
  (p) => p.key
);

export interface UserPermissionConfig {
  storeIds: string[];
  permissions: PermissionKey[];
}

export function isPermissionGranted(
  config: UserPermissionConfig,
  key: PermissionKey,
  storeId?: string
): boolean {
  if (!config.permissions.includes(key)) return false;
  if (!config.storeIds || config.storeIds.length === 0) return true;
  if (!storeId) return true;
  return config.storeIds.map(String).includes(String(storeId));
}