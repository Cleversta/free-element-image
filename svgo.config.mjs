const config = {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          cleanupIds: false,
          removeDesc: false,
          removeMetadata: false,
        },
      },
    },
  ],
};

export default config;
