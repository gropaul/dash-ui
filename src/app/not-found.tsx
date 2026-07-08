import {SpacesRouter} from "@/components/layout/spaces-router";

// Render the same client SPA for unmatched paths. Under `output: 'export'` this
// makes `out/404.html` a full app shell, so deep-links work on hosts that serve
// 404.html for unknown paths (e.g. GitHub Pages) as well as those rewritten to
// index.html. It also lets `next dev` hard-loads of /spaces/... render the app.
export default function NotFound() {
    return <SpacesRouter/>;
}
