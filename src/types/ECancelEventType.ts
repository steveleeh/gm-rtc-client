/* 取消音视频事件类型 */
export enum ECancelEventType {
  /* 取消 */
  CANCEL = 2001,
  /* 超时取消 */
  TIMEOUT_CANCEL = 2002,
  /* 挂断 */
  HANG_UP = 2003,
  /* 拒绝 */
  REJECT = 2004,
  /* 超时挂断 */
  TIMEOUT_REJECT = 2005,
}
