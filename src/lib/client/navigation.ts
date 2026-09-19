export function navigateTab(href: string) {
  if (window.location.pathname + window.location.search !== href)
    window.history.pushState(null, "", href);
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
