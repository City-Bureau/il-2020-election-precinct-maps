module.exports = {
  plugins: [
    require("postcss-import"),
    require("autoprefixer"),
    // TODO: For some reason build not working with cssnano
    // ...(process.env.NODE_ENV === "production" ? [require("cssnano")] : []),
  ],
}
