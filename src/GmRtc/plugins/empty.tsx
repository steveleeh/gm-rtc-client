import React from 'react';
import { GmRtcClientPlugin } from '../types';

interface UseEmptyPlugin {
  (options?: { name?: string }): GmRtcClientPlugin;
}

export const useEmptyPlugin: UseEmptyPlugin = (options = {}) => {
  return props => {
    const onJoinSuccess = (record: string) => {
      console.log('onJoinSuccess');
    };

    return {
      onJoinSuccess,
    };
  };
};
