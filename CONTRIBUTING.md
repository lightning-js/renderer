# Contributing

Thank you for your interest in contributing to Lightning 3 Renderer! This project is managed by [RDK Management](https://rdkmanagement.github.io/) and welcomes contributions from the community.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** for your changes
4. **Follow the guidelines** below
5. **Submit a pull request**

## Before You Begin

Before RDK accepts your code into the project, you must sign the **RDK Contributor License Agreement (CLA)**. This is a one-time requirement.

## Code Contribution Guidelines

### Testing Requirements

All code contributions must include appropriate test coverage:

#### Unit Tests (Vitest)

- **Requirement**: Every new feature or bug fix must include unit tests using [Vitest](https://vitest.dev/)
- **Coverage**: Aim for meaningful test coverage of your changes (we monitor coverage trends)
- **Location**: Tests are co-located with source code using `.test.ts` extension
- **Running**: Execute tests locally before submitting: `pnpm test`
- **Examples**:

  ```bash
  # Run all tests
  pnpm test

  # Run tests in watch mode during development
  pnpm test -- --watch
  ```

#### Visual Regression Tests (VRT)

- **When Required**: For any changes affecting visual rendering or behavioral changes to existing components
- **Criteria**:

  - Changes to shader code
  - Modifications to rendering pipeline
  - Adjustments to layout or positioning logic
  - Updates to text rendering or font handling
  - Changes to animation behavior
  - Any graphical output modifications

- **How to Add**:

  1. Create a test case in `examples/tests/` if one doesn't exist
  2. Define snapshots using `@snapshot` annotation
  3. Run: `pnpm test:visual`
  4. Include snapshot images in your PR if adding new visual tests
  5. See [Visual Regression README](./visual-regression/README.md) for detailed instructions

- **Snapshot Updates**:
  - When intentionally changing visual output, update snapshots
  - Include justification in PR description
  - Maintainers review all snapshot changes carefully

### Code Quality

- **No console warnings**: Your code should not produce console warnings or errors
- **TypeScript**: Use strict TypeScript; no `any` types without good reason
- **Formatting**: Follow existing code style; the project uses ESLint
- **Documentation**: Add comments for complex logic
- **Browser Compatibility**: Remember this targets Chrome v38+; avoid modern-only APIs

### Commit Messages

- Use clear, descriptive commit messages
- Reference issues when applicable: `Fixes #123`
- Keep commits focused on a single feature or bug fix

## Pull Request Process

1. **Update Documentation**: If adding features, update README or relevant docs
2. **Run Tests**: Ensure all tests pass locally
   ```bash
   pnpm test
   pnpm test:visual
   ```
3. **Create Your PR** with a clear title and description
4. **PR Description Should Include**:

   - What changes were made and why
   - Links to related issues
   - For VRT changes: brief explanation of visual modifications
   - Any breaking changes (if applicable)
   - BREAKING CHANGE in commit message if needed

5. **Automated Checks**:

   - CI runs unit tests automatically
   - Visual regression tests run on all PRs
   - GitHub Actions validates your submission
   - Copilot performs code review

6. **Code Review**:
   - Address feedback from maintainers
   - Re-run tests if making changes
   - All conversations should be resolved before merging

## Development Setup

For detailed setup instructions, build commands, and development workflows, see [Getting Started](./docs/GETTING-STARTED.md).

## Questions or Need Help?

- **Issues**: [GitHub Issues](https://github.com/lightning-js/renderer/issues)
- **Discord**: [Lightning 3 Discord Community](https://discord.com/invite/Mpj4HjHyh8)
- **RDK Community**: [RDK Management](https://rdkcentral.com)

## License

By contributing to this project, you agree that your contributions will be licensed under the Apache License 2.0, consistent with the project's license.
