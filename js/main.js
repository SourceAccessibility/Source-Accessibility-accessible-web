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

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  document.querySelectorAll(".nav-services").forEach((servicesItem) => {
    if (!servicesItem.contains(event.target)) {
      const toggle = servicesItem.querySelector(".nav-services-toggle");
      const menu = servicesItem.querySelector(".services-menu");

      if (toggle && menu) {
        toggle.setAttribute("aria-expanded", "false");
        menu.hidden = true;
      }
    }
  });
});

const focusServiceHeading = () => {
  const serviceCard = document.getElementById(window.location.hash.slice(1));

  if (!serviceCard || !serviceCard.matches(".services-page .service-card[id]")) {
    return;
  }

  const heading = serviceCard.querySelector("h3[tabindex='-1']");
  heading?.focus({ preventScroll: true });
};

focusServiceHeading();
window.addEventListener("hashchange", focusServiceHeading);
