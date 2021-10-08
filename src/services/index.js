import request from '@wjj/gm-request-saas';

/**
 * @description 视频类型切换, 向其他会话成员发送消息
 * @param params
 */
export function audioVideoSwitchTypeUsingPOST(params) {
  return request('/api/wjj-saas-system/saas/ImService/audioVideoSwitchType', {
    method: 'POST',
    data: params,
  });
}

/**
 * @description 获取im的userID和userSig
 */
export function getImUserInfo() {
  return request('/api/wjj-saas-system/conversation/conversationRecord/getImUserInfo', {
    method: 'POST',
    data: { card: 5 },
  });
}

/**
 * 创建音视频会话
 */
// export function createVideoCallUsingPOST(params) {
//   return request('/api/wjj-saas-system/saas/ImService/createVideoCall', {
//     method: 'POST',
//     data: params,
//   });
// }

/**
 * 创建音视频会话
 */
export function createVideoCallUsingPOST(params) {
  return request('/api/wjj-saas-system/saas/ImService/getStewardSendVideoCallResult', {
    method: 'POST',
    data: params,
  });
}

/**
 * 取消音视频会话
 */
export function cancelVideoCallUsingPOST(params) {
  return request('/api/wjj-saas-system/saas/ImService/cancelVideoCall', {
    method: 'POST',
    data: params,
  });
}

/**
 * @description 获取im的会话列表
 * @param params
 */
export function getImVideoConversationRoomInfoVOUsingPOST(params) {
  return request('/api/wjj-saas-system/saas/ImService/getImVideoConversationRoomInfoVO', {
    method: 'POST',
    data: params,
  });
}
