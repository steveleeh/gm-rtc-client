/* 拨打状态 */
export enum ECallState {
  /* 空闲中 */
  FREE,
  /* 拨打用户中 */
  ON_CALL,
  /* 被呼叫中 */
  BE_CALLED,
  /* 通话中 */
  CALLING,
}
