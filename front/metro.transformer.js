const svgTransformer = require('react-native-svg-transformer/expo');
const expoTransformer = require('@expo/metro-config/babel-transformer');

module.exports.transform = function transform(props) {
  const { filename, src } = props;

  if (filename.endsWith('.svg')) {
    return svgTransformer.transform(props);
  }

  if (filename.endsWith('.md')) {
    const code = `module.exports = ${JSON.stringify(src)};`;
    return expoTransformer.transform({ ...props, src: code });
  }

  return expoTransformer.transform(props);
};
