import {
  ResolvedProps,
  GmRtcClientPluginContext,
  GmRtcClientPluginFunc,
  PluginEvent,
} from '../types';

export const usePluginContainer = (props: ResolvedProps, context: GmRtcClientPluginContext) => {
  const { plugins: rawPlugins } = props;

  const plugins = rawPlugins.map(item => item?.(props, context)).filter(Boolean);

  const container: GmRtcClientPluginFunc = {} as GmRtcClientPluginFunc;
  Object.keys(PluginEvent).forEach(item => {
    const name = PluginEvent[item];
    function pluginFn(...args) {
      for (const plugin of plugins) {
        if (plugin?.[name]) {
          plugin[name]?.(...args);
        }
      }
    }
    container[name] = pluginFn;
  });
  return container;
};

export { useRegisterPlugin } from './register';
