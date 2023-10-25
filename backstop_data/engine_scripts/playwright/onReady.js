export default async (
  page,
  scenario,
  viewport,
  isReference,
  browserContext,
) => {
  console.log('SCENARIO > ' + scenario.label);

  const { default: clickAndHoverHelper } = import('./clickAndHoverHelper.js');
  await clickAndHoverHelper(page, scenario);

  // add more ready handlers here...
};
