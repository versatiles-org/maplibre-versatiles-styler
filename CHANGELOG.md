# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-04-05

### Features

- integrate svelte-check for improved type checking in development

### Code Refactoring

- improve hash configuration handling and enhance utility functions
- enhance type safety for color options in ColorOptions component
- simplify getMinimalOptions function by removing unnecessary type assertions
- update return type of getMinimalOptions to improve type safety

### Tests

- add unit tests for HashManager and enhance removeRecursively tests

### Chores

- update @versatiles/style to version 5.10.2 in package.json and package-lock.json

## [1.2.0] - 2026-04-04

### Features

- add elevation option to satellite style configuration
- enhance HashManager to support configuration in URL hash
- refactor style rendering to update URL hash on changes

### Bug Fixes

- simplify binding for font selection inputs in FontOptions component
- handle undefined value in InputSelect component
- update selector waiting logic in options.spec.ts for base style

### Code Refactoring

- streamline base style setting and hash configuration handling

### Build System

- **deps-dev:** bump the npm group with 16 updates
- **deps:** bump the action group with 2 updates

### Chores

- update dependencies in package.json
- update dependencies in package.json

## [1.1.5] - 2026-03-01

### Bug Fixes

- update release and upgrade scripts for consistency
- update check script to include type checking
- update devDependencies to include @eslint/js and remove unused packages
- refactor Svelte mock implementation and update type for title variable
- update npm audit command to omit dev dependencies

### Build System

- **deps:** bump actions/upload-artifact in the action group

### Chores

- update devDependencies to latest versions

### Other Changes

- Merge branch 'main' into dependabot/github_actions/action-674967a53d
- Merge pull request #10 from versatiles-org/dependabot/github_actions/action-674967a53d

## [1.1.4] - 2026-02-15

### Bug Fixes

- update dependencies in package.json
- add *.code-workspace to .prettierignore
- update README.md with additional badges for NPM version, downloads, and GitHub workflow status
- update README.md to correct badge placements and improve visibility
- update pre-push hook and package.json scripts for improved testing workflow
- update CI workflow to use consistent script naming for test coverage and E2E tests
- update CI workflow to run unit tests instead of all tests

### Code Refactoring

- move downloadStyle and copyStyleCode functions to export
- move style configuration to style_config
- update copyStyleCode to import style dynamically and handle await for satellite styles

### Tests

- update clipboard copy tests to include import statements and await for satellite style

## [1.1.3] - 2026-02-11

### Bug Fixes

- add sourcesLoaded state and update overlay logic in Styler component

## [1.1.2] - 2026-02-10

### Bug Fixes

- update dependencies to latest versions
- refactor eslint configuration
- update default state for hasOsm and hasSatellite to false
- refactor renderStyle and getStyle functions to use async/await
- remove test for auto-switching to first available style when current becomes unavailable
- update README

## [1.1.1] - 2026-02-09

### Bug Fixes

- update @versatiles/style dependency version to ^5.9.1

## [1.1.0] - 2026-02-09

### Features

- improve tile source fetching logic
- add fetchTileSources tests for source retrieval and error handling
- add comprehensive tests for tile source discovery and style selection
- enhance satellite style selection with visual indicators

### Bug Fixes

- add CHANGELOG.md to .prettierignore
- update tar command to compress all needed files for release
- remove default open state from Satellite options sidebar
- update sidebar section title from "Select Options" to "Other options"

## [1.0.0] - 2026-02-07

### Features

- refactor and migrate Styler to Svelte components
- add end-to-end testing setup with Playwright and update CI configuration
- implement helper functions for retrieving map styles and update E2E tests to validate style changes, close #7
- add screenshot capture functionality and Playwright configuration for visual testing
- implement SidebarSection component
- replace individual color modification inputs with RecolorOptions component
- replace individual color inputs with ColorOptions component
- add FontOptions and LanguageOptions components to enhance font and language selection
- add SatelliteOptions component for enhanced satellite style configuration, close #6
- implement hash management for style and map view synchronization
- add coverage configuration for test environment in vite config

### Bug Fixes

- add hide-scrollbar class to pane
- update @versatiles/style dependency version to 5.8.4
- add explicit IDs to form elements for accessibility
- replace random input IDs with consistent UID from props for accessibility
- use untrack for reactive state initialization in Styler component
- initialize colors in currentOptions with defaults from selected style
- enhance color input styling for better appearance and usability
- update Node.js version and streamline build process for demo
- update Node.js version, enhance package exports, and adjust Svelte compiler options
- reorder entries in .prettierignore
- add @types/node dependency to package.json and package-lock.json
- add deviceScaleFactor to Firefox and Webkit configurations in Playwright setup
- adjust sidebar screenshot test to remove scroll constraints and resize viewport
- update svelte config to use recommended settings
- simplify language binding in LanguageOptions component
- refactor hash management initialization to use untrack for better reactivity
- improve precision calculation for latitude and longitude in hash generation, close #8

### Code Refactoring

- update style handling to use specific vector styles and improve type definitions

### Tests

- add end-to-end tests for color editing, export functionality, options selection, style selection, and styler component
- add unit tests for ensureStylesInjected function
- add unit tests for fetchJSON and fetchTileJSON functions
- add unit tests for HashManager functionality

### Build System

- **deps-dev:** bump the npm group with 9 updates

### Chores

- update dependencies to latest versions
- update dependencies in package.json

### Other Changes

- Merge pull request #5 from versatiles-org/dependabot/npm_and_yarn/npm-bbc15c476f

