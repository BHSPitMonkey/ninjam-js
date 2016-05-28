var webpack = require('webpack');
var childProcess = require('child_process');
module.exports = {
  entry: "./src/entry.jsx",
  devtool: "#source-map",
  output: {
    path: __dirname + "/build/js",
    filename: "bundle.js",
    sourceMapFilename: "[file].map"
  },
  module: {
    loaders: [{
      test: /\.jsx?$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel', // 'babel-loader' is also a legal name to reference
      query: {
        presets: ['react', 'es2015']
      }
    }, {
      test: /\.css$/,
      loader: "style!css"
    }]
  },
  plugins: [
    new webpack.NoErrorsPlugin(),
    // Tells React to use production mode
    // new webpack.DefinePlugin({
    //   'process.env':{
    //     'NODE_ENV': JSON.stringify('production')
    //   }
    // }),
    // Lets us grab the latest commit hash from git within the application
  //  new webpack.DefinePlugin({
  //    __BUILD__: JSON.stringify(childProcess.execSync('git rev-parse --short HEAD').toString().trim())
  //  })
  ]
};
