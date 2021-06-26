/* 主叫类型 */
export enum ECallerUserCard {
  /* 患者 */
  PATIENT = 1,
  /* 员工 */
  STAFF,
  /* 团队 */
  TEAM,
  /* 系统 */
  SYSTEM,
  /* 医生 */
  DOCTOR,
  /* 健康管家 */
  HEALTH_STEWARD,
  /* 私家医生 */
  PRIVATE_DOCTOR,
  /* 专家医生 */
  SPECIAL_DOCTOR,
}

/* 主叫类型文字 */
export const CallerUserCardText = {
  /* 患者 */
  [ECallerUserCard.PATIENT]: '患者',
  /* 员工 */
  [ECallerUserCard.STAFF]: '员工',
  /* 团队 */
  [ECallerUserCard.TEAM]: '团队',
  /* 系统 */
  [ECallerUserCard.SYSTEM]: '系统',
  /* 医生 */
  [ECallerUserCard.DOCTOR]: '医生',
  /* 健康管家 */
  [ECallerUserCard.HEALTH_STEWARD]: '健康管家',
  /* 私家医生 */
  [ECallerUserCard.PRIVATE_DOCTOR]: '私家医生',
  /* 专家医生 */
  [ECallerUserCard.SPECIAL_DOCTOR]: '专家医生',
};
