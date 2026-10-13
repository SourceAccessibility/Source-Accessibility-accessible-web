# Source Accessibility website

## Build the static site locally

Requirements: Node.js and npm.

From the project root, run:

```sh
npm run build
```

The build expands the shared header, contact section and footer into the HTML
pages in `dist/`. Source pages and shared partials remain unchanged. The
generated site does not need JavaScript to provide shared navigation or contact
information.

To test the generated site using a simple local HTTP server:

```sh
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000/` in a browser. The `dist/` directory is the
complete generated static-site output and is the directory that should
eventually be published. This project does not configure or perform deployment.
