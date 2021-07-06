import type { GmRtcClientPlugin } from '../types';

export interface RegisterPluginOption {
  /**  应用标识 */
  sdkAppId?: number;
  /** 用户标识 */
  userId?: string;
  /** 用户签名 */
  userSig?: string;
  /** 当前用户主叫类型 */
  userCard?: number;
}

export const useRegisterPlugin = (options?: RegisterPluginOption): GmRtcClientPlugin => {
  return (props, context) => {
    const onInitial = async () => {
      if (context.dispatch && context.namespace && context.getState && options) {
        await context.dispatch({
          type: `${context.namespace}/setState`,
          payload: {
            sdkAppId: options.sdkAppId || context.getState()?.sdkAppId,
            userId: options.userId || context.getState()?.userId,
            userSig: options.userSig || context.getState()?.userSig,
            userCard: options.userCard || context.getState()?.userCard,
          },
        });
      }
    };

    return {
      onInitial,
    };
  };
};
