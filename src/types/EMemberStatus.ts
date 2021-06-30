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
