const babel = require('@babel/core');
const babelTransformer = require(process.env.CAMPUS_EXPO_BABEL_TRANSFORMER);

const privateFieldPlugins = [
  [require.resolve('@babel/plugin-transform-class-properties'), { loose: true }],
  [require.resolve('@babel/plugin-transform-private-methods'), { loose: true }],
  [require.resolve('@babel/plugin-transform-private-property-in-object'), { loose: true }],
];

module.exports.transform = function (props) {
  let src = props.src;

  if (typeof src === 'string' && src.includes('import.meta')) {
    src = src.replace(/import\.meta/g, '({ env: { MODE: "development", DEV: true, PROD: false } })');
  }

  // The checked-in Windows Hermes compiler cannot parse native private fields.
  // Lower only sources that contain private identifiers, then let Expo's normal
  // transformer handle Flow/TypeScript, JSX, Reanimated and source maps.
  if (typeof src === 'string' && /(?:^|\n)\s*(?:(?:public|private|protected|readonly|static|declare|abstract)\s+)*#[A-Za-z_$][\w$]*\s*(?:[;:=(]|=)/.test(src)) {
    const isTypeScript = /\.[cm]?tsx?$/.test(props.filename);
    const syntaxPlugins = isTypeScript
      ? [[require.resolve('@babel/plugin-transform-typescript'), {
          isTSX: /\.tsx$/.test(props.filename),
          allowDeclareFields: true,
        }]]
      : [
          require.resolve('babel-plugin-syntax-hermes-parser'),
          require.resolve('@babel/plugin-transform-flow-strip-types'),
        ];
    const transformed = babel.transformSync(src, {
      babelrc: false,
      configFile: false,
      filename: props.filename,
      parserOpts: isTypeScript ? undefined : { plugins: ['flow', 'jsx'] },
      plugins: [...syntaxPlugins, ...privateFieldPlugins],
      sourceMaps: false,
      ast: false,
      code: true,
    });
    src = transformed?.code ?? src;
  }

  return babelTransformer.transform({ ...props, src });
};
