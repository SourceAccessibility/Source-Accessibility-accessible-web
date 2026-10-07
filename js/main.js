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

document.querySelectorAll(".service-card-toggle").forEach((button) => {
  const panel = document.getElementById(button.getAttribute("aria-controls"));
  const label = button.querySelector(".toggle-label");
  if (!panel || !label) {
    return;
  }

  const setExpanded = (expanded) => {
    button.setAttribute("aria-expanded", String(expanded));
    label.textContent = expanded ? "Show less" : "Show more";
    panel.hidden = !expanded;
  };

  button.hidden = false;
  setExpanded(false);
  button.addEventListener("click", () => {
    setExpanded(button.getAttribute("aria-expanded") !== "true");
  });
});
