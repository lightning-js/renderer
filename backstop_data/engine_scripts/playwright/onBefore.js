export default async (
  page,
  scenario,
  viewport,
  isReference,
  browserContext,
) => {
  const { default: loadCookie } = await import('./loadCookies.js');
  await loadCookie(browserContext, scenario);
};
