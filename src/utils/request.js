/**
 * request 网络请求工具
 * 更详细的 api 文档: https://github.com/umijs/umi-request
 */
import Request, { extend } from 'umi-request';
import { throttle } from 'lodash-es';
import { GmNotification } from '@wjj/gm-antd';
import { getStorage, setStorage } from '@/utils/index';

const controller = new AbortController(); // 创建一个控制器
const { signal } = controller; // 返回一个 AbortSignal 对象实例，它可以用来 with/abort 一个 DOM 请求。
signal.addEventListener('abort', () => {
  console.log('aborted!');
});

const codeMessage = {
  200: '服务器成功返回请求的数据。',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）。',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  401: '用户没有权限（令牌、用户名、密码错误）。',
  403: '用户得到授权，但是访问是被禁止的。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器。',
  502: '网关错误。',
  503: '服务不可用，服务器暂时过载或维护。',
  504: '网关超时。',
};

// 弹出错误消息
const showErrorMsg = throttle(msg => {
  GmNotification.error(msg);
}, 3000);

/**
 * 异常处理程序
 */
const errorHandler = error => {
  console.warn('request error:', error);
  const { response, request, data, name } = error;
  const { options } = request || {};
  const {
    // 是否弹出系统错误信息
    toastSystemError = true,
  } = options || {};

  // 接口报错有code返回，网络报错无code
  const { code, msg, message } = data ?? {};

  if (response && response.status && toastSystemError) {
    // 错误中带了默认的message，优先报message的错误
    // 通过返回code与否判断java是否已处理,（存在code 500场景未处理）
    if (code && !!(msg || message)) {
      showErrorMsg(code === '500' ? '服务器发生错误，请检查服务器。' : msg || message);
    } else {
      const errorText = codeMessage[response.status] || response.statusText;
      showErrorMsg(errorText);
    }
    // showErrorMsg(errorText);
  } else if (!response && name !== 'AbortError' && toastSystemError) {
    showErrorMsg('网络异常');
  }
  return response || {};
};

/**
 * @desc 全局拦截器
 */

// request拦截器, 改变url 或 options.
Request.interceptors.request.use((url, options) => {
  const token = getStorage('token');
  const optionsTemp = { ...options, signal };

  if (token) {
    optionsTemp.headers = {
      ...optionsTemp.headers,
      token,
    };
  }

  optionsTemp.headers.version = VERSION;

  return {
    url,
    options: optionsTemp,
  };
});

// response拦截器, 处理response
Request.interceptors.response.use(response => {
  // 从响应头获取token
  const token = response.headers.get('token');
  // 缓存token
  if (token && window.g_app) {
    /* eslint-disable-next-line */
    window.g_app._store.dispatch({
      type: 'user/setState',
      payload: { token },
    });
    setStorage('token', token);
  }
  return response;
});

const logout = data => {
  showErrorMsg(data.message || data.msg);
  /* eslint-disable-next-line */
  window.g_app._store.dispatch({
    type: 'login/logout',
  });
  // 中止所有请求
  controller.abort();
};

// 请求返回状态
const API_STATE = {
  SUCCESS: 'SUCCESS', // 请求成功
  LOGOUT: 'LOGOUT', // token异常
  ERR: 'ERR', // 请求异常
};

// 当前请求返回状态判断
const currentApiState = code => {
  if (code === '1000') return API_STATE.SUCCESS;
  if (['2001', '2002', '6004', '6011'].includes(code)) return API_STATE.LOGOUT;
  return API_STATE.ERR;
};

// 提前对响应做异常处理
const PRE_CODE_HANDLE = {
  [API_STATE.SUCCESS]: data => data,
  [API_STATE.LOGOUT]: data => {
    logout(data);
  },
  [API_STATE.ERR]: data => {
    const addErrTip = sessionStorage.getItem('addErrTip');
    showErrorMsg(addErrTip ? (data.message || data.msg) + addErrTip : data.message || data.msg);
  },
};

Request.interceptors.response.use(async (response, options) => {
  if (options.responseType === 'arrayBuffer') {
    return response;
  }
  const data = await response.clone().json();
  const {
    // 是否显示系统错误消息
    showTips = true,
  } = options;
  // 展示错误消息
  if (showTips && data.code) {
    const apiState = currentApiState(data.code);
    PRE_CODE_HANDLE[apiState](data);
  }
  return response;
});

/**
 * 配置request请求时的默认参数
 */
const request = extend({
  timeout: 20000, // 20s超时
  errorHandler,
  // 默认错误处理
  credentials: 'include', // 默认请求是否带上cookie
});

const RequestHandle = (url, options) =>
  new Promise((resolve, reject) => {
    request(url, options)
      .then(res => {
        // console.log('res*****', res)
        const { code } = res || {};
        const {
          // 默认处理请求: code为1000的数据resolve,不为1000的reject
          defaultHandle = true,
        } = options;
        if (!defaultHandle) {
          resolve(res);
          return;
        }
        if (code !== '1000') {
          reject(res);
          return;
        }
        resolve((res || {}).data);
      })
      .catch(e => {
        reject(e);
      });
  });

export default RequestHandle;
