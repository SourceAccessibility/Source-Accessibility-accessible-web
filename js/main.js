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
