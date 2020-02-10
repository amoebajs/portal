const path = require("path");
const TsImportPlugin = require("ts-import-plugin");
// const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = {
  entry: ["./server/src/core/index.websdk.ts"],
  output: {
    path: path.resolve(__dirname, "websdk"),
    filename: "index.js",
  },
  mode: "production",
  resolve: {
    extensions: [".ts", ".js", ".json"],
    alias: {
      "@amoebajs/builder$": "@amoebajs/builder/es/index.websdk",
      "@amoebajs/builder": "@amoebajs/builder/es",
    },
  },
  optimization: {
    minimize: true,
  },
  externals: ["fs", "module", "console", "child_process", "prettier"],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: require.resolve("ts-loader"),
            options: {
              transpileOnly: true,
              configFile: "tsconfig.websdk.json",
              getCustomTransformers: () => ({
                before: [
                  TsImportPlugin({
                    style: false,
                    libraryName: "lodash",
                    libraryDirectory: null,
                    camel2DashComponentName: false,
                  }),
                ],
              }),
              compilerOptions: {
                module: "es2015",
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    // new BundleAnalyzerPlugin()
  ],
};
