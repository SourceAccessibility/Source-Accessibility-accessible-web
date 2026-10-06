document.querySelectorAll(".nav-services").forEach((servicesItem) => {
  const toggle = servicesItem.querySelector(".nav-services-toggle");
  const menu = servicesItem.querySelector(".services-menu");

  if (!toggle || !menu) {
    return;
  }

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    menu.hidden = true;
  };

  toggle.addEventListener("click", () => {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isExpanded));
    menu.hidden = isExpanded;
  });

  servicesItem.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      toggle.focus();
    }
  });

  servicesItem.addEventListener("focusout", (event) => {
    if (!servicesItem.contains(event.relatedTarget)) {
      closeMenu();
    }
  });

  menu.addEventListener("click", closeMenu);
});

const ensureHeadingIds = (documentToUpdate) => {
  const ids = new Set(
    [...documentToUpdate.querySelectorAll("[id]")].map((element) => element.id)
  );

  documentToUpdate.querySelectorAll("main h1, main h2, main h3, main h4").forEach((heading) => {
    if (heading.id) {
      return;
    }

    const slug = heading.textContent
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section";
    const baseId = `search-${slug}`;
    let id = baseId;
    let suffix = 2;

    while (ids.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    heading.id = id;
    ids.add(id);
  });
};

ensureHeadingIds(document);

const focusHashTarget = () => {
  const target = document.getElementById(window.location.hash.slice(1));
  const heading = target?.matches("h1, h2, h3, h4")
    ? target
    : target?.matches(".service-card[id]")
      ? target.querySelector("h1, h2, h3, h4")
      : null;

  if (heading instanceof HTMLElement) {
    heading.tabIndex = -1;
    heading.focus();
  }
};

focusHashTarget();
window.addEventListener("hashchange", focusHashTarget);

const searchablePages = [
  { path: "index.html", name: "Home" },
  { path: "services.html", name: "Services" },
  { path: "about.html", name: "About" },
  { path: "accessibility-statement.html", name: "Accessibility Statement" },
];

let searchIndexPromise;

const loadSearchIndex = () => {
  if (!searchIndexPromise) {
    searchIndexPromise = Promise.all(searchablePages.map(async (page) => {
      const response = await fetch(page.path);

      if (!response.ok) {
        throw new Error(`Could not load ${page.path} for search (${response.status}).`);
      }

      const source = await response.text();
      const pageDocument = new DOMParser().parseFromString(source, "text/html");
      ensureHeadingIds(pageDocument);
      const main = pageDocument.querySelector("main");

      if (!main) {
        throw new Error(`Could not find main content in ${page.path}.`);
      }

      const candidates = [...main.querySelectorAll("article, section")]
        .filter((candidate) => candidate.matches("article") || !candidate.querySelector("article"));

      return candidates.flatMap((candidate) => {
        const heading = candidate.querySelector("h1, h2, h3, h4");

        if (!heading) {
          return [];
        }

        return [{
          page: page.name,
          path: page.path,
          heading: heading.textContent.trim(),
          id: heading.id,
          text: candidate.textContent.replace(/\s+/g, " ").trim(),
        }];
      });
    })).then((pages) => pages.flat()).catch((error) => {
      searchIndexPromise = undefined;
      throw error;
    });
  }

  return searchIndexPromise;
};

const findExcerpt = (text, query) => {
  const lowerText = text.toLowerCase();
  const firstTerm = query.toLowerCase().split(/\s+/).find((term) => lowerText.includes(term));

  if (!firstTerm || text.length <= 180) {
    return text.slice(0, 180);
  }

  const matchPosition = lowerText.indexOf(firstTerm);
  const start = Math.max(0, matchPosition - 65);
  const end = Math.min(text.length, start + 180);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
};

document.querySelectorAll(".header-search").forEach((searchItem) => {
  const toggle = searchItem.querySelector(".header-search-toggle");
  const panel = searchItem.querySelector(".header-search-panel");
  const form = searchItem.querySelector(".site-search-form");
  const input = searchItem.querySelector("#site-search-input");
  const status = searchItem.querySelector(".search-status");
  const results = searchItem.querySelector(".search-results");

  if (!(toggle instanceof HTMLButtonElement)
    || !(panel instanceof HTMLElement)
    || !(form instanceof HTMLFormElement)
    || !(input instanceof HTMLInputElement)
    || !(status instanceof HTMLElement)
    || !(results instanceof HTMLOListElement)) {
    return;
  }

  const closePanel = () => {
    toggle.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  };

  toggle.addEventListener("click", () => {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isExpanded));
    panel.hidden = isExpanded;

    if (!isExpanded) {
      input.focus();
    }
  });

  searchItem.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      closePanel();
      toggle.focus();
    }
  });

  results.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      closePanel();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    results.replaceChildren();
    const query = input.value.trim().toLowerCase();

    if (!query) {
      status.textContent = "Enter a search term.";
      input.focus();
      return;
    }

    status.textContent = "Searching…";

    try {
      const index = await loadSearchIndex();
      const terms = query.split(/\s+/);
      const matches = index
        .filter((entry) => {
          const searchableText = entry.text.toLowerCase();
          return terms.every((term) => searchableText.includes(term));
        })
        .map((entry) => {
          const titleText = entry.heading.toLowerCase();
          const score = terms.reduce((total, term) => (
            total + (titleText.includes(term) ? 5 : 0)
          ), 0);
          return { ...entry, score };
        })
        .sort((first, second) => second.score - first.score);

      if (matches.length === 0) {
        status.textContent = `No matches found for “${input.value.trim()}”.`;
        return;
      }

      status.textContent = `${matches.length} ${matches.length === 1 ? "match" : "matches"} found.`;

      matches.forEach((match) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        const excerpt = document.createElement("p");
        link.href = `${match.path}#${encodeURIComponent(match.id)}`;
        link.textContent = `${match.heading} — ${match.page}`;
        excerpt.textContent = findExcerpt(match.text, query);
        item.append(link, excerpt);
        results.append(item);
      });
    } catch (error) {
      console.error("Website search failed.", error);
      status.textContent = "Search is temporarily unavailable. Please try again later.";
    }
  });
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  document.querySelectorAll(".nav-services, .header-search").forEach((disclosure) => {
    if (disclosure.contains(event.target)) {
      return;
    }

    const toggle = disclosure.querySelector("button[aria-expanded]");
    const content = disclosure.querySelector(".services-menu, .header-search-panel");

    if (toggle && content) {
      toggle.setAttribute("aria-expanded", "false");
      content.hidden = true;
    }
  });
});
