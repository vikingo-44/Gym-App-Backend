const { withExpo } = require('@expo/next-adapter');
const nextConfig = {
  output: 'export', 
  images: {
    unoptimized: true,
  },
};
module.exports = withExpo(nextConfig);