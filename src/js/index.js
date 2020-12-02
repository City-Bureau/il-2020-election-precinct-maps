import { searchParamsToForm, formToObj, formObjToSearchParams } from "./utils"

function updateSearchParams() {
  const form = document.getElementById("legend-form")
  formObjToSearchParams(formToObj(form))
}

function getMapLayer() {
  return document.querySelector(`input[name="layer"]:checked`).value
}

function getMapRace() {
  return document.querySelector(`input[name="race"]:checked`).value
}

// https://stackoverflow.com/a/54120785
function checkWebPSupport() {
  return new Promise((resolve) => {
    const webP = new Image()
    webP.src =
      "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA"
    webP.onload = webP.onerror = () => resolve(webP.height === 2)
  })
}

function onMapLoad(map) {
  let mapData = { hoverId: null, clickId: null }

  const eventLayer = "precincts"
  const layers = [
    "precincts-il-constitution",
    "precincts-us-president",
    "precincts-ballots",
    "points-il-constitution",
    "points-us-president",
    "points-ballots",
  ]

  // Fallback to PNG raster layers if webP not supported
  checkWebPSupport().then((webPSupported) => {
    // Ignore if webP loads successfully
    if (webPSupported) return

    // If webP is not supported, fallback to PNG layers
    const rasterSources = [
      "points-il-constitution",
      "points-us-president",
      "points-ballots",
    ]
    rasterSources.forEach((source) => {
      const layers = map.getStyle().layers
      const layerIdx = layers.findIndex(({ id }) => id === source)
      const layer = layers[layerIdx]
      const before = layers[layerIdx + 1].id
      layer.source = `${source}-png`
      map.removeLayer(source)
      map.addLayer(layer, before)
    })
  })

  const hoverPopup = new window.mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  })
  const clickPopup = new window.mapboxgl.Popup({
    closeButton: true,
    closeOnClick: true,
  })

  const removePopup = (popup) => {
    map.getCanvas().style.cursor = ""
    popup.remove()
  }

  const popupContent = ({
    properties: {
      precinct,
      authority,
      registered,
      ballots,
      [`il-constitution-yes`]: taxYes,
      [`il-constitution-no`]: taxNo,
      [`il-constitution-votes`]: taxVotes,
      [`us-president-dem`]: presidentDem,
      [`us-president-rep`]: presidentRep,
      [`us-president-votes`]: presidentVotes,
    },
  }) => `
    <h2>${authority.replace(/-/gi, " ").toUpperCase()}</h2>
    <h3>${precinct}</h2>
    ${
      getMapRace().includes("il-constitution")
        ? `<p class="bold">
      Tax Amendment
    </p>
    <div class="tooltip-row">
      <span class="label">
        <span class="yes point"></span>
        <span>Yes</span>
      </span>
      <span class="value">
        ${(taxYes / taxVotes).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>
    <div class="tooltip-row">
      <span class="label">
        <span class="no point"></span>
        <span>No</span>
      </span>
      <span class="value">
        ${(taxNo / taxVotes).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>`
        : ``
    }
    ${
      getMapRace().includes("us-president")
        ? `<p class="bold">
      US President
    </p>
    <div class="tooltip-row">
      <span class="label">
        <span class="dem point"></span>
        <span>Biden</span>
      </span>
      <span class="value">
        ${(presidentDem / presidentVotes).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>
    <div class="tooltip-row">
      <span class="label">
        <span class="rep point"></span>
        <span>Trump</span>
      </span>
      <span class="value">
        ${(presidentRep / presidentVotes).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>
    <div class="tooltip-row">
      <span class="label">
        <span class="other point"></span>
        <span>Other</span>
      </span>
      <span class="value">
        ${(
          (presidentVotes - presidentDem - presidentRep) /
          presidentVotes
        ).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>`
        : ``
    }
    <div class="turnout-content">
      <div class="tooltip-row">
        <span class="bold label">Ballots</span>
        <span class="value">
          ${ballots.toLocaleString(`en-us`)}
        </span>
      </div>
      <div class="tooltip-row">
        <span class="bold label">Turnout</span>
        <span class="value">
          ${(ballots / registered).toLocaleString(`en-us`, {
            style: `percent`,
          })}
        </span>
      </div>
      ${
        getMapRace() !== "ballots"
          ? `<div class="tooltip-row">
        <span class="bold label">Blank</span>
        <span class="value">
          ${Math.max(
            1 -
              (getMapRace().includes("il-constitution")
                ? taxVotes
                : presidentVotes) /
                ballots,
            0
          ).toLocaleString(`en-us`, {
            style: `percent`,
          })}
        </span>
      </div>`
          : ``
      }
    </div>
  `

  const handleFeaturesHover = (features) => {
    if (mapData.hoverId) {
      map.setFeatureState(
        {
          source: "precincts",
          sourceLayer: "precincts",
          id: mapData.hoverId,
        },
        { hover: false }
      )
      mapData.hoverId = {}
    }
    if (features.length > 0) {
      map.setFeatureState(
        { source: "precincts", sourceLayer: "precincts", id: features[0].id },
        { hover: true }
      )
      mapData.hoverId = features[0].id
    }
  }

  const handleFeaturesClick = (features) => {
    if (features.length === 0) {
      map.setFeatureState(
        {
          source: "precincts",
          sourceLayer: "precincts",
          id: mapData.clickId,
        },
        { click: false }
      )
      mapData.clickId = null
    } else {
      map.setFeatureState(
        {
          source: "precincts",
          sourceLayer: "precincts",
          id: features[0].id,
        },
        { click: true }
      )
      mapData.clickId = features[0].id
    }
  }

  clickPopup.on("close", () => {
    handleFeaturesClick([])
  })

  const onMouseMove = (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [eventLayer],
    })
    handleFeaturesHover(features)
    if (features.length > 0 && !clickPopup.isOpen()) {
      map.getCanvas().style.cursor = "pointer"
      if (window.innerWidth >= 600) {
        hoverPopup
          .setLngLat(e.lngLat)
          .setHTML(popupContent(features[0]))
          .addTo(map)
      }
    } else {
      removePopup(hoverPopup)
    }
  }

  const onMouseOut = () => {
    handleFeaturesHover([])
    removePopup(hoverPopup)
  }

  const onMapClick = (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [eventLayer],
    })
    handleFeaturesHover(features)
    handleFeaturesClick(clickPopup.isOpen() ? [] : features)
    if (features.length > 0) {
      map.getCanvas().style.cursor = "pointer"
      removePopup(hoverPopup)
      clickPopup
        .setLngLat(e.lngLat)
        .setHTML(popupContent(features[0]))
        .addTo(map)
    }
  }

  map.on("mousemove", eventLayer, onMouseMove)
  map.on("mouseout", eventLayer, onMouseOut)
  map.on("click", eventLayer, onMapClick)

  const onViewChange = () => {
    const activeLayer = getMapLayer()
    const activeRace = getMapRace()
    const activeLayers = activeLayer.includes("points")
      ? [`points-${activeRace}`]
      : [`${activeLayer}-${activeRace}`]

    activeLayers.forEach((layer) => {
      map.setLayoutProperty(layer, "visibility", "visible")
      document
        .querySelector(`[data-layer="${layer}"]`)
        .classList.toggle("hidden", false)
    })
    layers
      .filter((layer) => !activeLayers.includes(layer))
      .forEach((layer) => {
        map.setLayoutProperty(layer, "visibility", "none")
        document
          .querySelector(`[data-layer="${layer}"]`)
          .classList.toggle("hidden", true)
      })

    updateSearchParams()
  }

  // Call to set initial params
  onViewChange()

  document
    .querySelectorAll(`input[name="layer"], input[name="race"]`)
    .forEach((input) => {
      input.addEventListener("change", onViewChange)
    })
}

function setupMap() {
  const mapContainer = document.getElementById("map")

  const map = new window.mapboxgl.Map({
    container: mapContainer,
    center: [-90, 39.6],
    minZoom: 5.6,
    maxZoom: 12,
    zoom: 5.6,
    hash: true,
    dragRotate: false,
    style: `style.json`,
  })

  map.touchZoomRotate.disableRotation()

  map.once("styledata", () => {
    map.addControl(
      new window.mapboxgl.NavigationControl({ showCompass: false })
    )
    map.addControl(
      new window.mapboxgl.FullscreenControl({ container: mapContainer })
    )
    onMapLoad(map)
  })
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("legend-form")
  searchParamsToForm(form)
  setupMap()
})
