/* 腾讯im消息 */
export interface ITencentMessage {
  ID: string;
  clientSequence: number;
  conversationID: string;
  conversationSubType: number;
  conversationType: string;
  flow: string;
  /* 发送者 */
  from: string;
  geo: Object;
  isPlaceMessage: number;
  isRead: boolean;
  isResend: boolean;
  isRevoked: boolean;
  isSystemMessage: boolean;
  /* 消息内容 */
  payload: {
    text: string;
  };
  priority: string;
  protocol: string;
  random: number;
  sequence: number;
  status: string;
  time: number;
  /* 接收者 */
  to: string;
  type: string;
}
