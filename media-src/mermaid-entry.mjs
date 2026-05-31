import mermaid from 'mermaid';

// Bundled to media/mermaid.bundle.js (IIFE) and loaded as a classic script
// before webview.js, which expects a global `mermaid`. startOnLoad is off so we
// render on demand via mermaid.render() from updateCodeBlock.
mermaid.initialize({ startOnLoad: false });
window.mermaid = mermaid;
