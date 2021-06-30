import moment from 'moment';

// 1: 获取
export const getStorage = key => {
  const value = window.sessionStorage.getItem(key);
  return value ? JSON.parse(value) : null;
};

// 2: 存储
export const setStorage = (key, value) => {
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

// 3: 清除
export const removeStorage = key => {
  window.sessionStorage.removeItem(key);
};

// 4: 清除所有
export const clearAllStorage = () => {
  window.sessionStorage.clear();
};

/**
 * 全屏
 */
export function onFullScreen() {
  if (document.documentElement.RequestFullScreen) {
    document.documentElement.RequestFullScreen();
  }
  // 兼容火狐
  if (document.documentElement.mozRequestFullScreen) {
    document.documentElement.mozRequestFullScreen();
  }
  // 兼容谷歌等可以webkitRequestFullScreen也可以webkitRequestFullscreen
  if (document.documentElement.webkitRequestFullScreen) {
    document.documentElement.webkitRequestFullScreen();
  }
  // 兼容IE,只能写msRequestFullscreen
  if (document.documentElement.msRequestFullscreen) {
    document.documentElement.msRequestFullscreen();
  }
}

/**
 * 退出全屏
 */
export function onExitFullScreen() {
  if (document.exitFullScreen) {
    document.exitFullscreen();
  }
  // 兼容火狐
  if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  }
  // 兼容谷歌等
  if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
  // 兼容IE
  if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

/**
 * 格式化时间数据
 * 6 -> 00:06
 * @param milliseconds 毫秒
 */
export function formatDuration(milliseconds) {
  const duration = moment.duration(milliseconds);
  const second = duration.seconds();
  const minute = duration.minutes();
  const hour = duration.hours();
  return `${hour > 9 ? hour : `0${hour}`}:${minute > 10 ? minute : `0${minute}`}:${
    second > 9 ? second : `0${second}`
  }`;
}

/**
 * 延时
 */
export function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
