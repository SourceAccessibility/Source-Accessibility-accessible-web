async function loadPartials() {
  const includeElements = document.querySelectorAll("[data-include]");

  await Promise.all([...includeElements].map(async (element) => {
    const path = element.getAttribute("data-include");
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Could not load ${path}: ${response.status} ${response.statusText}`);
    }

    element.innerHTML = await response.text();
  }));
}

loadPartials();
