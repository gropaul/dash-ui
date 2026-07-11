import {AppRouter} from "@/components/layout/app-router";

// Single static shell. Under `output: 'export'` this emits one index.html.
// All routing is client-side (History API); deep-load/refresh of /workspace/... or
// /data is served this same shell via the host's index.html fallback (vercel.json
// rewrite or the C++ extension file-server fallback), then dispatched by AppRouter.
export default function Page() {
    return <AppRouter/>;
}
