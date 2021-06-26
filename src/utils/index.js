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

export function aop() {
  // AOP 前置通知函数声明
  /**
   * 给方法加入前置切片函数
   * 可以在执行方法之前执行一些操作,
   * 前置切片的返回值为false时，不影响原方法的执行
   * @param func {Function} 被前置执行的函数
   * @return {Function} 加入前置通知的函数
   */
  Function.prototype._before = function (func) {
    let __self = this;
    return function () {
      func.apply(__self, arguments);
      return __self.apply(__self, arguments);
    };
  };

  // AOP 后置通知函数声明
  /**
   * 给方法加入后置切片函数
   * 可以在执行方法之之后执行一些操作
   * 后置切片的返回值为false时，不影响原方法的执行
   * @param func {Function} 被后置执行的函数
   * @return {Function} 加入后置通知的函数
   * @constructor
   */
  Function.prototype._after = function (func) {
    let __self = this;
    return function () {
      let ret = __self.apply(__self, arguments);
      func.apply(__self, arguments);
      return ret;
    };
  };

  // AOP 环绕通知函数声明
  /**
   * 切入点对象
   * 不允许切入对象多次调用
   * @param obj   对象
   * @param args  参数
   * @constructor
   */
  function JoinPoint(obj, args) {
    let isapply = false; // 判断是否执行过目标函数
    let result = null; // 保存目标函数的执行结果

    this.source = obj; // 目标函数对象
    this.args = args; // 目标函数对象传入的参数

    /**
     * 目标函数的代理执行函数
     * 如果被调用过，不能重复调用
     * @return {object} 目标函数的返回结果
     */
    this.invoke = function (thiz) {
      if (isapply) {
        return;
      }
      isapply = true;
      result = this.source.apply(thiz || this.source, this.args);
      return result;
    };

    // 获取目标函数执行结果
    this.getResult = function () {
      return result;
    };
  }

  /**
   * 方法环绕通知
   * 原方法的执行需在环绕通知方法中执行
   * @param func {Function} 环绕通知的函数
   *     程序会往func中传入一个JoinPoint(切入点)对象, 在适当的时机
   *     执行JoinPoint对象的invoke函数，调用目标函数
   *
   * @return {Function} 切入环绕通知后的函数，
   */
  Function.prototype._around = function (func) {
    let __self = this;
    return function () {
      let args = [new JoinPoint(__self, arguments)];
      return func.apply(this, args);
    };
  };
}
