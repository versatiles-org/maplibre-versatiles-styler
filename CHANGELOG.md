# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

