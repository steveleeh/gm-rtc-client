import React from 'react';
import { GmRtcClientPlugin } from '../types';

export interface RegisterPluginOption {
  /*  应用标识 */
  sdkAppId?: number;
  /* 用户标识 */
  userId?: string;
  /* 用户签名 */
  userSig?: string;
}

export interface useRegisterPlugin {
  (options?: RegisterPluginOption): GmRtcClientPlugin;
}

export const useRegisterPlugin: useRegisterPlugin = (options = {}) => {
  return (props, context) => {
    const onInitial = async () => {
      console.log('onInitialaaaa', options, context);
      if (context.dispatch && context.namespace && context.getState) {
        console.log('数据注入成功');
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
