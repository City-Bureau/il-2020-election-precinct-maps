export function searchParamsToForm(form) {
  const searchParams = new URLSearchParams(window.location.search)

  for (let [key, value] of searchParams.entries()) {
    if (!(key in form.elements)) return
    const input = form.elements[key]
    if (input.type === "checkbox") {
      input.checked = !!value
    } else {
      input.value = value
    }
  }
}

export function formToObj(form) {
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

export function formObjToSearchParams(formObj) {
  const params = new URLSearchParams({
    ...Object.fromEntries(new URLSearchParams(window.location.search)),
    ...Object.fromEntries(Object.entries(formObj).filter((entry) => entry[1])),
  })
  window.history.replaceState(
    {},
    window.document.title,
    `${window.location.protocol}//${window.location.host}${
      window.location.pathname
    }${params.toString() === `` ? `` : `?${params}`}${window.location.hash}`
  )
}
