import React, {
  MouseEventHandler,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useReducer,
} from 'react';
import Draggable from 'react-draggable';
import PubSub from 'pubsub-js';
import {
  GmRtcClientPluginFunc,
  GmRtcClientRef,
  IGmRtcProps,
  IUpdateVideoViewParams,
  PluginEvent,
} from './types';
import { ResizableBox } from 'react-resizable';
import classNames from 'classnames';
import { RemoteStreamInfo, RemoteUserInfo, Stream } from 'trtc-js-sdk';
import styles from './index.less';
import UsePrivateModel from './usePrivateModel';
import Model, { IVideoView, StateType } from './models';
import { CallModeText, ECallType } from '@/types/ECallType';
import { usePluginContainer } from './plugins';
import { ECallState } from '@/types/ECallState';
import { IMembersInfo } from '@wjj/gm-type/dist/models/saas/members-info.model';
import { GmIcon, GmNotification } from '@wjj/gm-antd';
import { formatDuration, onExitFullScreen, onFullScreen } from '@/utils';
import {
  pullAllBy,
  isNil,
  cloneDeep,
  find,
  findIndex,
  isString,
  filter,
  capitalize,
} from 'lodash-es';
import MessageToast, {
  MessageItemParams,
  MessageNoticeFrequency,
  EMessageLevel,
} from './MessageToast';
import GmRtc, { EventHandler, EventTarget, IEventHandler, IGmRtc, RTCEvent } from './GmRtc';
import EVENT from '@/types/Event';
import { IVideoChatMessage } from '@/types/VideoChatMessage';
import {
  audioVideoSwitchTypeUsingPOST,
  getImUserInfo,
  cancelVideoCallUsingPOST,
  createVideoCallUsingPOST,
} from '@/services/index';
import { CallerUserCardText } from '@/types/ECallerUserCard';
import { IImCallCreateResponse } from '@wjj/gm-type/dist/models/saas/im-call-create-response.model';
import { ECancelEventType } from '@/types/ECancelEventType';
import { EKeyMember } from '@/types/EKeyMember';

/* 消息提示文案 */
const MessageText = {
  WAIT_CONNECT: '正在等待对方接收邀请...',
  JOIN_SUCCESS: '进入房间成功',
  JOIN_ERROR: '进入房间失败',
  SELF_ACCEPT: '通话已接受',
  SELF_REJECT: '通话已拒绝',
  SELF_HANG_UP: '通话已结束',
  SELF_TIMEOUT_CANCEL: '当前无人接听，请稍后再试',
  USER_CANCEL: '用户已取消',
  USER_BUSY: '用户繁忙，请稍后再试',
  USER_REJECT: '用户已拒绝',
  USER_TIMEOUT_REJECT: '当前无人接听，请稍后再试',
  USER_ACCEPT: '用户同意进行连接',
  VIDEO_INITIAL: '正在建立通道...',
  INITIALIZE_SUCCESS: '音视频初始化成功',
  SWITCH_TO_AUDIO_SUCCESS: '摄像头已关闭',
  CONNECT_SUCCESS: '连接成功',
  USER_HANG_UP: '用户已挂断',
  MUTE_SUCCESS: '已静音',
  UNMUTE_SUCCESS: '已取消静音',
  SWITCH_AUDIO: '已切换为语音',
};

// 默认头像
const DEFAULT_AVATAR_URL = 'https://image.nhf.cn/Fv0j7xZ1kxuhrQzcbIs_4BRKeuu3';
/* 图标地址 */
const IconUrl = {
  /* 挂断 */
  HANG_UP: 'https://image.nhf.cn/Fsh1b6idA7AmUQ_B8h4myHFrO2RF',
  /* 接通 */
  ACCEPT: 'https://image.nhf.cn/Fg6VbZoPhg71xfbFb4JbtXGwrcj6',
  /* 静音 */
  MUTE: 'https://image.nhf.cn/FliDBa0AA5yp3IBU0sq4iH0YySHY',
  /* 取消静音 */
  UNMUTE: 'https://image.nhf.cn/Fsah4HIjYgLOVQqx9c0cCWCHjPeM',
  /* 音频 */
  AUDIO: 'https://image.nhf.cn/FsQ0kOM4ToRvYRG1SuH9N32WckiQ',
};

interface IBtnItem {
  name: string;
  node: React.ReactNode;
}

export type IVideoChatCallback = (value: any) => void;

export interface ICreateClientParams {
  /* 呼叫类型(1音频呼叫 2视频呼叫) */
  callType: number;
  /* 被叫accountNo */
  calledAccountNo: string;
  /* 被叫诊所id */
  calledTenantId: number;
  /* 被叫类型 1 患者,2 员工,3 团队,4 系统,5.医生,6健康管家,7.私家医生,8 .专家医生 */
  calledUserCard: number;
  /* 主叫类型 1 患者,2 员工,3 团队,4 系统,5.医生,6健康管家,7.私家医生,8 .专家医生 */
  callerUserCard?: number;
  extend?: string;
}

interface ICreateRtcClientParams {
  /* 房间号 */
  roomId: number;
}

export interface IEventItem {
  name: string;
  callback: (value: any) => void;
}

export const GmRtcClient = React.forwardRef<GmRtcClientRef, IGmRtcProps>((rawProps, ref) => {
  const props = resolveProps(rawProps);
  const { style, className, topic } = props;

  const { namespace, data, dispatch, getState } = UsePrivateModel<StateType | null>({
    prefix: 'videochat',
    model: Model,
  });

  let handlers = {};
  const addImperativeHandle = pluginHandlers => {
    handlers = Object.assign(handlers, pluginHandlers);
  };

  const [_, forceUpdate] = useReducer(x => x + 1, 0);

  const { fullScreen, selfMember, callState, expand, mainVideoView, mute, videoType } = (data ||
    {}) as StateType;

  // 提示文案
  const [tipText, setTipsText] = useState<Nullable<string>>(null);
  // 消息提示队列
  const [messageToast] = useState(
    new MessageToast({
      noticeFrequency: MessageNoticeFrequency.ALWAYS,
      interval: 1000,
    }),
  );
  // 音视频计时消息id
  const videoTimeToastId = useRef<Nullable<string>>(null);

  /* 插件初始化生命周期 */
  useEffect(() => {
    pluginContainer?.onInitial?.();
  }, []);

  /* 数据比较 */
  const compareList = <T, K>(
    oldList: T[],
    newList: T[],
    iteratee: K,
  ): {
    add: T[];
    remove: T[];
  } => {
    const add = pullAllBy(cloneDeep(newList), cloneDeep(oldList), iteratee);
    const remove = pullAllBy(cloneDeep(oldList), cloneDeep(newList), iteratee);
    return {
      add,
      remove,
    };
  };

  /* 无限时间的提示 */
  const setInfinityToast = (params: Partial<MessageItemParams>) => {
    messageToast.clear();
    return messageToast.show({
      level: EMessageLevel.LOW,
      time: Infinity,
      ...params,
    } as MessageItemParams);
  };

  /* 通过userId获取流 */
  const getStreamByUserId = useCallback((userId: string | undefined) => {
    const client = getState()?.client;
    if (client) {
      return client.getMembers().get(userId as string);
    }
    return null;
  }, []);

  /* 主视频视图 */
  const updateMainVideoView = async (params?: IUpdateVideoViewParams) => {
    const { userId } = params || {};
    const mainVideoViewItem = getState()?.mainVideoView;
    const newVideoView: IVideoView = {
      memberInfo: undefined,
      stream: undefined,
    };
    if (isNil(userId)) {
      // 更新数据
      const memberInfo = find(
        getState()?.members,
        o => o.memberAccount === mainVideoViewItem?.memberInfo?.memberAccount,
      );
      if (isNil(memberInfo)) {
        // 停止原数据视频流
        if (mainVideoViewItem?.stream) {
          mainVideoViewItem.stream.stop();
        }
        const defaultMember = getDefaultMember();
        newVideoView.memberInfo = defaultMember;
        newVideoView.stream = getStreamByUserId(defaultMember?.memberAccount) as Stream;
      } else {
        newVideoView.memberInfo = memberInfo;
        newVideoView.stream = getStreamByUserId(memberInfo.memberAccount) as Stream;
      }
    } else {
      const memberInfo = find(getState()?.members, o => o.memberAccount === userId);
      if (!memberInfo) {
        return;
      }
      // 停止主视频流
      if (mainVideoViewItem?.stream) {
        mainVideoViewItem.stream.stop();
      }
      newVideoView.memberInfo = memberInfo;
      newVideoView.stream = getStreamByUserId(memberInfo?.memberAccount) as Stream;
    }
    // 更新视频流
    if (newVideoView.stream) {
      newVideoView.stream.stop();
      await newVideoView.stream.play('main-video');
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        mainVideoView: newVideoView,
      },
    });
  };

  /* 更新右侧用户列表视图 */
  const updateMinorVideoViews = async () => {
    const oldMinorVideoViews = getState()?.minorVideoViews || [];
    // 主视频userId
    const mainVideoUserId = getState()?.mainVideoView?.memberInfo?.memberAccount;
    const newMembers = getState()?.members || [];
    const newMinorMembers = (getState()?.minorVideoViews || []).map(o => o.memberInfo);
    // 新成员信息和旧视图数据进行比较
    const compareRes = compareList(
      newMinorMembers,
      newMembers,
      (o: IMembersInfo) => o.memberAccount,
    );
    const { add: addList, remove: removeList } = compareRes;
    // 更新成员流信息
    const newMinorVideoViews = (oldMinorVideoViews || []).map(item => ({
      ...item,
      stream: getStreamByUserId(item.memberInfo?.memberAccount),
    }));
    // 新增数据
    addList.forEach(item => {
      newMinorVideoViews.push({
        memberInfo: item,
        stream: getStreamByUserId(item?.memberAccount),
      });
    });
    // 删除数据
    removeList.forEach(item => {
      const index = findIndex(
        newMinorVideoViews,
        o => o.memberInfo?.memberAccount === item?.memberAccount,
      );
      // 停止相关流播放
      const { stream } = newMinorVideoViews[index];
      if (stream) {
        stream.stop();
      }
      newMinorVideoViews.splice(index, 1);
    });
    // 不包主视频的成员列表
    const otherVideoViews = newMinorVideoViews.filter(
      item => item?.memberInfo?.memberAccount !== mainVideoUserId,
    );
    // 更新视频状态
    for (const item of otherVideoViews) {
      if (item.stream) {
        item.stream.stop();
        await item.stream.play(`video-${item.memberInfo?.memberAccount}`);
      }
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        minorVideoViews: newMinorVideoViews,
      },
    });
  };

  /* 更新视频视图 */
  const updateVideoView = async (params?: IUpdateVideoViewParams) => {
    const { roomId } = params || {};
    await dispatch({
      type: `${namespace}/getImRoomInfo`,
      payload: {
        roomId: roomId || getState()?.roomId,
      },
    });
    await updateMainVideoView(params);
    await updateMinorVideoViews();
  };

  /* 进房成功事件 */
  const handleJoinSuccess = async () => {
    // messageToast.show({ content: MessageText.JOIN_SUCCESS, level: EMessageLevel.MIDDLE });
    await updateVideoView();
    // 渲染对应的视频
  };

  /* 进房失败件 */
  const handleJoinError = async () => {
    messageToast.show({ content: MessageText.JOIN_ERROR, level: EMessageLevel.MIDDLE });
    GmNotification.error(MessageText.JOIN_ERROR);
    await leave();
  };

  /* 初始化成功 */
  const handleInitializeSuccess = () => {};

  /* 初始化失败事件 */
  const handleInitializeError = async (error: DOMException) => {
    switch (error.name) {
      case 'NotReadableError':
        GmNotification.error(
          '暂时无法访问摄像头/麦克风，请确保系统允许当前浏览器访问摄像头/麦克风，并且没有其他应用占用摄像头/麦克风',
        );
        break;
      case 'NotAllowedError':
        if (error.message === 'Permission denied by system') {
          GmNotification.error('请确保系统允许当前浏览器访问摄像头/麦克风');
        } else {
          console.log('User refused to share the screen');
        }
        break;
      case 'NotFoundError':
        GmNotification.error(
          '浏览器获取不到摄像头/麦克风设备，请检查设备连接并且确保系统允许当前浏览器访问摄像头/麦克风',
        );
        break;
      case 'AbortError':
        GmNotification.error('由于某些未知原因导致设备无法被使用');
        break;
      default:
        console.error('handleInitializeError', error);
    }
    await cancelVideoCall(ECancelEventType.CANCEL);
    await leave();
  };

  /* Audio/Video Player 状态变化 */
  const handlePlayerStateChange = () => {};

  /* 推流成功 */
  const handlePublishSuccess = async () => {
    // const localStream = rtcClient?.getLocalStream();
    await updateVideoView();
  };

  /* 推流失败 */
  const handlePublishError = async () => {
    GmNotification.error('视频流推送失败');
    await leave();
  };

  const handleError = (error: any) => {
    const errorCode = error.getCode();
    if (errorCode === 0x4043) {
      // 自动播放受限，引导用户手势操作并调用 stream.resume 恢复音视频播放
      // 参考：https://trtc-1252463788.file.myqcloud.com/web/docs/module-ErrorCode.html#.PLAY_NOT_ALLOWED
    } else if (errorCode === 0x4044) {
      // 媒体设备被拔出后自动恢复失败，参考：https://trtc-1252463788.file.myqcloud.com/web/docs/module-ErrorCode.html#.DEVICE_AUTO_RECOVER_FAILED
    }
  };

  /* 用户被踢出房间 */
  const handleClientBanned = () => {
    GmNotification.error('设备已在其他端登录');
    window.location.reload();
  };

  /* 远端用户进房 */
  const handlePeerJoin = async (userInfo: RemoteUserInfo) => {
    console.log('handlePeerJoin');
    await updateVideoView();
    // 提示用户进房信息
    const memberInfo = find(getState()?.members, o => o.memberAccount === userInfo.userId);
    if (memberInfo) {
      messageToast.show({
        content: `${memberInfo.nickname}（${
          CallerUserCardText[memberInfo.userCard as number]
        }）加入房间`,
        level: EMessageLevel.MIDDLE,
      });
    }
    // 切换为视频中状态
    await changeCallState(ECallState.CALLING);
  };

  /* 远端用户离房 */
  const handlePeerLeave = async (evt: RemoteUserInfo) => {
    const memberInfo = find(getState()?.members, o => o.memberAccount === evt.userId);
    if (memberInfo) {
      messageToast.show({
        content: `${memberInfo.nickname}（${
          CallerUserCardText[memberInfo.userCard as number]
        }）离开房间`,
        level: EMessageLevel.MIDDLE,
      });
    }
    await updateVideoView();
  };

  /* 远端流添加 */
  const handleStreamAdd = async () => {
    await updateVideoView();
  };

  /* 远端流订阅成功 */
  const handleStreamSubscribed = async (evt: RemoteStreamInfo) => {
    console.log('handleStreamSubscribed', evt);
    if (!videoTimeToastId.current) {
      videoTimeToastId.current = setInfinityToast({
        content: getVideoDuration(),
      });
    }
    await updateVideoView();
  };

  /* 远端流移除 */
  const handleStreamRemove = async (evt: RemoteStreamInfo) => {
    const userId = evt.stream.getUserId();
    await updateVideoView();
    // 如果是关键人直接离开
    const isKeyMember =
      (getState()?.members || []).find(o => o.memberAccount === userId) === EKeyMember.MAIN;
    if (isKeyMember) {
      await leave();
    }
  };

  /* 远端流更新 */
  const handleStreamUpdate = async (evt: RemoteStreamInfo) => {
    console.log('handleStreamUpdate', evt);
    // await updateStream(evt);
    await updateVideoView();
  };

  /**
   * 短横线命名转驼峰命名 my-fun -> onMyFun
   * @param name
   */
  const transformKebabCaseToCamelCase = (name: string) => {
    return `on${(name || '')
      .split('-')
      .map(item => capitalize(item))
      .join('')}`;
  };

  /* 暴露rtc事件给外部 */
  const [externalEventHandler] = useState<IEventHandler>(() => {
    const handler = {} as EventTarget;
    Object.keys(RTCEvent).forEach(item => {
      const name = RTCEvent[item];
      const formatName = transformKebabCaseToCamelCase(name);
      function eventFn() {
        pluginContainer?.[formatName]?.(...arguments);
      }
      handler[name] = eventFn;
    });
    return new EventHandler(handler);
  });

  console.log('externalEventHandler', externalEventHandler);

  /* 事件处理 */
  const [eventHandler] = useState<IEventHandler>(
    new EventHandler({
      [RTCEvent.JOIN_SUCCESS]: handleJoinSuccess,
      [RTCEvent.JOIN_ERROR]: handleJoinError,
      [RTCEvent.INITIALIZE_SUCCESS]: handleInitializeSuccess,
      [RTCEvent.INITIALIZE_ERROR]: handleInitializeError,
      [RTCEvent.PLAYER_STATE_CHANGED]: handlePlayerStateChange,
      [RTCEvent.PUBLISH_SUCCESS]: handlePublishSuccess,
      [RTCEvent.PUBLISH_ERROR]: handlePublishError,
      [RTCEvent.ERROR]: handleError,
      [RTCEvent.CLIENT_BANNED]: handleClientBanned,
      [RTCEvent.PEER_JOIN]: handlePeerJoin,
      [RTCEvent.PEER_LEAVE]: handlePeerLeave,
      [RTCEvent.STREAM_ADDED]: handleStreamAdd,
      [RTCEvent.STREAM_SUBSCRIBED]: handleStreamSubscribed,
      [RTCEvent.STREAM_REMOVED]: handleStreamRemove,
      [RTCEvent.STREAM_UPDATED]: handleStreamUpdate,
    }),
  );

  /* 初始化数据 */
  const initialState = async (): Promise<void> => {
    // 清除toast资源
    if (messageToast) {
      messageToast.clear();
    }
    setTipsText(null);
    videoTimeToastId.current = null;
    await dispatch({
      type: `${namespace}/clear`,
    });
  };

  /* 创建RTC客户端 */
  const createRtcClient = async (params: ICreateRtcClientParams): Promise<Nullable<IGmRtc>> => {
    const res = await getTencentImInfo();
    console.log(
      'getTencentImInfo:',
      res,
      '\r\n roomId:',
      params.roomId,
      '\r\nsdkAppId:',
      getState()?.sdkAppId,
    );
    const sdkAppId = getState()?.sdkAppId as number;
    if (
      isNil(params) ||
      isNil(sdkAppId) ||
      isNil(res?.userId) ||
      isNil(res?.userSig) ||
      isNil(params.roomId)
    ) {
      console.error("create client failed: params can't empty");
      GmNotification.error('视频客户端创建失败: 参数异常');
      return null;
    }
    const newRtcClient = new GmRtc({
      sdkAppId,
      userId: res?.userId,
      userSig: res?.userSig,
      roomId: params.roomId as number,
      audio: true,
      video: getState()?.callType === ECallType.VIDEO,
    });
    newRtcClient.subscribe(eventHandler);
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        client: newRtcClient,
      },
    });
    return newRtcClient;
  };

  /**
   * 获取腾讯im相关信息
   */
  const getTencentImInfo = async () => {
    const { userId, userSig } = (getState() || {}) as StateType;
    if (!isNil(userId) && !isNil(userSig)) {
      return {
        userId,
        userSig,
      };
    }
    const res: any = await getImUserInfo();
    if (res) {
      return {
        userId: res.accountNo,
        userSig: res.tencentUserSig,
      };
    }
    return null;
  };

  /* 改变store中拨打状态 */
  const onChangeCallStateModel = async (state: ECallState) => {
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        callState: state,
      },
    });
  };

  /* 拨打状态切换 */
  const changeCallState = async (state: ECallState) => {
    if (state === getState()?.callState) {
      console.warn('call state repeat has been ignored');
      return;
    }
    await onChangeCallStateModel(state);
    // 设置为拨打用户中
    if (state === ECallState.ON_CALL) {
      messageToast.clear();
      messageToast.show({
        content: MessageText.WAIT_CONNECT,
        time: Infinity,
        level: EMessageLevel.LOW,
      });
    }
    // 设置为拨打用户中
    if (state === ECallState.BE_CALLED) {
      messageToast.clear();
      messageToast.show({
        content: `邀请您${CallModeText[getState()?.callType as ECallType]}通话...`,
        time: Infinity,
        level: EMessageLevel.LOW,
      });
    }
    // 设置为拨打用户中
    if (state === ECallState.CALLING) {
      messageToast.show({
        content: MessageText.VIDEO_INITIAL,
        level: EMessageLevel.LOW,
      });
    }
  };

  /* 计算时间 */
  const getVideoDuration = useCallback(() => {
    const initialTime = performance.now();
    let time = 0;
    return (newTime: number) => {
      if (newTime) {
        time = newTime;
      }
      time = performance.now() - initialTime;
      return formatDuration(time);
    };
  }, []);

  useEffect(() => {
    // 订阅消息队列
    messageToast.subscribe(message => {
      const contentText = isString(message.content) ? message.content : message.content();
      console.log('订阅消息', contentText);
      setTipsText(contentText);
    });
    return () => {
      // 销毁消息队列，防止setInterval内存泄露
      messageToast.destory();
    };
  }, [messageToast]);

  /**
   * 是否处理该条消息
   * @param message 消息内容
   * @param 订阅消息名称
   */
  const isHandlerMessage = useCallback((name: string, message: IVideoChatMessage): boolean => {
    const roomId = getState()?.roomId;
    if (name === EVENT.VIDEO_CHAT_INVITE_HANDLER) {
      return isNil(roomId);
    }
    // 需要在视频拨打中并且和当前进行中的房间号匹配才处理
    const messageCodeList: string[] = [
      EVENT.VIDEO_CHAT_INVITE_HANDLER,
      EVENT.VIDEO_CHAT_TIMEOUT_CANCEL_HANDLER,
      EVENT.VIDEO_CHAT_HANGUP_HANDLER,
      EVENT.VIDEO_CHAT_REJECT_HANDLER,
      EVENT.VIDEO_CHAT_TIMEOUT_REJECT_HANDLER,
      EVENT.VIDEO_CHAT_SWITCH_HANDLER,
      EVENT.VIDEO_CHAT_ENTER_ROOM_HANDLER,
      EVENT.VIDEO_CHAT_ADD_MEMBER_HANDLER,
    ];
    if (messageCodeList.some(o => o === name)) {
      return !isNil(roomId) && message.roomId === roomId;
    }
    return true;
  }, []);

  /* 订阅的消息主题 */
  const getTopic = useCallback(
    (eventName: string) => (topic ? `${topic}-${eventName}` : eventName),
    [topic],
  );

  /**
   * 默认选中的用户
   */
  const getDefaultMember = useCallback(
    () =>
      find(
        filter(getState()?.members, o => o.isKeyMember === EKeyMember.MAIN),
        o => o.memberAccount !== getState()?.userId,
      ),
    [],
  );

  const ignoreMessage = (msg: IVideoChatMessage): boolean => {
    return isNil(msg?.roomId) || getState()?.roomId !== msg.roomId;
  };

  /* 创建音视频 */
  const handleVideoChatCreate = async (params: ICreateClientParams) => {
    console.log('handleVideoChatCreate', params);
    let res = {} as IImCallCreateResponse;
    try {
      // 创建音视频会话
      let res = await createVideoCallUsingPOST(params);
      console.log('创建音视频会话成功');
    } catch (e) {
      console.error('创建音视频会话失败');
      await leave();
      return;
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        roomId: res.roomId,
        conversationId: res.conversationId,
        callType: params.callType,
        videoType: params.callType,
      },
    });
    await changeCallState(ECallState.ON_CALL);
    const client = await createRtcClient({
      roomId: res?.roomId as number,
    });
    await updateVideoView();
    if (client) {
      await client.join();
      await client.publish();
    }
  };

  /* 取消音视频会话 */
  const cancelVideoCall = async (eventType: ECancelEventType) => {
    if (
      isNil(getState()?.callType) ||
      isNil(getState()?.userCard) ||
      isNil(getState()?.conversationId) ||
      isNil(eventType) ||
      isNil(getState()?.roomId)
    ) {
      console.warn("cancel video params can't empty");
      return;
    }
    await cancelVideoCallUsingPOST({
      callType: getState()?.callType,
      callerUserCard: getState()?.userCard,
      conversationId: getState()?.conversationId,
      eventType,
      roomId: getState()?.roomId,
    });
  };

  /* 会话邀请 */
  const handleVideoChatInvite = async (value: IVideoChatMessage) => {
    console.log('handleVideoChatInvite', value);
    if (!isNil(getState()?.roomId)) {
      return;
    }
    // 主叫人imKey
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        roomId: value.roomId,
        conversationId: value.conversationId,
      },
    });
    await createRtcClient({
      roomId: value.roomId,
    });
    await updateVideoView({
      roomId: value.roomId,
      userId: value.sponsorImKey,
    });
    // 设置拨打状态
    await changeCallState(ECallState.BE_CALLED);
  };

  /* 取消会话 */
  const handleVideoChatCancel = async (msg: IVideoChatMessage) => {
    console.log('handleVideoChatCancel');
    if (ignoreMessage(msg)) {
      return;
    }
    GmNotification.warn(MessageText.USER_CANCEL);
    await cancelVideoCall(ECancelEventType.CANCEL);
    await leave();
  };

  /* 超时取消 */
  const handleVideoChatTimeoutCancel = async (msg: IVideoChatMessage) => {
    console.log('handleVideoChatTimeoutCancel');
    if (ignoreMessage(msg)) {
      return;
    }
    GmNotification.warn(MessageText.SELF_TIMEOUT_CANCEL);
    await cancelVideoCall(ECancelEventType.CANCEL);
    await leave();
  };

  /* 挂断 */
  const handleVideoChatHangup = async (msg: IVideoChatMessage) => {
    console.log('handleVideoChatHangup');
    if (ignoreMessage(msg)) {
      return;
    }
    GmNotification.warn(MessageText.USER_HANG_UP);
    await cancelVideoCall(ECancelEventType.CANCEL);
    await leave();
  };

  /* 拒绝 */
  const handleVideoChatReject = async (msg: IVideoChatMessage) => {
    console.log('handleVideoChatReject');
    if (ignoreMessage(msg)) {
      return;
    }
    GmNotification.warn(MessageText.USER_REJECT);
    await cancelVideoCall(ECancelEventType.CANCEL);
    await leave();
  };

  /* 超时拒绝 */
  const handleVideoChatTimeoutReject = async (msg: IVideoChatMessage) => {
    console.log('handleVideoChatTimeoutReject');
    if (ignoreMessage(msg)) {
      return;
    }
    GmNotification.warn(MessageText.USER_TIMEOUT_REJECT);
    await cancelVideoCall(ECancelEventType.CANCEL);
    await leave();
  };

  /* 音视频切换 */
  const handleVideoChatSwitch = async (msg: IVideoChatMessage) => {
    console.log('handleVideoChatSwitch');
    if (ignoreMessage(msg)) {
      return;
    }
    GmNotification.success(MessageText.SWITCH_TO_AUDIO_SUCCESS);
  };

  /* 进房 */
  const handleVideoChatEnterRoom = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    console.log('handleVideoChatEnterRoom');
    await updateVideoView();
  };

  /* 新增成员 */
  const handleVideoChatAddMember = async (msg: IVideoChatMessage) => {
    if (ignoreMessage(msg)) {
      return;
    }
    console.log('handleVideoChatAddMember');
    await updateVideoView();
  };

  /* 全局消息事件 */
  useEffect(() => {
    const eventList: IEventItem[] = [
      { name: EVENT.VIDEO_CHAT_CREATE, callback: handleVideoChatCreate },
      { name: EVENT.VIDEO_CHAT_INVITE_HANDLER, callback: handleVideoChatInvite },
      { name: EVENT.VIDEO_CHAT_CANCEL_HANDLER, callback: handleVideoChatCancel },
      {
        name: EVENT.VIDEO_CHAT_TIMEOUT_CANCEL_HANDLER,
        callback: handleVideoChatTimeoutCancel,
      },
      { name: EVENT.VIDEO_CHAT_HANGUP_HANDLER, callback: handleVideoChatHangup },
      { name: EVENT.VIDEO_CHAT_REJECT_HANDLER, callback: handleVideoChatReject },
      {
        name: EVENT.VIDEO_CHAT_TIMEOUT_REJECT_HANDLER,
        callback: handleVideoChatTimeoutReject,
      },
      { name: EVENT.VIDEO_CHAT_SWITCH_HANDLER, callback: handleVideoChatSwitch },
      { name: EVENT.VIDEO_CHAT_ENTER_ROOM_HANDLER, callback: handleVideoChatEnterRoom },
      { name: EVENT.VIDEO_CHAT_ADD_MEMBER_HANDLER, callback: handleVideoChatAddMember },
    ];

    /* 过滤事件 */
    const filterEvent = (name: string, value: any, callback: IVideoChatCallback): void => {
      if (!isHandlerMessage(name, value)) {
        return;
      }
      callback(value);
    };
    const tokenList = eventList.map(item =>
      PubSub.subscribe(getTopic(item.name), (name: string, value: any) =>
        filterEvent(item.name, value, item.callback),
      ),
    );
    return () => {
      tokenList.forEach(item => {
        PubSub.unsubscribe(item);
      });
    };
  }, []);

  /* 结束音视频 */
  const leave = async () => {
    if (getState()?.client) {
      await getState()?.client?.leave?.();
    }
    await initialState();
  };

  /* 改变展开状态 */
  const onChangeExpand = (state: boolean) => {
    dispatch({
      type: `${namespace}/setState`,
      payload: {
        expand: !state,
      },
    });
  };

  /* 改变全屏状态 */
  const changeFullScreenState = (state: boolean) => {
    dispatch({
      type: `${namespace}/setState`,
      payload: {
        fullScreen: state,
      },
    });
  };

  /* 退出全屏 */
  const onChangeExitFullScreen = () => {
    changeFullScreenState(false);
    onExitFullScreen();
  };

  /* 退出全屏 */
  const onChangeFullScreen = () => {
    changeFullScreenState(true);
    onFullScreen();
  };

  /**
   * 全屏切换
   * @param val 是否全屏
   */
  const handleChangeFullScreen = (val: boolean) => {
    // 退出全屏
    if (val) {
      onChangeExitFullScreen();
    } else {
      onChangeFullScreen();
    }
  };

  /* 监听全屏事件 */
  const onFullscreenChange = () => {
    // 退出全屏
    if (!document.fullscreenElement) {
      changeFullScreenState(false);
    }
  };

  useEffect(() => {
    // 监听全屏事件
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'].forEach(item => {
      window.addEventListener(item, onFullscreenChange);
    });
    return () => {
      // 销毁全屏事件
      ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'].forEach(item => {
        window.removeEventListener(item, onFullscreenChange);
      });
    };
  }, []);

  /* 选中用户 */
  const handleSelectMember = async (
    event: React.MouseEvent<HTMLDivElement>,
    memberInfo?: IMembersInfo,
  ) => {
    event.stopPropagation();
    // 设置主视频流停止渲染
    const mainVideoViewItem = getState()?.mainVideoView;
    if (memberInfo?.memberAccount === mainVideoViewItem?.memberInfo?.memberAccount) {
      return;
    }
    await updateVideoView({
      userId: memberInfo?.memberAccount,
    });
  };

  /* 接听 */
  const handleOnAccept = async () => {
    const client = getState()?.client;
    GmNotification.success(MessageText.SELF_ACCEPT);
    await changeCallState(ECallState.CALLING);
    if (client) {
      await client.join();
      await client.publish();
    }
  };

  /* 拒绝 */
  const handleOnRefuse = async () => {
    GmNotification.warn(MessageText.SELF_REJECT);
    await cancelVideoCall(ECancelEventType.REJECT);
    await leave();
  };

  /* 挂断 */
  const handleOnCancel = async () => {
    GmNotification.warn(MessageText.SELF_HANG_UP);
    await cancelVideoCall(ECancelEventType.HANG_UP);
    await leave();
  };

  /* 切换语音通话 */
  const handleOnAudio = async () => {
    const client = getState()?.client;
    if (client) {
      await client.removeVideoTrack();
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        videoType: ECallType.AUDIO,
      },
    });
    GmNotification.success(MessageText.SWITCH_AUDIO);
    messageToast.show({
      content: MessageText.SWITCH_AUDIO,
      level: EMessageLevel.MIDDLE,
    });
    await audioVideoSwitchTypeUsingPOST({
      callType: ECallType.AUDIO,
      callerUserCard: getState()?.userCard,
      conversationId: getState()?.conversationId,
      roomId: getState()?.roomId,
    });
  };

  /* 静音 */
  const handleOnMute = async () => {
    const client = getState()?.client;
    if (client) {
      client.muteLocalAudio();
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        mute: true,
      },
    });
    GmNotification.success(MessageText.MUTE_SUCCESS);
    messageToast.show({
      content: MessageText.MUTE_SUCCESS,
      level: EMessageLevel.MIDDLE,
    });
  };

  /* 取消静音 */
  const handleOnUnmute = async () => {
    const client = getState()?.client;
    if (client) {
      client.unmuteLocalAudio();
    }
    await dispatch({
      type: `${namespace}/setState`,
      payload: {
        mute: false,
      },
    });
    GmNotification.success(MessageText.UNMUTE_SUCCESS);
    messageToast.show({
      content: MessageText.UNMUTE_SUCCESS,
      level: EMessageLevel.MIDDLE,
    });
  };

  const utilsFn = {
    updateVideoView,
    messageToast,
    namespace,
    getState,
    dispatch,
    onCreateMessage: handleVideoChatCreate,
    onInviteMessage: handleVideoChatInvite,
    onCancelMessage: handleVideoChatCancel,
    onTimeoutCancelMessage: handleVideoChatTimeoutCancel,
    onHangUpMessage: handleVideoChatHangup,
    onRejectMessage: handleVideoChatReject,
    onTimeoutRejectMessage: handleVideoChatTimeoutReject,
    onSwitchMessage: handleVideoChatSwitch,
    onEnterRoomMessage: handleVideoChatEnterRoom,
    onAddMemberMessage: handleVideoChatAddMember,
  };

  const pluginContext = {
    addImperativeHandle,
    forceUpdate,
    ...utilsFn,
  };

  const pluginContainer = usePluginContainer(props, pluginContext);

  console.log('pluginContainer', pluginContainer);

  pluginContainer?.onJoinSuccess?.('23');

  useImperativeHandle(ref, () => ({
    ...utilsFn,
    ...handlers,
  }));

  // 渲染呼叫提示信息
  const renderTips = useCallback(
    (text?: React.ReactNode) => (
      <div className={styles.tips} id="videochat-tips">
        {text}
      </div>
    ),
    [],
  );

  // 渲染操作按钮
  const renderOperateBtn = (
    name: React.ReactNode,
    icon: string,
    onClick?: MouseEventHandler<Element>,
  ) => (
    <div className={styles.operateBtn} onClick={onClick}>
      <div className={styles.operateBtnIcon} style={{ backgroundImage: `url("${icon}")` }} />
      <div className={styles.operateBtnText}>{name}</div>
    </div>
  );

  /**
   * 渲染展开状态
   * @param val 是否展开
   */
  const renderExpandIcon = (val: boolean) => (
    <div className={styles.expandIconContent} onClick={() => onChangeExpand(val)}>
      <GmIcon className={styles.expandIcon} type={`fas fa-chevron-${val ? 'left' : 'right'}`} />
    </div>
  );

  const renderName = (userInfo: IMembersInfo | undefined, alias?: string) => (
    <div>
      <span title={alias || userInfo?.nickname}>{alias || userInfo?.nickname}</span>
      {!isNil(userInfo?.userCard) && (
        <span title={CallerUserCardText[userInfo?.userCard as number]}>
          （{CallerUserCardText[userInfo?.userCard as number]}）
        </span>
      )}
    </div>
  );

  /**
   * 渲染用户卡片
   * @param userInfo 用户信息
   * @param selected 是否选中
   * @param alias 自定义别名
   */
  const renderUserCard = (userInfo: IMembersInfo, selected: boolean = false, alias?: string) => (
    <div
      className={classNames(styles.userCard, {
        [styles.userCardSelected]: selected,
        [styles.userCardUnSelected]: !selected,
      })}
    >
      <div className={styles.videoItem} id={`video-${userInfo?.memberAccount}`} />
      <div
        className={styles.userCardAvatar}
        style={{ backgroundImage: `url("${userInfo?.headPortrait}")` }}
      />
      <div className={styles.userCardShade} />
      <div className={styles.userCardText}>{renderName(userInfo, alias)}</div>
    </div>
  );

  /**
   * 渲染呼叫信息
   * @param memberInfo 用户信息
   * @param callText 呼叫文案
   */
  const renderUserInfo = (memberInfo?: IMembersInfo | undefined, callText?: React.ReactNode) => (
    <div className={styles.userInfo}>
      <div
        className={styles.userInfoAvatar}
        style={{ backgroundImage: `url("${memberInfo?.headPortrait || DEFAULT_AVATAR_URL}")` }}
      />
      <div className={styles.userInfoText}>
        <div className={styles.userInfoName}>{renderName(memberInfo)}</div>
        <div className={styles.userInfoTips}>{callText}</div>
      </div>
    </div>
  );

  // 渲染被呼叫
  const renderBeCall = (
    <React.Fragment>
      <div className={styles.callContainer}>{renderUserInfo(mainVideoView?.memberInfo)}</div>
    </React.Fragment>
  );

  // 渲染呼叫用户中
  const renderOnCall = (
    <React.Fragment>
      <div className={styles.callContainer}>
        {renderUserInfo(mainVideoView?.memberInfo, `正在等待对方接受邀请…`)}
      </div>
    </React.Fragment>
  );

  // 渲染通话中
  const renderCalling = (
    <React.Fragment>
      <div className={styles.callContainer}>{renderUserInfo(mainVideoView?.memberInfo)}</div>
    </React.Fragment>
  );

  // 渲染右侧用户列表
  const renderMemberList = (data?.minorVideoViews || [])
    .map(item => item.memberInfo as IMembersInfo)
    .map(item => {
      const isSelf = selfMember?.memberAccount === item?.memberAccount;
      const isSelected = data?.mainVideoView?.memberInfo?.memberAccount === item?.memberAccount;
      return (
        <div key={item?.memberAccount} onClick={e => handleSelectMember(e, item)}>
          {renderUserCard(item, isSelected, isSelf ? '我' : undefined)}
        </div>
      );
    });

  // 渲染挂断按钮
  const renderHangUpBtn =
    (callState === ECallState.ON_CALL || callState === ECallState.CALLING) &&
    renderOperateBtn('挂断', IconUrl.HANG_UP, handleOnCancel);

  // 渲染接通按钮
  const renderAcceptBtn =
    callState === ECallState.BE_CALLED && renderOperateBtn('接通', IconUrl.ACCEPT, handleOnAccept);

  // 拒绝按钮
  const renderRefuseBtn =
    callState === ECallState.BE_CALLED && renderOperateBtn('拒绝', IconUrl.HANG_UP, handleOnRefuse);

  // 渲染切换语音按钮
  const renderAudioBtn =
    callState === ECallState.CALLING &&
    videoType === ECallType.VIDEO &&
    renderOperateBtn('切换语音', IconUrl.AUDIO, handleOnAudio);

  // 渲染静音按钮
  const renderMuteBtn =
    callState === ECallState.CALLING &&
    videoType === ECallType.AUDIO &&
    !mute &&
    renderOperateBtn('静音', IconUrl.MUTE, handleOnMute);

  // 渲染静音按钮
  const renderUnMuteBtn =
    callState === ECallState.CALLING &&
    videoType === ECallType.AUDIO &&
    mute &&
    renderOperateBtn('取消静音', IconUrl.UNMUTE, handleOnUnmute);

  // 渲染按钮组
  const renderButtonGroup: React.ReactNode = [
    { name: 'hang-up', node: renderHangUpBtn },
    { name: 'accept', node: renderAcceptBtn },
    { name: 'refuse', node: renderRefuseBtn },
    { name: 'audio', node: renderAudioBtn },
    { name: 'mute', node: renderMuteBtn },
    { name: 'unmute', node: renderUnMuteBtn },
  ].map((item: IBtnItem) => <React.Fragment key={item.name}>{item.node}</React.Fragment>);

  // 空闲状态不展示
  if (callState === ECallState.FREE) {
    return null;
  }

  /* 获取消息提示实例 */
  const getMessageToast = () => {
    return messageToast;
  };

  /* 获取model名称 */
  const getNamespace = () => {
    return namespace;
  };

  /* 获取rtc实例 */
  const getRtc = function () {
    return getState()?.client as Nullable<IGmRtc>;
  };

  return (
    <div
      className={classNames({ [styles.fullScreen]: fullScreen }, styles.container, className)}
      style={style}
    >
      <Draggable handle=".can-drag" disabled={fullScreen}>
        <ResizableBox
          draggableOpts={{ disabled: fullScreen }}
          width={512}
          height={300}
          minConstraints={[379, 222]}
          resizeHandles={['sw', 'se', 'nw', 'ne']}
          className={classNames(styles.resizableBox, 'videochat-realize-box')}
          // maxConstraints={[800, 800]}
          lockAspectRatio
        >
          <div className={classNames(styles.bg, 'can-drag')}>
            <div className={styles.leftContent}>
              <div className={styles.mainVideo} id="main-video" />
              <GmIcon
                type={`fa ${fullScreen ? 'fa-compress-alt' : 'fa-expand-alt'}`}
                className={styles.screenFullIcon}
                onClick={() => handleChangeFullScreen(fullScreen)}
              />
              {callState === ECallState.BE_CALLED && renderBeCall}
              {callState === ECallState.ON_CALL && renderOnCall}
              {callState === ECallState.CALLING && renderCalling}
              {renderExpandIcon(expand)}
              <div className={styles.footer}>
                {renderTips(tipText)}
                <div className={styles.buttonGroup}>{renderButtonGroup}</div>
              </div>
            </div>
            <div className={classNames(styles.rightContent, { [styles.contentExpand]: expand })}>
              {renderMemberList}
            </div>
          </div>
        </ResizableBox>
      </Draggable>
    </div>
  );
});

export function resolveProps(props: IGmRtcProps) {
  let { visible = true, plugins = [] } = props;

  return {
    ...props,
    plugins,
    visible,
  };
}
