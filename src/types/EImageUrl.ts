/**
 * 图标地址
 */
import { ECallerUserCard } from '@/types/ECallerUserCard';

export enum EIconUrl {
  /** 挂断 */
  HANG_UP = 'https://image.nhf.cn/Fsh1b6idA7AmUQ_B8h4myHFrO2RF',
  /** 接通 */
  ACCEPT = 'https://image.nhf.cn/Fg6VbZoPhg71xfbFb4JbtXGwrcj6',
  /** 静音 */
  MUTE = 'https://image.nhf.cn/FliDBa0AA5yp3IBU0sq4iH0YySHY',
  /** 取消静音 */
  UNMUTE = 'https://image.nhf.cn/Fsah4HIjYgLOVQqx9c0cCWCHjPeM',
  /** 音频 */
  AUDIO = 'https://image.nhf.cn/FsQ0kOM4ToRvYRG1SuH9N32WckiQ',
}

/**
 * 头像
 */
export const EAvatarUrl = {
  /* 患者 */
  [ECallerUserCard.PATIENT]: 'https://image.nhf.cn/FgXUPWrCKeCy-rmbC35alyndysUj',
  /* 员工 */
  [ECallerUserCard.STAFF]: 'https://image.nhf.cn/FnuIPrSliLVGNJWyVws_Rb1Elc0R',
  /* 团队 */
  [ECallerUserCard.TEAM]: 'https://image.nhf.cn/FnuIPrSliLVGNJWyVws_Rb1Elc0R',
  /* 系统 */
  [ECallerUserCard.SYSTEM]: 'https://image.nhf.cn/FgUAiyziaWzfYFnJxl-AsvHSLjU4',
  /* 医生 */
  [ECallerUserCard.DOCTOR]: 'https://image.nhf.cn/FnuIPrSliLVGNJWyVws_Rb1Elc0R',
  /* 健康管家 */
  [ECallerUserCard.HEALTH_STEWARD]: 'https://image.nhf.cn/FnuIPrSliLVGNJWyVws_Rb1Elc0R',
  /* 私家医生 */
  [ECallerUserCard.PRIVATE_DOCTOR]: 'https://image.nhf.cn/FnuIPrSliLVGNJWyVws_Rb1Elc0R',
  /* 专家医生 */
  [ECallerUserCard.SPECIAL_DOCTOR]: 'https://image.nhf.cn/FnuIPrSliLVGNJWyVws_Rb1Elc0R',
};
