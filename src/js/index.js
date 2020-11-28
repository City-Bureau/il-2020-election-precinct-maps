function setupNavToggle() {
  const navToggle = document.getElementById("nav-toggle")
  if (!navToggle) return

  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded")
    navToggle.setAttribute("aria-expanded", !(expanded === "true"))
  })
}

function searchParamsToForm(form) {
  const searchParams = new URLSearchParams(window.location.search)

  for (let [key, value] of searchParams.entries()) {
    const input = form.elements[key]
    if (input.type === "checkbox") {
      input.checked = !!value
    } else {
      input.value = value
    }
  }
}

function formToObj(form) {
  const formObj = {}
  const formNames = [
    ...new Set(
      Object.values(form.elements)
        .map(
          (input) =>
            (input instanceof NodeList || input instanceof HTMLCollection
              ? input[0]
              : input
            ).name
        )
        .filter((name) => !!name)
    ),
  ]
  const formData = new FormData(form)

  formNames.map((name) => {
    let value = formData.get(name)
    if (form.elements[name].type === "checkbox") {
      value = !!value
    }
    formObj[name] = value
  })
  return formObj
}

function formObjToSearchParams(formObj) {
  const params = new URLSearchParams({
    ...Object.fromEntries(Object.entries(formObj).filter((entry) => entry[1])),
  })
  window.history.replaceState(
    {},
    window.document.title,
    `${window.location.protocol}//${window.location.host}${
      window.location.pathname
    }${params.toString() === `` ? `` : `?${params}`}`
  )
}

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
function checkWebPSupport(map) {
  const webP = new Image()
  webP.src =
    "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA"
  webP.onload = webP.onerror = () => {
    // Ignore if webP loads successfully
    if (webP.height === 2) return

    // If webP is not supported, fallback to PNG layers
    const rasterSources = ["points-il-constitution", "points-us-president"]
    rasterSources.forEach((source) => {
      const layers = map.getStyle().layers
      const layerIdx = layers.findIndex(({ id }) => id === source)
      const layer = layers[layerIdx]
      const before = layers[layerIdx + 1].id
      layer.source = `${source}-png`
      map.removeLayer(source)
      map.addLayer(layer, before)
    })
  }
}

function onMapLoad(map) {
  checkWebPSupport(map)

  let mapData = { hoverId: null, clickId: null }

  const eventLayer = "precincts"
  const layers = [
    "precincts-il-constitution",
    "precincts-us-president",
    "precincts-diff",
    "precincts-turnout",
    "points-il-constitution",
    "points-us-president",
  ]

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
    <h2 class="font-size-1 margin-bottom-1">${authority.toUpperCase()}</h2>
    <h3 class="font-size-1 margin-bottom-2">${precinct}</h2>
    ${
      taxVotes >= 0
        ? `<p class="bold">
      Fair Tax
    </p>
    <div class="flex-row-center">
      <span class="flex-1">Yes</span>
      <span class="flex-1">
        ${(taxYes / taxVotes).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>
    <div class="flex-row-center">
      <span class="flex-1">No</span>
      <span class="flex-1">
        ${(taxNo / taxVotes).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>
    <div class="flex-row-center">
      <span class="flex-1">Votes</span>
      <span class="flex-1">
        ${(taxVotes / ballots).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>
    <hr>`
        : ``
    }
    <p class="bold">
      US President
    </p>
    <div class="flex-row-center">
      <span class="flex-1">Biden</span>
      <span class="flex-1">
        ${(presidentDem / presidentVotes).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>
    <div class="flex-row-center">
      <span class="flex-1">Trump</span>
      <span class="flex-1">
        ${(presidentRep / presidentVotes).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>
    <div class="flex-row-center">
      <span class="flex-1">Other</span>
      <span class="flex-1">
        ${(
          (presidentVotes - presidentDem - presidentRep) /
          presidentVotes
        ).toLocaleString(`en-us`, {
          style: `percent`,
        })}
      </span>
    </div>
    <hr>
    <div class="flex-row-center">
      <span class="bold flex-1">Ballots</span>
      <span class="flex-1">
        ${ballots.toLocaleString(`en-us`)}
      </span>
    </div>
    <div class="flex-row-center">
      <span class="bold flex-1">Turnout</span>
      <span class="flex-1">
        ${(ballots / registered).toLocaleString(`en-us`, { style: `percent` })}
      </span>
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
    handleFeaturesClick(features)
    if (features.length > 0) {
      map.getCanvas().style.cursor = "pointer"
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
    })
    layers
      .filter((layer) => !activeLayers.includes(layer))
      .forEach((layer) => {
        map.setLayoutProperty(layer, "visibility", "none")
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
    style: `/style.json`,
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

// Setup mobile navigation menu
document.addEventListener("DOMContentLoaded", () => {
  setupNavToggle()

  const form = document.getElementById("legend-form")
  searchParamsToForm(form)

  setupMap()
})
