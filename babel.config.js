module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // 🚨 Esta línea puede ser necesaria si el preset de expo falla en el web
    // plugins: [
    //   ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
    // ]
  };
};