import { find, pick } from 'lodash-es';
import type { Stream } from 'trtc-js-sdk';
import { ECallState } from '@/types/ECallState';
import type { IMembersInfo } from '@wjj/gm-type/dist/models/saas/members-info.model';
import type { ImVideoConversationRoomInfoVO } from '@wjj/gm-type/dist/models/saas';
import type { ECallerUserCard } from '@/types/ECallerUserCard';
import { ECallType } from '@/types/ECallType';
import { getImUserInfo, getImVideoConversationRoomInfoVOUsingPOST } from '@/services';
import type { IGmRtc } from '../GmRtc';
import type { BaseModel } from '../types';
import { EMemberStatus } from '@/types/EMemberStatus';
import type React from 'react';
import type { ReactNode } from 'react';
import type { IExtend } from '@/types/IExtend';

export type Nullable<T> = T | null;

export interface IVideoView {
  /** 成员信息 */
  memberInfo?: IMembersInfo;
  /** 音视频流 */
  stream?: Stream;
}

export interface StateType {
  client: Nullable<IGmRtc>;
  /** 会话id */
  conversationId: Nullable<number>;
  /** 视频通话状态 */
  callState: ECallState;
  /** 视频弹窗是否可见 */
  visible: boolean;
  /** 房间信息 */
  roomId: Nullable<number>;
  /** 应用标识 */
  sdkAppId: Nullable<number>;
  /** 用户标识 */
  userId: Nullable<string>;
  /** 用户签名 */
  userSig: Nullable<string>;
  /** 房间成员（过滤已离开成员） */
  members: IMembersInfo[];
  /** 原始房间成员（未过滤已离开成员） */
  originMembers: IMembersInfo[];
  /** 用户自己信息 */
  selfMember: Nullable<IMembersInfo>;
  /** 拓展的用户（用于右侧自定义用户卡片拓展） */
  extraMembers: IMembersInfo[];
  /** 选中的用户 */
  selectedMember: Nullable<IMembersInfo>;
  /** 主叫人（视频通话的发起者） */
  mainMember: Nullable<IMembersInfo>;
  /** 已经完成用户是否展示（已拒绝、已超时、已挂断用户默认不在右侧面板展示） */
  finishedMemberVisible: boolean;
  /** 当前用户主叫类型 */
  userCard: Nullable<ECallerUserCard>;
  /** 拨打模式：（创建音视频时候定义的，和服务端一致） */
  callType: ECallType;
  /** 页面视频模式（页面内定义的，比如点击切换语音按钮，就从视频模式变成音频模式） */
  videoType: ECallType;
  /** 是否全屏 */
  fullScreen: boolean;
  /** 来源渠道 */
  sourceName: Nullable<string>;
  /** 面板是否展开 */
  expand: boolean;
  /** 是否静音 */
  mute: boolean;
  /** 主视频视图 */
  mainVideoView: IVideoView;
  /** 右侧用户列表视图 */
  minorVideoViews: IVideoView[];
  extend: Nullable<IExtend>;
  /** 通话时长: 毫秒 */
  time: number;
  [key: string]: any;
  /** 右侧用户信息渲染模板 */
  memberRenderTemplate: Nullable<(...args: any) => React.ReactNode | ReactNode>;
}

// 初始数据
const initialState = (): StateType => ({
  client: null,
  conversationId: null,
  callState: ECallState.FREE,
  visible: false,
  roomId: null,
  sdkAppId: null,
  userId: null,
  userSig: null,
  members: [],
  selfMember: null,
  selectedMember: null,
  mainMember: null,
  extraMembers: [],
  finishedMemberVisible: false,
  userCard: null,
  callType: ECallType.VIDEO,
  videoType: ECallType.VIDEO,
  fullScreen: false,
  sourceName: '',
  expand: false,
  mute: false,
  mainVideoView: {},
  minorVideoViews: [],
  extend: null,
  time: 0,
  originMembers: [],
  memberRenderTemplate: null,
});

const Model: BaseModel<StateType> = {
  namespace: 'videochat',
  state: initialState(),
  effects: {
    /** 获取用户im消息 */
    *getImUserInfo({ payload }, { put, call }) {
      try {
        const res = yield call(getImUserInfo, payload);
        const { accountNo, tencentUserSig } = res;
        yield put({
          type: 'setState',
          payload: {
            userId: accountNo,
            userSig: tencentUserSig,
          },
        });
        return { userId: accountNo, userSig: tencentUserSig };
      } catch (error) {
        console.warn(error);
        return null;
      }
    },
    /**
     * 音视频房间信息
     * @param {Object} payload 参数
     * @param {string} payload.roomId
     * @param {Number} payload.memberStatusCol 状态集合(10待呼叫，20呼叫中，30通话中，40已拒接，50已超时，60已挂断), 不传或者为null时查询全部
     * @param put
     * @param call
     * @param select
     */
    *getImRoomInfo({ payload }, { put, call, select }) {
      if (!payload.roomId) {
        console.warn('房间号不能为空');
        return;
      }
      const res: ImVideoConversationRoomInfoVO = yield call(
        getImVideoConversationRoomInfoVOUsingPOST,
        {
          roomId: payload.roomId,
          memberStatusCol: payload.memberStatusCol,
        },
      );
      const userId = yield select((state: any) => state.imchat.userId);
      const roomMembersInfo = (res.roomMembersInfo || []).map((item, index) => ({
        ...item,
        sortIndex: index,
      }));
      if (!res || !Array.isArray(roomMembersInfo)) {
        return;
      }
      const selfMemberInfo = find(roomMembersInfo, o => o.memberAccount === userId);
      // const filterKeys = new Set([
      //   EMemberStatus.WAIT_CALL,
      //   EMemberStatus.BE_CALLING,
      //   EMemberStatus.CALLING,
      // ]);
      const params: any = {
        // members: (roomMembersInfo || []).filter(item => filterKeys.has(item.memberStatus)),
        members: roomMembersInfo || [],
        originMembers: roomMembersInfo || [],
      };
      if (selfMemberInfo) {
        params.selfMember = selfMemberInfo;
      }
      yield put({
        type: 'setState',
        payload: params,
      });
    },
  },
  reducers: {
    setState(state, { payload }) {
      return {
        ...state,
        ...payload,
      };
    },
    clear() {
      return {
        ...initialState(),
      };
    },
    reset(state) {
      return {
        ...initialState(),
        ...pick(state, ['sdkAppId', 'userId', 'userSig', 'userCard']),
      };
    },
  },
};

export default Model;
