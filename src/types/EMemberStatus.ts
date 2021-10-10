/** 成员状态 */
export enum EMemberStatus {
  /** 待呼叫 */
  WAIT_CALL = 10,
  /** 呼叫中 */
  BE_CALLING = 20,
  /** 通话中 */
  CALLING = 30,
  /** 已拒接 */
  REJECT = 40,
  /** 已超时 */
  TIMEOUT = 50,
  /** 已挂断 */
  HANG_UP = 60,
}

export const MemberStatusText = {
  /** 待呼叫 */
  [EMemberStatus.WAIT_CALL]: '待呼叫',
  /** 呼叫中 */
  [EMemberStatus.BE_CALLING]: '呼叫中',
  /** 通话中 */
  [EMemberStatus.CALLING]: '通话中',
  /** 已拒接 */
  [EMemberStatus.REJECT]: '已拒接',
  /** 已超时 */
  [EMemberStatus.TIMEOUT]: '已超时',
  /** 已挂断 */
  [EMemberStatus.HANG_UP]: '已挂断',
};
