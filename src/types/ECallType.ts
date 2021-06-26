/* 拨打模式 */
export enum ECallType {
  /* 音频呼叫 */
  AUDIO = 1,
  /* 视频呼叫 */
  VIDEO,
}

export const CallModeText = {
  [ECallType.VIDEO]: '视频',
  [ECallType.AUDIO]: '语音',
};
