# Spec Delta

## ADDED Requirements

### Requirement: Packaging Output Hygiene
The local distribution packaging workflow SHALL remove stale build output from the packaging output directory before generating new packages, so every local build produces only artifacts from the current source state.

#### Scenario: Stale artifacts removed before packaging
- **WHEN** a local distribution packaging build is executed and the output directory contains artifacts from previous builds or retired product versions
- **THEN** all previously generated packages, manifests, blockmaps, and checksum files are removed before new packages are generated

#### Scenario: Cleanup is a safe no-op without existing output
- **WHEN** a local distribution packaging build is executed with no existing output directory (for example, a fresh clone or clean CI checkout)
- **THEN** packaging proceeds normally and no cleanup error is raised

#### Scenario: Cleanup failure blocks packaging
- **WHEN** stale output cannot be removed (for example, an installer is locked by another process)
- **THEN** the packaging build fails with a clear error before any new package is generated, rather than producing output mixed with stale artifacts
