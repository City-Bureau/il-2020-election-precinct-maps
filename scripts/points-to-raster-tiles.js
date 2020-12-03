import fs from "fs"
import path from "path"
import sharp from "sharp"

import asyncPool from "tiny-async-pool"
import KDBush from "kdbush"
import SphericalMercator from "@mapbox/sphericalmercator"

import { createCanvas } from "canvas"

const SCALE = 5

const SIZE = 512

const SCALED_SIZE = SIZE * SCALE

const MIN_ZOOM = 6
const MAX_ZOOM = 12
const IL_BBOX = [-91.5131, 36.9701, -87.0199, 42.5082]

const zoomSize = (zoom) => {
  switch (zoom) {
    case 6:
      return 0.02
    case 7:
      return 0.05
    case 8:
      return 0.07
    case 9:
      return 0.12
    case 10:
      return 0.19
    case 11:
      return 0.3
  }
  return 0.5
}

const zoomAlpha = (zoom) => {
  if (zoom <= 8) {
    return 125
  }
  if (zoom <= 9) {
    return 150
  }
  if (zoom <= 10) {
    return 200
  }
  if (zoom <= 11) {
    return 225
  }
  return 255
}

const voteColor = (vote) => {
  if (vote === "il-constitution-yes") {
    return "94,60,153"
  }
  if (vote === "il-constitution-no") {
    return "230,97,1"
  }
  if (["us-president-dem", "us-senate-dem"].includes(vote)) {
    return "5,113,176"
  }
  if (["us-president-rep", "us-senate-rep"].includes(vote)) {
    return "202,0,32"
  }
  if (["us-president-otr", "us-senate-otr"].includes(vote)) {
    return "77,175,74"
  }
  if (vote === "us-senate-wil") {
    return "230,171,2"
  }
  if (vote === "ballots") {
    return "77,175,74"
  }
}

async function run() {
  const merc = new SphericalMercator({ size: SCALED_SIZE })

  const [csvFile, outputDir] = process.argv.slice(-2)

  const csvData = fs.readFileSync(csvFile, "utf8")

  const points = csvData
    .split("\n")
    .slice(1)
    .map((line) => line.split(","))
    .map(([lon, lat, vote]) => ({ lon: +lon, lat: +lat, vote }))
    .sort(({ lon: a }, { lon: b }) => a - b)

  const index = new KDBush(
    points,
    ({ lon }) => lon,
    ({ lat }) => lat,
    16
  )

  let tileCoords = []
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const { minX, maxX, minY, maxY } = merc.xyz(IL_BBOX, z)
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        tileCoords.push({ z, x, y })
      }
    }
  }

  await asyncPool(6, tileCoords, ({ z, x, y }) => {
    const [tileMinX, tileMinY, tileMaxX, tileMaxY] = merc.bbox(x, y, z)
    const tilePointIdxArr = index.range(tileMinX, tileMinY, tileMaxX, tileMaxY)
    if (tilePointIdxArr.length === 0) {
      console.log(`skipping: ${z}/${x}/${y}`)
      return new Promise((res) => res())
    }
    const [tileMinXPx, tileMinYPx] = merc.px([tileMinX, tileMinY], z)
    const canvasBuff = renderTile(
      z,
      tileMinXPx,
      tileMinYPx,
      points,
      merc,
      tilePointIdxArr
    )
    console.log(`creating: ${z}/${x}/${y}`)
    return writeTile(outputDir, z, x, y, canvasBuff)
  })
}

function writeTile(outputDir, z, x, y, data) {
  const dir = path.join(outputDir, `${z}`, `${x}`)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return Promise.all(
    ["png", "webp"].map((ext) =>
      sharp(data)
        .resize(SIZE)
        .toFormat(sharp.format[ext])
        .toFile(path.join(dir, `${y}.${ext}`))
    )
  )
}

function renderTile(z, tileMinXPx, tileMinYPx, points, merc, idxArr) {
  const canvas = createCanvas(SCALED_SIZE, SCALED_SIZE)
  const ctx = canvas.getContext("2d")

  const pointSize = zoomSize(z) * SCALE
  const pointAlpha = zoomAlpha(z)

  idxArr.forEach((index) => {
    const { lon, lat, vote } = points[index]
    const [pointX, pointY] = merc.px([lon, lat], z)
    const pointXPx = pointX - tileMinXPx
    const pointYPx = SCALED_SIZE - Math.abs(pointY - tileMinYPx)
    ctx.beginPath()
    ctx.arc(pointXPx, pointYPx, pointSize, 0, 2 * Math.PI)
    ctx.fillStyle = `rgba(${voteColor(vote)},${pointAlpha})`
    ctx.fill()
  })

  return canvas.toBuffer()
}

run()
