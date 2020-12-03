exports.data = {
  layout: null,
  permalink: "/style.json",
}

exports.render = ({ site }) =>
  JSON.stringify({
    version: 8,
    id: "votes",
    sources: {
      openmaptiles: {
        type: "vector",
        url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${site.openmaptilesKey}`,
      },
      precincts: {
        type: "vector",
        tiles: [site.precinctTiles],
        minzoom: 5,
        maxzoom: 11,
        attribution:
          '<a href="https://github.com/pjsier/il-2020-election-precinct-data">IL State Board of Elections, local authorities</a> | <a href="https://doi.org/10.7910/DVN/NH5S2I/IJPOUH">Voting and Election Science Team, Harvard Dataverse</a>',
      },
      "points-il-constitution": {
        type: "raster",
        tiles: [site.ilConstitutionPointTiles],
        minzoom: 6,
        maxzoom: 12,
        tileSize: 256, // Allows for higher resolutions at lower zooms
      },
      "points-us-president": {
        type: "raster",
        tiles: [site.usPresidentPointTiles],
        minzoom: 6,
        maxzoom: 12,
        tileSize: 256, // Allows for higher resolutions at lower zooms
      },
      "points-us-senate": {
        type: "raster",
        tiles: [site.usSenatePointTiles],
        minzoom: 6,
        maxzoom: 12,
        tileSize: 256,
      },
      "points-ballots": {
        type: "raster",
        tiles: [site.ballotPointTiles],
        minzoom: 6,
        maxzoom: 12,
        tileSize: 256,
      },
      "points-il-constitution-png": {
        type: "raster",
        tiles: [site.ilConstitutionPointTiles.replace(".webp", ".png")],
        minzoom: 6,
        maxzoom: 12,
        tileSize: 256,
      },
      "points-us-president-png": {
        type: "raster",
        tiles: [site.usPresidentPointTiles.replace(".webp", ".png")],
        minzoom: 6,
        maxzoom: 12,
        tileSize: 256,
      },
      "points-us-senate-png": {
        type: "raster",
        tiles: [site.usSenatePointTiles.replace(".webp", ".png")],
        minzoom: 6,
        maxzoom: 12,
        tileSize: 256,
      },
      "points-ballots-png": {
        type: "raster",
        tiles: [site.ballotPointTiles.replace(".webp", ".png")],
        minzoom: 6,
        maxzoom: 12,
        tileSize: 256,
      },
    },
    sprite: "https://openmaptiles.github.io/maptiler-toner-gl-style/sprite",
    glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${site.openmaptilesKey}`,
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#fff" },
      },
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        filter: [
          "all",
          ["!=", "brunnel", "tunnel"],
          ["==", "$type", "Polygon"],
          ["!=", "intermittent", 1],
        ],
        layout: { visibility: "visible" },
        paint: {
          "fill-antialias": true,
          "fill-color": "#e1e4e5",
        },
      },
      {
        id: "highway_motorway_subtle",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        minzoom: 12,
        filter: [
          "all",
          ["==", "$type", "LineString"],
          ["in", "class", "primary", "secondary", "trunk"],
        ],
        layout: {
          "line-cap": "round",
          "line-join": "round",
          visibility: "visible",
        },
        paint: {
          "line-color": "hsla(0, 0%, 85%, 1)",
          "line-width": 1.5,
        },
      },
      {
        id: "highway_motorway_casing",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        minzoom: 8,
        filter: [
          "all",
          ["==", "$type", "LineString"],
          [
            "all",
            ["!in", "brunnel", "bridge", "tunnel"],
            ["==", "class", "motorway"],
          ],
        ],
        layout: {
          "line-cap": "butt",
          "line-join": "miter",
          visibility: "visible",
        },
        paint: {
          "line-color": "rgb(213, 213, 213)",
          "line-dasharray": [2, 0],
          "line-opacity": 1,
          "line-width": {
            base: 1.4,
            stops: [
              [5.8, 0],
              [6, 3],
              [20, 40],
            ],
          },
        },
      },
      {
        id: "highway_motorway_inner",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        minzoom: 8,
        filter: [
          "all",
          ["==", "$type", "LineString"],
          [
            "all",
            ["!in", "brunnel", "bridge", "tunnel"],
            ["==", "class", "motorway"],
          ],
        ],
        layout: {
          "line-cap": "round",
          "line-join": "round",
          visibility: "visible",
        },
        paint: {
          "line-color": {
            base: 1,
            stops: [
              [5.8, "hsla(0, 0%, 85%, 0.53)"],
              [6, "#fff"],
            ],
          },
          "line-width": {
            base: 1.4,
            stops: [
              [4, 2],
              [6, 1.3],
              [20, 30],
            ],
          },
        },
      },
      {
        id: "boundary_state",
        type: "line",
        source: "openmaptiles",
        "source-layer": "boundary",
        minzoom: 3,
        maxzoom: 14,
        filter: ["all", ["==", "admin_level", 4]],
        layout: {
          "line-cap": "round",
          "line-join": "round",
          visibility: "visible",
        },
        paint: {
          "line-color": "#e1e4e5",
          "line-dasharray": [1, 2],
          "line-opacity": 1,
          "line-width": {
            base: 1.3,
            stops: [
              [5, 1],
              [6, 1.2],
              [7, 1.6],
              [14, 5],
            ],
          },
        },
      },
      {
        id: "points-il-constitution",
        source: "points-il-constitution",
        type: "raster",
        layout: {
          visibility: "none",
        },
      },
      {
        id: "points-us-president",
        source: "points-us-president",
        type: "raster",
        layout: {
          visibility: "visible",
        },
      },
      {
        id: "points-us-senate",
        source: "points-us-senate",
        type: "raster",
        layout: {
          visibility: "visible",
        },
      },
      {
        id: "points-ballots",
        source: "points-ballots",
        type: "raster",
        layout: {
          visibility: "visible",
        },
      },
      {
        id: "precincts",
        source: "precincts",
        "source-layer": "precincts",
        type: "fill",
        layout: {
          visibility: "visible",
        },
        paint: {
          "fill-opacity": 1,
          "fill-color": "rgba(0,0,0,0)",
          "fill-outline-color": [
            "case",
            [
              "any",
              ["boolean", ["feature-state", "hover"], false],
              ["boolean", ["feature-state", "click"], false],
            ],
            "rgba(0,0,0,0.7)",
            "rgba(150,150,150,0)",
          ],
        },
      },
      {
        id: "precincts-il-constitution",
        source: "precincts",
        "source-layer": "precincts",
        type: "fill",
        filter: [">=", ["get", "il-constitution-votes"], 0],
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-outline-color": [
            "case",
            [
              "any",
              ["boolean", ["feature-state", "hover"], false],
              ["boolean", ["feature-state", "click"], false],
            ],
            "rgba(0,0,0,0.7)",
            "rgba(150,150,150,0)",
          ],
          "fill-opacity": 0.8,
          "fill-color": [
            "case",
            [
              ">",
              ["get", "il-constitution-yes"],
              ["get", "il-constitution-no"],
            ],
            [
              "interpolate",
              ["linear"],
              [
                "/",
                ["get", "il-constitution-yes"],
                ["get", "il-constitution-votes"],
              ],
              0.45,
              "#f7f7f7",
              0.725,
              "#b2abd2",
              1.0,
              "#5e3c99",
            ],
            [
              "interpolate",
              ["linear"],
              [
                "/",
                ["get", "il-constitution-no"],
                ["get", "il-constitution-votes"],
              ],
              0.45,
              "#f7f7f7",
              0.725,
              "#fdb863",
              1,
              "#e66101",
            ],
          ],
        },
      },
      {
        id: "precincts-us-president",
        source: "precincts",
        "source-layer": "precincts",
        type: "fill",
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-outline-color": [
            "case",
            [
              "any",
              ["boolean", ["feature-state", "hover"], false],
              ["boolean", ["feature-state", "click"], false],
            ],
            "rgba(0,0,0,0.7)",
            "rgba(150,150,150,0)",
          ],
          "fill-opacity": 0.8,
          "fill-color": [
            "case",
            [">", ["get", "us-president-dem"], ["get", "us-president-rep"]],
            [
              "interpolate",
              ["linear"],
              ["/", ["get", "us-president-dem"], ["get", "us-president-votes"]],
              0.45,
              "#f7f7f7",
              0.725,
              "#92c5de",
              1,
              "#0571b0",
            ],
            [
              "interpolate",
              ["linear"],
              ["/", ["get", "us-president-rep"], ["get", "us-president-votes"]],
              0.45,
              "#f7f7f7",
              0.725,
              "#f4a582",
              1,
              "#ca0020",
            ],
          ],
        },
      },
      // TODO: Find if Wilson or Malouf won any precincts
      {
        id: "precincts-us-senate",
        source: "precincts",
        "source-layer": "precincts",
        type: "fill",
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-outline-color": [
            "case",
            [
              "any",
              ["boolean", ["feature-state", "hover"], false],
              ["boolean", ["feature-state", "click"], false],
            ],
            "rgba(0,0,0,0.7)",
            "rgba(150,150,150,0)",
          ],
          "fill-opacity": 0.8,
          "fill-color": [
            "case",
            [">", ["get", "us-senate-dem"], ["get", "us-senate-rep"]],
            [
              "interpolate",
              ["linear"],
              ["/", ["get", "us-senate-dem"], ["get", "us-senate-votes"]],
              0.45,
              "#f7f7f7",
              0.725,
              "#92c5de",
              1,
              "#0571b0",
            ],
            [
              "interpolate",
              ["linear"],
              ["/", ["get", "us-senate-rep"], ["get", "us-senate-votes"]],
              0.45,
              "#f7f7f7",
              0.725,
              "#f4a582",
              1,
              "#ca0020",
            ],
          ],
        },
      },
      {
        id: "precincts-ballots",
        source: "precincts",
        "source-layer": "precincts",
        type: "fill",
        layout: {
          visibility: "none",
        },
        paint: {
          "fill-outline-color": [
            "case",
            [
              "any",
              ["boolean", ["feature-state", "hover"], false],
              ["boolean", ["feature-state", "click"], false],
            ],
            "rgba(0,0,0,0.7)",
            "rgba(150,150,150,0)",
          ],
          "fill-opacity": 0.8,
          "fill-color": [
            "interpolate",
            ["linear"],
            ["/", ["get", "ballots"], ["get", "registered"]],
            0.5,
            "#edf8e9",
            0.75,
            "#74c476",
            1,
            "#006d2c",
          ],
        },
      },
      {
        id: "place_label_city",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        minzoom: 8,
        maxzoom: 11,
        filter: ["all", ["==", "$type", "Point"], ["==", "class", "city"]],
        layout: {
          "icon-anchor": "center",
          "text-field": "{name:latin}",
          "text-font": ["Nunito Regular"],
          "text-max-width": 10,
          "text-size": {
            stops: [
              [4, 14],
              [7, 15],
              [8, 19],
              [16, 22],
            ],
          },
          visibility: "visible",
        },
        paint: {
          "icon-translate": [1, 11],
          "text-color": "rgba(0, 0, 0, 0.8)",
          "text-halo-blur": 0,
          "text-halo-color": "rgba(255, 255, 255, 1)",
          "text-halo-width": 2,
        },
      },
      {
        id: "place_label_town",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        minzoom: 11,
        maxzoom: 16,
        filter: ["all", ["==", "$type", "Point"], ["==", "class", "town"]],
        layout: {
          "icon-anchor": "center",
          "text-field": "{name:latin}",
          "text-font": ["Nunito Regular"],
          "text-max-width": 10,
          "text-size": {
            stops: [
              [8, 15],
              [16, 18],
            ],
          },
          visibility: "visible",
        },
        paint: {
          "icon-translate": [1, 11],
          "text-color": "rgba(0, 0, 0, 0.8)",
          "text-halo-blur": 0,
          "text-halo-color": "rgba(255, 255, 255, 1)",
          "text-halo-width": 2,
        },
      },
      {
        id: "place_label_village",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        minzoom: 12,
        filter: [
          "all",
          ["==", "$type", "Point"],
          ["in", "class", "village", "hamlet"],
        ],
        layout: {
          "text-anchor": "center",
          "text-field": "{name:latin} {name:nonlatin}",
          "text-font": ["Nunito Regular"],
          "text-max-width": 10,
          "text-size": {
            stops: [
              [12, 12],
              [16, 18],
            ],
          },
        },
        paint: {
          "text-color": "rgba(11, 11, 11, 1)",
          "text-halo-blur": 0,
          "text-halo-color": "hsl(0, 0%, 100%)",
          "text-halo-width": 2,
        },
      },
    ],
  })
