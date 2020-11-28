const production = process.env.NODE_ENV === "production"

const host = production
  ? "https://projects.citybureau.org"
  : "http://localhost:8080"

const baseurl = production ? "/il-2020-election-maps-stg" : ""

const precinctTiles = production
  ? `${host}${baseurl}/tiles/{z}/{x}/{y}.pbf`
  : "http://localhost:3000/il.mbtiles/{z}/{x}/{y}.pbf"

const ilConstitutionPointTiles = production
  ? `${host}${baseurl}/tiles/il-constitution/{z}/{x}/{y}.webp`
  : "http://localhost:8000/raster/il-constitution/{z}/{x}/{y}.webp"

const usPresidentPointTiles = production
  ? `${host}${baseurl}/tiles/us-president/{z}/{x}/{y}.webp`
  : "http://localhost:8000/raster/us-president/{z}/{x}/{y}.webp"

module.exports = {
  name: "Illinois 2020 Election Maps",
  title: "Illinois 2020 Election Maps",
  type: "website",
  baseurl,
  url: `${host}${baseurl}`,
  description:
    "Precinct-level election results for the 2020 Illinois general election",
  production,
  googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
  locale: "en-us",
  openmaptilesKey: process.env.OPENMAPTILES_KEY,
  precinctTiles,
  ilConstitutionPointTiles,
  usPresidentPointTiles,
  nav: [{ url: "/about/", label: "About" }],
}
