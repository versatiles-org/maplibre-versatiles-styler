# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-09-20

### Features

- enhance release workflow with cross-browser E2E testing and improved Playwright report handling

### Bug Fixes

- update demo files to use correct paths for assets and ensure compatibility with GitHub Pages
- update release workflow to improve E2E testing setup and permissions
- update dependencies for @versatiles/style and vite-plugin-dts to latest versions
- update @versatiles/release-tool to version 2.16.0

### Chores

- Add bundle composition section to README and generate SVG treemap

## [2.0.0] - 2026-09-19

### Breaking Changes

- port styler core to @versatiles/style v6

### Features

- v6 parity for the style list, colors and labels; update e2e tests
- font section as a per-group and per-topic tree
- layer visibility, label spacing and tilt, terrain and hillshade details
- map options and the full satellite overlay
- update sun configuration to include color and intensity in state management
- implement dynamic container background color based on selected style
- apply style changes with MapLibre's style diff
- implement theme selection table with light and dark variants
- add gamma and contrast sliders with logarithmic support and step adjustments
- implement editable value input for sliders with keyboard support
- implement config change detection and update reset button visibility in style panels
- enhance font selection and preview functionality
- enhance font picker with language filtering and clipboard support
- label style editor for the v6 text options
- filter the font picker by writing system
- bulk script selection and closest fonts in the font picker
- "Scripts in view" in the font picker
- remove labelLanguage function and related tests from font tree
- color row with hex field and transparency preview
- color picker with live map updates
- RGB, HSL and hex tabs in the color picker
- enhance popover behavior with resize observer and improve color picker scrolling
- add layout tests for sidebar and popups to check content overflow and visibility
- reorganize sidebar sections and enhance styling for better usability
- enhance input components and introduce InputSegmented
- implement theme swatch functionality and update config change tracking
- enhance export functionality and improve UI for style management
- enhance Playwright configuration to include Firefox and WebKit for layout and stability tests
- add tests for color rendering and interaction in the color picker component
- enhance color track styling and structure in ColorPicker component
- add 'Tile server' section to the sidebar and update overlay tests
- reorder 'Color adjustments' section in VectorStylePanel and update tests for sidebar titles
- update sidebar panel behavior and hash management for improved state handling
- add aria attributes for accessibility to the style editor toggle button
- export and import dialogs, close #19
- enhance dialog components with tab strip and toolbar support
- remove link export option and related functionality from export dialog
- enhance import functionality with diagnostics and provenance tracking
- add satellite theme support in style selection and styling
- update overlay color adjustments for improved legibility and consistency
- update to MapLibre GL JS 6, adjust imports and configurations for compatibility
- **inspector:** add feature inspection capabilities to the map
- refactor import dialog and inspector integration for improved usability
- add import and export buttons with icons to the toolbar for enhanced functionality
- **inspector:** enhance feature property listing and sorting in the inspector
- **e2e:** enhance layout tests with unrouteAll to handle mid-request failures chore(playwright): adjust worker count and reporter settings for CI optimization
- add documentation generation for dependency graph
- enable WebGL support in Firefox configuration for CI environment
- enhance E2E testing by adding cross-browser support for Firefox and WebKit
- add functions to ensure UI elements have settled before interaction in color picker and layout tests
- improve popover handling by ensuring visibility before interaction in color and font pickers

### Bug Fixes

- standardize percentage formatting and improve color picker styles
- adjust layout properties for better responsiveness and add maxHeight option to popover
- update testMatch patterns for Firefox and WebKit to include paint tests
- no style diff against a style that is still loading
- adjust inline code styling to prevent indentation issues
- improve CI workflow by adding dependency on test job and set max failures for Playwright
- update ESLint ignore patterns to align with .gitignore and improve linting accuracy

### Performance Improvements

- instant paint changes and no style validation while editing

### Code Refactoring

- nest the control styles by element
- group src/lib by topic

### Documentation

- update README for v2 (themes, options, server requirements, URL hash, upgrade notes)

### Tests

- add stability tests to ensure panel layout remains unchanged on setting changes

### Build System

- **deps:** bump fast-uri in the security group across 1 directory
- **deps:** link @versatiles/style v6 from local checkout

### Chores

- update devDependencies to latest versions
- update dependencies in package.json
- remove husky configuration and dependencies
- update @versatiles/style dependency to version 6.0.0
- update @versatiles/release-tool to version 2.15.0

### Styles

- fix logo CSS by nesting img styles
- put the pane's rows on one inset

### Other Changes

- Refactor color model and picker to support multiple color spaces

## [1.4.0] - 2026-08-22

### Features

- implement landcover detection and related tests

### Bug Fixes

- update funding information to reflect new organization details
- improve getMapStyle function to handle style loading more reliably

### Build System

- **deps:** bump actions/setup-node from 6 to 7 in the action group

### Chores

- add security update groups for GitHub Actions and npm in dependabot configuration
- update devDependencies to latest versions

## [1.3.2] - 2026-07-08

### Bug Fixes

- implement landcover fix and integrate into style processing ... as a temporary solution!

### Build System

- **deps-dev:** bump the npm group with 12 updates
- **deps:** bump the action group with 2 updates
- **deps-dev:** bump the npm group with 16 updates

### Chores

- update devDependencies to latest versions

## [1.3.1] - 2026-05-24

### Features

- add @microsoft/api-extractor as a dev dependency and update vite config for bundle types

## [1.3.0] - 2026-05-24

### Features

- add ScaleOptions component for text and icon scaling
- add textScale and iconScale options to SatelliteOptions component
- add ElevationOptions component and support for terrain and hillshade in satellite options
- refactor input components to use InputRow for consistent layout and behavior
- add unit support to InputNumber and update related components for consistent display
- implement new input components and refactor existing options for improved styling and functionality
- add RasterOptions and OverlayOptions components for enhanced satellite styling
- enhance SidebarSection with descriptions for better context and usability
- add disabled state to input components for improved usability
- add reset functionality to SidebarSection and enhance styling for improved usability
- enhance styling and layout of maplibregl components for improved usability
- add test for Rotate Hue functionality and verify canvas repainting

### Bug Fixes

- ensure default recolor options are applied in VectorStylePanel and Styler
- update maplibre-gl version to 5.24.0 in index.html
- ensure full style reload in renderStyle function to prevent rendering issues

### Code Refactoring

- streamline binding syntax for options in ElevationOptions and SatelliteOptions components
- update summary text selectors for consistency and clarity in tests
- simplify StylerWindow type and enhance Rotate Hue test for clarity

### Build System

- **deps-dev:** bump the npm group with 13 updates
- **deps:** bump actions/upload-pages-artifact in the action group

### Chores

- update devDependencies to latest versions

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

