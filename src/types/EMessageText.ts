/** 消息提示文案 */
export enum EMessageText {
  WAIT_CONNECT = '正在等待对方接收邀请...',
  JOIN_SUCCESS = '进入房间成功',
  JOIN_ERROR = '进入房间失败',
  SELF_ACCEPT = '通话已接受',
  SELF_CANCEL = '通话已取消',
  SELF_REJECT = '通话已拒绝',
  SELF_HANG_UP = '通话已结束',
  SELF_TIMEOUT_CANCEL = '当前无人接听，请稍后再试',
  USER_CANCEL = '用户已取消',
  USER_BUSY = '用户繁忙，请稍后再试',
  USER_REJECT = '用户已拒绝',
  USER_TIMEOUT_CANCEL = '当前无人接听，请稍后再试',
  USER_TIMEOUT_REJECT = '用户已取消',
  USER_ACCEPT = '用户已同意',
  VIDEO_INITIAL = '正在建立连接通道...',
  INITIALIZE_SUCCESS = '音视频初始化成功',
  SWITCH_TO_AUDIO_SUCCESS = '摄像头已关闭',
  CONNECT_SUCCESS = '连接成功',
  USER_HANG_UP = '用户已挂断',
  MUTE_SUCCESS = '已静音',
  UNMUTE_SUCCESS = '已取消静音',
  SWITCH_AUDIO = '已切换为语音',
  NETWORK_ERROR = '网络已断开',
}
