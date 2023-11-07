# Release Procedure

Publish a new release with the below instructions, you must first be a contributor
who is authorized to both push directly to this repo and publish packages to the
lightningjs NPM scope.

## Mark, push and publish the release

```
# Make sure you're on the main branch
git checkout main

# Stash any untracked + uncomitted changes
git stash -u

# Run the build once to make sure it completes without errors
pnpm run build

# Mark the version update
# This creates a new tagged commit for the version
pnpm version <release-increment> # patch/minor/major

# Publish the package to NPM
pnpm publish --access public

# Push version commit to github
git push

# Push version tag to github
git push origin vX.X.X

# Pop the stash (if one was created)
git stash pop
```

## Generate a release on GitHub

1. Go to https://github.com/lightning-js/renderer/releases/new
2. Choose a Tag: _Choose the newly pushed tag_
3. Target: _main_
4. Name the release with the same name as the tag: vX.X.X
5. Click "Generate release notes"
6. Edit the release notes as appropriate:
   - User facing changes should go under the main "What's Changed" heading
   - Mark all breaking changes with: :warning: **Breaking Change:** (Description)
   - If there are non-user facing changes move them to a new level 3 heading called: **Non-User Facing**.
7. Set as the latest release: _Check_
8. Click "Publish release"
