import type { Action, AnyAction, Reducer, Dispatch } from 'redux';
import type { EffectsMapObject, SubscriptionsMapObject } from 'dva';
import type React from 'react';
import type { StateType } from './models';
import type { IMessageToast } from './MessageToast';
import type {
  ICreateClientParams,
  renderMemberTemplateFn,
  resolveProps,
} from '@/GmRtc/GmRtcClient';
import type { IVideoChatMessage } from '@/types/VideoChatMessage';
import type {
  Callback,
  ConnectionState,
  NetworkQuality,
  RemoteStreamInfo,
  RemoteUserInfo,
  RtcError,
} from 'trtc-js-sdk';

export type Nullable<T> = T | null;

export type BaseReducers<S = any, A extends Action = AnyAction> = Record<string, Reducer<S, A>>;

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

export interface IDevice {
  /** 麦克风 */
  microphone: boolean;
  /** 摄像头 */
  camera: boolean;
}

export interface IGmRtcProps {
  style?: React.CSSProperties;
  /** 检查设备 */
  device?: boolean | IDevice;
  className?: string;
  /** 插件 */
  plugins: GmRtcClientPlugin[];
  /** 应用名称 */
  appName?: string;
}

/** 插件事件 */
export enum PluginEvent {
  /** 初始化 */
  INITIAL = 'onInitial',
  /** 离开 */
  LEAVE = 'onLeave',
  /** 计时 */
  TICK = 'onTick',
  /** 计时 */
  CHANGE_STATE = 'onChangeState',
  /** 创建通话消息 */
  CREATE_MESSAGE = 'onCreateMessage',
  /** 邀请通话消息 */
  INVITE_MESSAGE = 'onInviteMessage',
  /** 取消通话消息 */
  CANCEL_MESSAGE = 'onCancelMessage',
  /** 超时取消通话消息 */
  TIMEOUT_CANCEL_MESSAGE = 'onTimeoutCancelMessage',
  /** 挂断通话消息 */
  HANG_UP_MESSAGE = 'onHangUpMessage',
  /** 拒绝通话消息 */
  REJECT_MESSAGE = 'onRejectMessage',
  /** 超时拒绝通话消息 */
  TIMEOUT_REJECT_MESSAGE = 'onTimeoutRejectMessage',
  /** 视频和语音切换消息 */
  SWITCH_MESSAGE = 'onSwitchMessage',
  /** 进入房间消息 */
  ENTER_ROOM_MESSAGE = 'onEnterRoomMessage',
  /** 新增成员消息 */
  ADD_MEMBER_MESSAGE = 'onAddMemberMessage',
  /** 进房成功 */
  JOIN_SUCCESS = 'onJoinSuccess',
  /** 进房失败 */
  JOIN_ERROR = 'onJoinError',
  /** 初始化成功 */
  INITIALIZE_SUCCESS = 'onInitializeSuccess',
  /** 初始化失败 */
  INITIALIZE_ERROR = 'onInitializeError',
  /** Audio/Video Player 状态变化 */
  PLAYER_STATE_CHANGED = 'onPlayerStateChanged',
  /** 推流成功 */
  PUBLISH_SUCCESS = 'onPublishSuccess',
  /** 推流失败 */
  PUBLISH_ERROR = 'onPublishError',
  /** 不可恢复错误后 */
  ERROR = 'onError',
  /** 用户被踢出房间 */
  CLIENT_BANNED = 'onClientBanned',
  /** 远端用户进房通知 */
  PEER_JOIN = 'onPeerJoin',
  /** 远端用户退房 */
  PEER_LEAVE = 'onPeerLeave',
  /** 远端流添加 */
  STREAM_ADDED = 'onStreamAdded',
  /** 远端流订阅成功 */
  STREAM_SUBSCRIBED = 'onStreamSubscribed',
  /** 远端流移除 */
  STREAM_REMOVED = 'onStreamRemoved',
  /** 远端流更新 */
  STREAM_UPDATED = 'onStreamUpdated',
  /** 远端用户禁用音频 */
  MUTE_AUDIO = 'onMuteAudio',
  /** 远端用户启用音频 */
  UNMUTE_AUDIO = 'onUnmuteAudio',
  /** 远端用户禁用视频 */
  MUTE_VIDEO = 'onMuteVideo',
  /** 远端用户启用视频 */
  UNMUTE_VIDEO = 'onUnmuteVideo',
  /** 信令通道连接状态变化事件 */
  CONNECTION_STATE_CHANGED = 'onConnectionStateChanged',
  /** 网络质量统计数据事件，进房后开始统计，每两秒触发一次，包括上行（uplinkNetworkQuality）和下行（downlinkNetworkQuality）的质量统计数据。 */
  NETWORK_QUALITY = 'onNetworkQuality',
  /** 网络断开事件 */
  BadNetworkQuality = 'onBadNetworkQuality',
  /** 本地屏幕分享停止事件通知，仅对本地屏幕分享流有效。 */
  SCREEN_SHARING_STOPPED = 'onScreenSharingStopped',
}

export interface PluginRtcEventMap {
  [PluginEvent.INITIAL]: void;
  [PluginEvent.LEAVE]: void;
  [PluginEvent.TICK]: number;
  [PluginEvent.CHANGE_STATE]: number;
  [PluginEvent.CREATE_MESSAGE]: ICreateClientParams;
  [PluginEvent.INVITE_MESSAGE]: IVideoChatMessage;
  [PluginEvent.CANCEL_MESSAGE]: IVideoChatMessage;
  [PluginEvent.TIMEOUT_CANCEL_MESSAGE]: IVideoChatMessage;
  [PluginEvent.HANG_UP_MESSAGE]: IVideoChatMessage;
  [PluginEvent.REJECT_MESSAGE]: IVideoChatMessage;
  [PluginEvent.TIMEOUT_REJECT_MESSAGE]: IVideoChatMessage;
  [PluginEvent.SWITCH_MESSAGE]: IVideoChatMessage;
  [PluginEvent.ENTER_ROOM_MESSAGE]: IVideoChatMessage;
  [PluginEvent.ADD_MEMBER_MESSAGE]: IVideoChatMessage;
  [PluginEvent.JOIN_SUCCESS]: any;
  [PluginEvent.JOIN_ERROR]: any;
  [PluginEvent.INITIALIZE_SUCCESS]: any;
  [PluginEvent.INITIALIZE_ERROR]: DOMException;
  [PluginEvent.PUBLISH_SUCCESS]: any;
  [PluginEvent.PUBLISH_ERROR]: RtcError;
  [PluginEvent.STREAM_ADDED]: RemoteStreamInfo;
  [PluginEvent.STREAM_REMOVED]: RemoteStreamInfo;
  [PluginEvent.STREAM_UPDATED]: RemoteStreamInfo;
  [PluginEvent.STREAM_SUBSCRIBED]: RemoteStreamInfo;
  [PluginEvent.CONNECTION_STATE_CHANGED]: {
    prevState: ConnectionState;
    state: ConnectionState;
  };
  [PluginEvent.PEER_JOIN]: RemoteUserInfo;
  [PluginEvent.PEER_LEAVE]: RemoteUserInfo;
  [PluginEvent.MUTE_AUDIO]: RemoteUserInfo;
  [PluginEvent.MUTE_VIDEO]: RemoteUserInfo;
  [PluginEvent.UNMUTE_AUDIO]: RemoteUserInfo;
  [PluginEvent.UNMUTE_VIDEO]: RemoteUserInfo;
  [PluginEvent.CLIENT_BANNED]: RtcError;
  [PluginEvent.NETWORK_QUALITY]: NetworkQuality;
  [PluginEvent.BadNetworkQuality]: void;
  [PluginEvent.ERROR]: RtcError;
  [PluginEvent.PLAYER_STATE_CHANGED]: {
    type: string;
    state: 'PLAYING' | 'PAUSED' | 'STOPPED';
    reason: 'playing' | 'mute' | 'unmute' | 'ended';
  };
  [PluginEvent.SCREEN_SHARING_STOPPED]: undefined;
}

declare type messageEvent = (params: IVideoChatMessage) => Promise<void>;

export interface GmRtcClientRef {
  /** 获取namespace */
  namespace: string;
  /** 获取数据对象 */
  getState: () => Nullable<StateType>;
  dispatch: Dispatch;
  /** 获取消息提示实例 */
  messageToast: IMessageToast;
  /** 更新视频视图 */
  updateVideoView: (params?: IUpdateVideoViewParams) => Promise<void>;
  /** 离开事件 */
  onLeave: () => Promise<void>;
  /** 创建通话消息 */
  onCreateMessage: (params: ICreateClientParams) => Promise<void>;
  /** 邀请通话消息 */
  onInviteMessage: messageEvent;
  /** 取消通话消息 */
  onCancelMessage: messageEvent;
  /** 超时取消通话消息 */
  onTimeoutCancelMessage: messageEvent;
  /** 挂断通话消息 */
  onHangUpMessage: messageEvent;
  /** 拒绝通话消息 */
  onRejectMessage: messageEvent;
  /** 超时拒绝通话消息 */
  onTimeoutRejectMessage: messageEvent;
  /** 视频和语音切换消息 */
  onSwitchMessage: messageEvent;
  /** 进入房间消息 */
  onEnterRoomMessage: messageEvent;
  /** 新增成员消息 */
  onAddMemberMessage: messageEvent;
}

export interface GmRtcClientPluginContext extends GmRtcClientRef {
  /** 内部使用 允许给组件的 ref 上添加一些对外暴露的属性 */
  addImperativeHandle: (handlers: object) => void;
  /** 强制组件重渲染 */
  forceUpdate: React.DispatchWithoutAction;
  /** 渲染其他信息 */
  renderOtherInfoPlugin: (node: React.ReactNode) => void;
  renderMemberTemplatePlugin: (fn: renderMemberTemplateFn) => void;
}

export type GmRtcClientPluginFunc = {
  [K in keyof PluginRtcEventMap]: Callback<PluginRtcEventMap[K]>;
};

export interface GmRtcClientPlugin {
  (props: IGmRtcProps, context: GmRtcClientPluginContext): Partial<GmRtcClientPluginFunc>;
}

export type ResolvedProps = ReturnType<typeof resolveProps>;
