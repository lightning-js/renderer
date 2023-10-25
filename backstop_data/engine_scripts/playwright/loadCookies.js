import { existsSync, readFileSync } from 'fs';

export default async (browserContext, scenario) => {
  let cookies = [];
  const cookiePath = scenario.cookiePath;

  // Read Cookies from File, if exists
  if (existsSync(cookiePath)) {
    cookies = JSON.parse(readFileSync(cookiePath));
  }

  // Add cookies to browser
  browserContext.addCookies(cookies);

  console.log('Cookie state restored with:', JSON.stringify(cookies, null, 2));
};
