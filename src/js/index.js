import { searchParamsToForm, formToObj, formObjToSearchParams } from "./utils"
import { setupGeocoder } from "./geocoder"

function updateSearchParams() {
  const form = document.getElementById("legend-form")
  formObjToSearchParams(formToObj(form))
}

const isMobile = () => window.innerWidth <= 600

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

function popupContent(
  race,
  {
    properties: {
      precinct,
      authority,
      registered,
      ballots,
      [`us-president-dem`]: presidentDem,
      [`us-president-rep`]: presidentRep,
      [`us-president-votes`]: presidentVotes,
      [`il-constitution-yes`]: taxYes,
      [`il-constitution-no`]: taxNo,
      [`il-constitution-votes`]: taxVotes,
      [`us-senate-dem`]: senateDem,
      [`us-senate-rep`]: senateRep,
      [`us-senate-wil`]: senateWil,
      [`us-senate-votes`]: senateVotes,
    },
  }
) {
  let resultsLabel = ``
  let votesValue = 0
  let results = []

  // Based on d3.descending
  const sortByValue = ({ value: a }, { value: b }) =>
    b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN

  if (race.includes("us-president")) {
    resultsLabel = "US President"
    votesValue = presidentVotes
    results = [
      { label: "Biden", cls: "dem", value: presidentDem / presidentVotes },
      { label: "Trump", cls: "rep", value: presidentRep / presidentVotes },
      {
        label: "Other",
        cls: "otr",
        value: (presidentVotes - presidentDem - presidentRep) / presidentVotes,
      },
    ]
  } else if (race.includes("il-constitution")) {
    resultsLabel = "Tax Amendment"
    votesValue = taxVotes
    results = [
      { label: "Yes", cls: "yes", value: taxYes / taxVotes },
      { label: "No", cls: "no", value: taxNo / taxVotes },
    ]
  } else if (race.includes("us-senate")) {
    resultsLabel = "US Senate"
    votesValue = senateVotes
    results = [
      { label: "Durbin", cls: "dem", value: senateDem / senateVotes },
      { label: "Curran", cls: "rep", value: senateRep / senateVotes },
      { label: "Wilson", cls: "wil", value: senateWil / senateVotes },
      {
        label: "Other",
        cls: "otr",
        value: (senateVotes - senateDem - senateRep - senateWil) / senateVotes,
      },
    ]
  }
  const resultsContent =
    results.length > 0
      ? `<p class="bold">${resultsLabel}</p>
      ${results
        .sort(sortByValue)
        .map(
          ({ label, cls, value }) => `
  <div class="tooltip-row">
    <span class="label">
      <span class="${cls} point"></span>
      <span>${label}</span>
    </span>
    <span class="value">
      ${value.toLocaleString(`en-us`, { style: `percent` })}
    </span>
  </div>`
        )
        .join(``)}`
      : ``

  return `
  <h2>${authority.replace(/-/gi, " ").toUpperCase()}</h2>
  <h3>${precinct}</h2>
  ${resultsContent}
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
        votesValue > 0
          ? `<div class="tooltip-row">
        <span class="bold label">Blank</span>
        <span class="value">
          ${Math.max(1 - votesValue / ballots, 0).toLocaleString(`en-us`, {
            style: `percent`,
          })}
        </span>
      </div>`
          : ``
      }
  `
}

function onMapLoad(map) {
  let mapData = { hoverId: null, clickId: null }

  const eventLayer = "precincts"
  // Could query data attributes for this?
  const layers = [
    "precincts-us-president",
    "precincts-il-constitution",
    // "precincts-us-senate",
    "precincts-ballots",
    "points-us-president",
    "points-il-constitution",
    // "points-us-senate",
    "points-ballots",
  ]

  // Fallback to PNG raster layers if webP not supported
  checkWebPSupport().then((webPSupported) => {
    // Ignore if webP loads successfully
    if (webPSupported) return

    // If webP is not supported, fallback to PNG layers
    const rasterSources = [
      "points-us-president",
      "points-il-constitution",
      // "points-us-senate",
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
      if (!isMobile()) {
        hoverPopup
          .setLngLat(e.lngLat)
          .setHTML(popupContent(getMapRace(), features[0]))
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
        .setHTML(popupContent(getMapRace(), features[0]))
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

  map.resize()

  setupGeocoder(({ type, lat, lon }) => {
    const zoom = type === "Point Address" ? 12 : 11
    map.flyTo({
      center: [lon, lat],
      zoom,
      padding: { bottom: isMobile() ? 400 : 0 },
    })
    map.resize()

    if (type === "Point Address") {
      map.once("moveend", () => {
        const features = map.queryRenderedFeatures(map.project([lon, lat]), {
          layers: [eventLayer],
        })
        handleFeaturesHover([])
        handleFeaturesClick(clickPopup.isOpen() ? [] : features)
        if (features.length > 0) {
          map.getCanvas().style.cursor = "pointer"
          removePopup(hoverPopup)
          clickPopup
            .setLngLat([lon, lat])
            .setHTML(popupContent(getMapRace(), features[0]))
            .addTo(map)
        }
      })
    }
  })
}

function setupMap() {
  const mapContainer = document.getElementById("map")

  const mapParams = isMobile()
    ? { center: [-89.3, 39.52], zoom: 5.6 }
    : { center: [-89.3, 40], zoom: 6.1 }

  const map = new window.mapboxgl.Map({
    container: mapContainer,
    minZoom: 5.6,
    maxZoom: 12,
    hash: true,
    dragRotate: false,
    style: `style.json`,
    ...mapParams,
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
