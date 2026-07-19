import {AppRouter} from "@/components/layout/app-router";

// Render the same client SPA for unmatched paths. Under `output: 'export'` this
// makes `out/404.html` a full app shell, so deep-links work on hosts that serve
// 404.html for unknown paths (e.g. GitHub Pages) as well as those rewritten to
// index.html. It also lets `next dev` hard-loads of /data or /projects/... render
// the app. Uses AppRouter (not ProjectRouter directly) so /data resolves too.
export default function NotFound() {
    return <AppRouter/>;
}
