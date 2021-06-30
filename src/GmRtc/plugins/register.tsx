import type { GmRtcClientPlugin } from '../types';

export interface RegisterPluginOption {
  /**  应用标识 */
  sdkAppId?: number;
  /** 用户标识 */
  userId?: string;
  /** 用户签名 */
  userSig?: string;
}

export interface useRegisterPluginFn {
  (options?: RegisterPluginOption): GmRtcClientPlugin;
}

export const useRegisterPlugin: useRegisterPluginFn = (options = {}) => {
  return (props, context) => {
    const onInitial = async () => {
      if (context.dispatch && context.namespace && context.getState) {
        await context.dispatch({
          type: `${context.namespace}/setState`,
          payload: {
            sdkAppId: options.sdkAppId || context.getState()?.sdkAppId,
            userId: options.userId || context.getState()?.userId,
            userSig: options.userSig || context.getState()?.userSig,
          },
        });
      }
    };

    return {
      onInitial,
    };
  };
};
