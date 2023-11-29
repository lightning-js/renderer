# Visual Regression Test Docker Instructions

The Visual Regression Tests utilize headless browsers provided by the
[Playwright](https://playwright.dev/) project. Browsers tend to be very platform
specific in terms of exactly how pixels end up being rendered out. The
differences should be small, but they tend to be big enough such that a simple
image comparison algorithm cannot reliably tell what is a real regression and
what is just a platform difference.

In order to prevent this issue, the Visual Regression Tests are built to run
inside a Docker container which guarantees a consistent platform environment
for the given headless browser to run in.

Whenever new commits to a PR are pushed, a GitHub Action runs the Visual
Regression Tests in a Linux-based Docker container to determine if the PR should
be allowed to merge or not.

When you need to capture new snapshots or update existing ones, you must run the
Visual Regression Test Runner locally in `--ci` mode. This launches the tests in
a Docker container giving you exactly the same snapshot results as the tests
that run in the cloud on GitHub Actions.

Below are the instructions for both installing Docker and building the Visual
Regression Test Image that is used when you run the tests in `--ci`.

## Installing Docker

### Mac

If you have a license for [Docker Desktop](https://www.docker.com/products/docker-desktop/)
you can install that and all should be well. However, if you don't follow the
alternative steps below:

1. Using [Homebrew](https://brew.sh/) install the Docker Client:

```
brew install docker
```

2. Install [Colima](https://github.com/abiosoft/colima)

```
brew install colima
```

3. Start Colima

```
colima start
```

4. Test Docker

```
docker ps
```

It should run without errors.

## Building the Test Image

After installing Docker, you must build the Visual Regression Test Image before
running the test runner in `--ci` mode.

```
pnpm build:docker
```

If all goes well it should create an image called **visual-regression** locally.

```
❯ docker images
REPOSITORY                     TAG             IMAGE ID       CREATED         SIZE
visual-regression              latest          40476ed4acae   3 minutes ago   2.09GB
```
