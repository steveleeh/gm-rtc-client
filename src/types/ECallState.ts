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

export const ECallStateText = {
  /* 空闲中 */
  [ECallState.FREE]: '空闲中',
  /* 拨打用户中 */
  [ECallState.ON_CALL]: '拨打用户中',
  /* 被呼叫中 */
  [ECallState.BE_CALLED]: '被呼叫中',
  /* 通话中 */
  [ECallState.CALLING]: '通话中',
};
