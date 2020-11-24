import express from "express"
import MBTiles from "@mapbox/mbtiles"
import { promisify } from "util"

async function loadTileConfig(tileFiles) {
  return await Promise.all(
    tileFiles.map(async (file) => {
      const tiles = await new (promisify(MBTiles))(file)
      return { ...(await promisify(tiles.getInfo.bind(tiles))()), tiles }
    })
  ).then((tiles) =>
    tiles.reduce((acc, curr) => ({ ...acc, [curr.basename]: curr }), {})
  )
}

async function serve() {
  const tileFiles = process.argv.slice(2)
  const config = await loadTileConfig(tileFiles)

  const app = express()

  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")
    next()
  })

  app.get("/:source/:z/:x/:y.pbf", (req, res) => {
    const { z, x, y, source } = req.params
    const tiles = config[source].tiles
    tiles.getTile(z, x, y, (err, tile, headers) => {
      if (err) {
        res.end()
      } else {
        res.writeHead(200, headers)
        res.end(tile)
      }
    })
  })

  console.log("listening for vector tile requests...")
  app.listen(3000)
}

serve()
