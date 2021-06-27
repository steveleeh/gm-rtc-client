import { Action, AnyAction, Reducer, Dispatch } from 'redux';
import { EffectsMapObject, SubscriptionsMapObject } from 'dva';
import React from 'react';
import { IGmRtc } from './GmRtc';
import { StateType } from './models/index';
import { IMessageToast } from './MessageToast';
import { ICreateClientParams, resolveProps } from '@/GmRtc/index';
import { IVideoChatMessage } from '@/types/VideoChatMessage';

export type BaseReducers<S = any, A extends Action = AnyAction> = {
  [key: string]: Reducer<S, A>;
};

export interface BaseModel<S = any, A extends Action = AnyAction> {
  namespace: string;
  state?: S;
  reducers?: BaseReducers<S, A>;
  effects?: EffectsMapObject;
  subscriptions?: SubscriptionsMapObject;
}

export interface IUpdateVideoViewParams {
  roomId?: number;
  userId?: string;
}

export interface IGmRtcProps {
  /*  通话弹窗是否可见 */
  visible?: boolean;
  style?: React.CSSProperties;
  className?: string;
  /* 订阅消息的主题 */
  topic?: string;
  /* 插件 */
  plugins: GmRtcClientPlugin[];
}

export interface GmRtcClientRef {
  /* 获取namespace */
  namespace: string;
  /* 获取数据对象 */
  getState: () => Nullable<StateType>;
  dispatch: Dispatch;
  /* 获取消息提示实例 */
  messageToast: IMessageToast;
  /* 更新视频视图 */
  updateVideoView(params?: IUpdateVideoViewParams): Promise<void>;
  /* 创建通话消息 */
  onCreateMessage: (params: ICreateClientParams) => Promise<void>;
  /* 邀请通话消息 */
  onInviteMessage: (params: IVideoChatMessage) => Promise<void>;
  /* 取消通话消息 */
  onCancelMessage: (params: IVideoChatMessage) => Promise<void>;
  /* 超时取消通话消息 */
  onTimeoutCancelMessage: (params: IVideoChatMessage) => Promise<void>;
  /* 挂断通话消息 */
  onHangUpMessage: (params: IVideoChatMessage) => Promise<void>;
  /* 拒绝通话消息 */
  onRejectMessage: (params: IVideoChatMessage) => Promise<void>;
  /* 超时拒绝通话消息 */
  onTimeoutRejectMessage: (params: IVideoChatMessage) => Promise<void>;
  /* 视频和语音切换消息 */
  onSwitchMessage: (params: IVideoChatMessage) => Promise<void>;
  /* 进入房间消息 */
  onEnterRoomMessage: (params: IVideoChatMessage) => Promise<void>;
  /* 新增成员消息 */
  onAddMemberMessage: (params: IVideoChatMessage) => Promise<void>;
}

export interface GmRtcClientPluginContext {
  /** 内部使用 允许给组件的 ref 上添加一些对外暴露的属性 */
  addImperativeHandle(handlers: object): void;
  /** 强制组件重渲染 */
  // forceUpdate: React.DispatchWithoutAction;
  name: string;
}

interface GmRtcClientPluginFunc {
  onJoinSuccess: (name: string) => void;
  onJoinError: (name: string) => void;
}

export interface GmRtcClientPlugin {
  (props: IGmRtcProps, context: GmRtcClientPluginContext): GmRtcClientPluginFunc;
}

export type ResolvedProps = ReturnType<typeof resolveProps>;
