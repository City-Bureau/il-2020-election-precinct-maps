require("dotenv").config()

const Image = require("@11ty/eleventy-img")

module.exports = function (eleventyConfig) {
  const markdownIt = require("markdown-it")
  const markdownItLinkAttributes = require("markdown-it-link-attributes")

  // Set target="_blank" and rel="noopener noreferrer" on external links
  const markdownLib = markdownIt({
    html: true,
  }).use(markdownItLinkAttributes, {
    pattern: /^https?:/,
    attrs: {
      target: "_blank",
      rel: "noopener noreferrer",
    },
  })
  eleventyConfig.setLibrary("md", markdownLib)

  // This allows Eleventy to watch for file changes during local development.
  eleventyConfig.setUseGitIgnore(false)

  eleventyConfig.addNunjucksAsyncShortcode(
    "resizeImage",
    async function (src, sizes, outputFormat = "png") {
      const stats = await Image(src, {
        widths: [+sizes.split("x")[0]],
        formats: [outputFormat],
        outputDir: "./site/img",
      })

      const props = stats[outputFormat].slice(-1)[0]
      return props.url
    }
  )

  eleventyConfig.addFilter("markdown", (value) => markdownLib.render(value))

  // Create a collection of items without permalinks so that we can reference them
  // in a separate shortcode to pull in partial content directly
  eleventyConfig.addCollection("partials", (collectionApi) =>
    collectionApi.getAll().filter(({ data: { permalink } }) => !permalink)
  )

  eleventyConfig.addPassthroughCopy({
    "src/img": "img",
    "site/img": "img",
  })

  return {
    dir: {
      input: "site/",
      output: "dist",
      includes: "_includes",
      layouts: "_layouts",
    },
    templateFormats: ["html", "md", "njk", "11ty.js"],
    htmlTemplateEngine: "njk",
    passthroughFileCopy: true,
  }
}
