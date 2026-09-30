/* 类型 re-export（保留向后兼容） */
export type {
  PayDetailItem,
  Gender,
  ClassMemberDetail,
  CourseCommissionRate,
  EmployeePerformance,
  PayrollResult,
  MergeInput,
  CoachInfo,
  Department,
  MissingPositionInfo,
  DepartmentStats,
} from '../../types/payroll';

/* 工具函数 re-export */
export { getDepartmentOf, needsSaleIdPrefix } from './department';
export { sortByThreshold, findHitTier } from './tier';
export {
  pickId,
  pickName,
  pickPhone,
  pickSaleAmount,
  pickGender,
  sexToGender,
  isInvalidId,
} from './pick';
export { normalizePayDetail, pickPayDetail, mergePayDetail } from './payDetail';
export { parseClassList } from './classParser';
export { mergePerformance, applyCoachInfo, normalizeCoachList } from './merge';
export { applyManagerPerformance } from './manager';
export { calcEmployeePayroll } from './employee';
export { calcPayrollForAll } from './all';
export { findPositionByTitle, makeEmptyPosition } from './positionFinder';
export { collectMissingPositions, collectMissingPositionDetails } from './missing';
export { calcDepartmentStats } from './departmentStats';