module.exports = {
  extends: ["next", "prettier"],
  settings: {
    react: {
      version: "detect",
    },
  },
  parserOptions: {
    babelOptions: {
      presets: [require.resolve("next/babel")],
    },
  },
};
