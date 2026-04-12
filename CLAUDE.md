# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Serve

```bash
bundle exec jekyll serve              # local dev server at http://127.0.0.1:4000
bundle exec jekyll serve --drafts     # include _drafts/ posts
```

Dependencies: `bundle install` (uses the `github-pages` gem, not standalone Jekyll).

## Site Overview

Personal technical portfolio and blog (stett.github.io) built with Jekyll for GitHub Pages. Content focuses on computational geometry, physics simulations, shader programming, and generative art, with heavy use of interactive WebGL/canvas demos embedded in posts.

## Architecture

**Layouts** (`_layouts/`):
- `base.html` — Root layout. Conditionally loads heavy libraries (jQuery, Three.js, KaTeX, DramaSchool) based on post frontmatter flags. Every page gets the interactive fluid canvas background.
- `post.html` — Wraps `base`. Standard blog post with `<article>` wrapper.
- `render.html` — Standalone fullscreen canvas layout for generative art pieces (Art Blocks style). Does NOT inherit from `base`.

**Conditional library loading** — The base layout checks frontmatter booleans to avoid loading unnecessary scripts on every page:
- `jquery: true` — loads jQuery
- `threejs: true` — loads Three.js
- `math: true` — loads KaTeX for LaTeX math rendering
- `dramaschool: true` — loads custom actor/update-loop framework (`assets/js/dramaschool.js`)

Non-post pages (homepage, about) always load all libraries.

**Interactive JS** (`_includes/js/`):
Custom JavaScript for in-post demos, inlined via `{% include %}`. These are specialized physics/graphics modules (particle systems, tetrahedral mesh solvers, matrix visualizers), not reusable libraries. Each is typically paired with a specific blog post.

**Background animation** (`_includes/fluid.html`):
Interactive fluid/water surface simulation rendered to `<canvas id="canvas">` on every page using the base layout. Responds to mouse input.

## Post Conventions

- Permalink structure: `/:title` (no date in URL)
- Excerpt separator: `<!-- excerpt -->`
- Posts use `layout: post`; generative art pages use `layout: render`
- Thumbnails referenced via `thumbnail:` frontmatter field, stored in `assets/img/`
