export type PermissionKey =
  /* 薪酬佣金设置 */
  | 'plan:view'
  | 'plan:edit'
  | 'target:edit'
  | 'position:add'
  | 'position:delete'
  | 'position:rename'
  | 'headcount:edit'
  | 'month:add'
  | 'month:delete'
  | 'plan:import'
  | 'plan:export'
  /* 薪酬佣金测算 */
  | 'simulation:access'
  | 'simulation:cost:property'
  | 'simulation:cost:electricity'
  | 'simulation:cost:rent'
  | 'simulation:cost:water'
  | 'simulation:cost:network'
  | 'simulation:cost:other'
  | 'simulation:share'
  | 'simulation:gender'
  | 'simulation:course'
  /* 薪酬佣金计算 */
  | 'payroll:calc'
  | 'ops:view'
  | 'export:payroll'
  | 'export:personal'
  | 'report:marketing:view'         // ⭐ 新增：营销收入报告
  | 'report:monthly:view'
  /* 综合设置 */
  | 'user:add'
  | 'user:resetPwd';

export type PermissionGroup =
  | '薪酬佣金设置'
  | '薪酬佣金测算'
  | '薪酬佣金计算'
  | '综合设置';

export interface PermissionMeta {
  key: PermissionKey;
  label: string;
  desc: string;
  group: PermissionGroup;
}

export const PERMISSION_LIST: PermissionMeta[] = [
  /* ============================================================
   * 1、薪酬佣金设置
   * ============================================================ */
  {
    key: 'plan:view',
    label: '查看方案',
    desc: '查看佣金薪酬方案',
    group: '薪酬佣金设置',
  },
  {
    key: 'plan:edit',
    label: '设置方案',
    desc: '修改方案内的职位、阶梯、目标等配置',
    group: '薪酬佣金设置',
  },
  {
    key: 'target:edit',
    label: '业绩目标设置',
    desc: '修改各岗位的业绩目标',
    group: '薪酬佣金设置',
  },
  {
    key: 'month:add',
    label: '新增月份',
    desc: '在方案中新增月份（含复制已有月份）',
    group: '薪酬佣金设置',
  },
  {
    key: 'month:delete',
    label: '删除月份',
    desc: '删除方案中的月份及其全部配置',
    group: '薪酬佣金设置',
  },
  {
    key: 'plan:import',
    label: '导入薪酬佣金设置',
    desc: '从 Excel 或 JSON 导入薪酬佣金方案',
    group: '薪酬佣金设置',
  },
  {
    key: 'plan:export',
    label: '导出薪酬佣金设置',
    desc: '导出当前薪酬佣金方案为 JSON',
    group: '薪酬佣金设置',
  },

  /* ============================================================
   * 2、薪酬佣金测算
   * ============================================================ */
  {
    key: 'simulation:access',
    label: '测算（总入口）',
    desc: '进入经营测算页',
    group: '薪酬佣金测算',
  },
  {
    key: 'simulation:cost:property',
    label: '物业费',
    desc: '测算中修改物业费',
    group: '薪酬佣金测算',
  },
  {
    key: 'simulation:cost:electricity',
    label: '电费',
    desc: '测算中修改电费',
    group: '薪酬佣金测算',
  },
  {
    key: 'simulation:cost:rent',
    label: '租金',
    desc: '测算中修改租金',
    group: '薪酬佣金测算',
  },
  {
    key: 'simulation:cost:water',
    label: '水费',
    desc: '测算中修改水费',
    group: '薪酬佣金测算',
  },
  {
    key: 'simulation:cost:network',
    label: '网络费',
    desc: '测算中修改网络费',
    group: '薪酬佣金测算',
  },
  {
    key: 'simulation:cost:other',
    label: '其他杂项',
    desc: '测算中修改其他杂项',
    group: '薪酬佣金测算',
  },
  {
    key: 'simulation:share',
    label: '业绩分配比例',
    desc: '测算中调整业绩分配比例',
    group: '薪酬佣金测算',
  },
  {
    key: 'simulation:gender',
    label: '性别人数',
    desc: '测算中调整性别人数',
    group: '薪酬佣金测算',
  },
  {
    key: 'simulation:course',
    label: '课提设置',
    desc: '测算中调整课提设置',
    group: '薪酬佣金测算',
  },

  /* ============================================================
   * 3、薪酬佣金计算
   * ============================================================ */
  {
    key: 'payroll:calc',
    label: '计算工资佣金',
    desc: '进入薪酬计算页并计算工资佣金',
    group: '薪酬佣金计算',
  },
  {
    key: 'ops:view',
    label: '查看运营主管',
    desc: '查看运营主管的薪酬与测算数据',
    group: '薪酬佣金计算',
  },
  {
    key: 'export:payroll',
    label: '导出工资佣金计算结果',
    desc: '导出全员工资佣金汇总表',
    group: '薪酬佣金计算',
  },
  {
    key: 'export:personal',
    label: '导出个人结算结果',
    desc: '导出单个员工工资佣金结算',
    group: '薪酬佣金计算',
  },
  /* ⭐ 新增：营销收入报告 */
  {
    key: 'report:marketing:view',
    label: '营销收入报告',
    desc: '查看营销收入汇总与销售明细',
    group: '薪酬佣金计算',
  },
  {
    key: 'report:monthly:view',
    label: '月综合报告',
    desc: '查看月度经营综合分析（薪酬+营销+成本）',
    group: '薪酬佣金计算',
  },

  /* ============================================================
   * 4、综合设置
   * ============================================================ */
  {
    key: 'position:add',
    label: '新增职位',
    desc: '在方案中新增职位',
    group: '综合设置',
  },
  {
    key: 'position:delete',
    label: '删除职位',
    desc: '从方案中删除职位',
    group: '综合设置',
  },
  {
    key: 'position:rename',
    label: '职位名称更改',
    desc: '修改职位的显示名称',
    group: '综合设置',
  },
  {
    key: 'headcount:edit',
    label: '修改职位人数',
    desc: '修改各职位的在编人数',
    group: '综合设置',
  },
  {
    key: 'user:add',
    label: '用户添加',
    desc: '新增后台用户',
    group: '综合设置',
  },
  {
    key: 'user:resetPwd',
    label: '密码重置',
    desc: '重置其他用户的登录密码',
    group: '综合设置',
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_LIST.map(
  (p) => p.key
);

export const PERMISSION_GROUPS: PermissionGroup[] = [
  '薪酬佣金设置',
  '薪酬佣金测算',
  '薪酬佣金计算',
  '综合设置',
];

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