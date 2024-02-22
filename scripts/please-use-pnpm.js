if (
  process.cwd() === process.env.INIT_CWD &&
  !process.env.npm_execpath.includes('pnpm')
) {
  console.log('\x1b[31m');
  console.log('=============================================\n');
  console.log('     Please use PNPM as a package manager');
  console.log('     See: https://pnpm.io/ for more info');
  console.log('\n=============================================');
  console.log('\x1b[0m');

  process.exit(1);
}
