# Visual Regression Test Docker Instructions

The Visual Regression Tests utilize headless browsers provided by the [Playwright](https://playwright.dev/) project. Browsers are highly platform-specific, and even small pixel differences can cause significant issues for image comparison algorithms. These differences can prevent reliable detection of regressions.

To avoid these issues, Visual Regression Tests run inside a containerized environment. This guarantees a consistent platform for headless browsers, ensuring reproducible results.

For PRs, a GitHub Action runs these tests in a Linux-based container. Locally, you must use `--ci` mode, which launches tests in a container to produce snapshots identical to the GitHub Action environment.

This guide covers installing the required tools (`docker`, `colima`, or `podman`) and building the Visual Regression Test image.

---

## Installing a Container Runtime

### Mac

You can use Docker Desktop if you have a license. If you don’t, use Colima or Podman as alternatives.

#### Option 1: Docker Desktop (Requires License)

1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. After installation, test Docker:
   ```bash
   docker ps
   ```

#### Option 2: Colima (Open Source Docker Alternative)

1. Install the Docker CLI using [Homebrew](https://brew.sh/):
   ```bash
   brew install docker
   ```
2. Install [Colima](https://colima.dev/):
   ```bash
   brew install colima
   ```
3. Start Colima:
   ```bash
   colima start
   ```
4. Test Docker with Colima:
   ```bash
   docker ps
   ```
   It should run without errors.

#### Option 3: Podman (Docker Alternative)

1. Install [Podman](https://podman.io/):
   ```bash
   brew install podman
   ```
2. Start Podman:
   ```bash
   podman machine init
   podman machine start
   ```
3. Test Podman:
   ```bash
   podman ps
   ```

### Linux

Docker is natively supported on Linux, but you can also use Podman for a rootless container environment.

#### Option 1: Docker

1. Follow the instructions for your Linux distribution to install Docker:
   - [Ubuntu/Debian](https://docs.docker.com/engine/install/debian/)
   - [Fedora/CentOS](https://docs.docker.com/engine/install/centos/)
2. After installation, test Docker:
   ```bash
   docker ps
   ```

#### Option 2: Podman

1. Install [Podman](https://podman.io/) for your Linux distribution:
   - [Podman Installation Guide](https://podman.io/getting-started/installation)
2. Test Podman:
   ```bash
   podman ps
   ```

### Windows

Windows users can use Docker Desktop if they have a license or install Podman as an alternative.

#### Option 1: Docker Desktop (Requires License)

1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. After installation, test Docker:
   ```powershell
   docker ps
   ```

#### Option 2: Podman (Open Source Alternative)

1. Install [Podman](https://podman.io/) via the Windows installer:
   - [Podman for Windows](https://podman.io/getting-started/installation)
2. Start the Podman machine:
   ```powershell
   podman machine init
   podman machine start
   ```
3. Test Podman:
   ```powershell
   podman ps
   ```

---

## Building the Test Image

After installing a container runtime, you must build the Visual Regression Test image.

1. Run the build script:

   ```bash
   pnpm build:docker
   ```

2. The script automatically detects your runtime (`docker` or `podman`) and builds the image. After a successful build, you should see the image:

   ```bash
   docker images
   ```

   Or, if using Podman:

   ```bash
   podman images
   ```

   Example output:

   ```
   REPOSITORY                     TAG             IMAGE ID       CREATED         SIZE
   visual-regression              latest          40476ed4acae   3 minutes ago   2.09GB
   ```

---

## References

- **Docker Desktop**: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Colima**: [colima.dev](https://colima.dev/)
- **Podman**: [podman.io](https://podman.io/)
