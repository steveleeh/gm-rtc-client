/* 音视频事件类型 */
export enum ECancelEventType {
  /* 会话邀请 */
  INVITE = 2000,
  /* 取消会话 */
  CANCEL = 2001,
  /* 超时取消 */
  TIMEOUT_CANCEL = 2002,
  /* 挂断 */
  HANG_UP = 2003,
  /* 拒绝 */
  REJECT = 2004,
  /* 超时拒绝 */
  TIMEOUT_REJECT = 2005,
  /* 音视频切换 */
  SWITCH = 2006,
  /* 进房 */
  ENTER_ROOM = 2007,
  /* 新增成员 */
  ADD_MEMBER = 2008,
  /** 更新房间信息 */
  REFRESH_ROOM_STATUS = 2009,
}
