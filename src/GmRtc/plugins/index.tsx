import {
  ResolvedProps,
  GmRtcClientPluginContext,
  GmRtcClientPluginFunc,
  PluginEvent,
} from '../types';

export const usePluginContainer = (props: ResolvedProps, context: GmRtcClientPluginContext) => {
  const { plugins: rawPlugins } = props;

  const plugins = rawPlugins.map(usePlugin => usePlugin?.(props, context)).filter(Boolean);

  const container: GmRtcClientPluginFunc = {} as GmRtcClientPluginFunc;
  Object.keys(PluginEvent).map(item => {
    const name = PluginEvent[item];
    function pluginFn() {
      for (const plugin of plugins) {
        if (plugin?.[name]) {
          plugin[name]?.(...arguments);
        }
      }
    }
    container[name] = pluginFn;
  });
  return container;
};

export { useRegisterPlugin } from './register';
