import {describe, expect, it} from "vitest";
import {TreeNode} from "@/components/basics/files/tree-utils";
import {
    crumbsForSegments,
    findNodeByMacroPath,
    macroPathForId,
    parseRoute,
    resolveNodeFromPath,
    routeForNodeId,
    routeForSegments,
} from "./core-model";
import {computeSiblingMacroNames, slugify} from "./macro-name";

function n(id: string, name: string, type: string, children: TreeNode[] | null = null): TreeNode {
    return {id, name, type, children};
}

// spaces
//   Finance (folder)
//     Q4 Revenue (relation)
//     Q4 Revenue (relation)   <- duplicate name -> q4-revenue-2
//     Board Deck (dashboard)
//   Marketing (folder, empty)
const tree: TreeNode[] = [
    n("f-fin", "Finance", "folder", [
        n("r-1", "Q4 Revenue", "relations"),
        n("r-2", "Q4 Revenue", "relations"),
        n("d-1", "Board Deck", "dashboards"),
    ]),
    n("f-mkt", "Marketing", "folder", []),
];

describe("slugify", () => {
    it("lowercases and dashes", () => {
        expect(slugify("Q4 Revenue")).toBe("q4-revenue");
        expect(slugify("  Hello, World! ")).toBe("hello-world");
        expect(slugify("Ünïcode Náme")).toBe("unicode-name");
    });
    it("falls back for empty slugs", () => {
        expect(slugify("")).toBe("untitled");
        expect(slugify("!!!")).toBe("untitled");
    });
});

describe("computeSiblingMacroNames", () => {
    it("suffixes collisions deterministically", () => {
        const m = computeSiblingMacroNames(tree[0].children!);
        expect(m.get("r-1")).toBe("q4-revenue");
        expect(m.get("r-2")).toBe("q4-revenue-2");
        expect(m.get("d-1")).toBe("board-deck");
    });
});

describe("parseRoute", () => {
    it("maps root and /workspace to spaces-root", () => {
        expect(parseRoute("/")).toEqual({view: "spaces-root", params: {segments: []}});
        expect(parseRoute("/workspace")).toEqual({view: "spaces-root", params: {segments: []}});
    });
    it("returns raw segments for deeper paths", () => {
        expect(parseRoute("/workspace/finance/q4-revenue")).toEqual({
            view: "spaces",
            params: {segments: ["finance", "q4-revenue"]},
        });
    });
    it("decodes segments and strips query/hash", () => {
        expect(parseRoute("/workspace/a%2Fb?x=1#y").params.segments).toEqual(["a/b"]);
    });
    it("flags unknown roots as notfound", () => {
        expect(parseRoute("/bogus").view).toBe("notfound");
    });
});

describe("routeForNodeId <-> findNodeByMacroPath are inverses", () => {
    for (const id of ["f-fin", "r-1", "r-2", "d-1", "f-mkt"]) {
        it(`round-trips ${id}`, () => {
            const route = routeForNodeId(tree, id)!;
            expect(route).toBeDefined();
            const {params} = parseRoute(route);
            const node = findNodeByMacroPath(tree, params.segments);
            expect(node?.id).toBe(id);
        });
    }

    it("builds the expected human-readable route", () => {
        expect(routeForNodeId(tree, "r-1")).toBe("/workspace/finance/q4-revenue");
        expect(routeForNodeId(tree, "r-2")).toBe("/workspace/finance/q4-revenue-2");
    });

    it("returns undefined for unknown ids", () => {
        expect(routeForNodeId(tree, "nope")).toBeUndefined();
        expect(macroPathForId(tree, "nope")).toBeUndefined();
    });

    it("returns undefined for unresolvable segments", () => {
        expect(findNodeByMacroPath(tree, ["finance", "nope"])).toBeUndefined();
    });
});

describe("resolveNodeFromPath & crumbs", () => {
    it("resolves a leaf node from a pathname", () => {
        expect(resolveNodeFromPath(tree, "/workspace/finance/board-deck")?.id).toBe("d-1");
    });
    it("builds breadcrumbs with cumulative links", () => {
        const crumbs = crumbsForSegments(tree, ["finance", "q4-revenue-2"]);
        expect(crumbs.map((c) => c.label)).toEqual(["Finance", "Q4 Revenue"]);
        expect(crumbs.map((c) => c.to)).toEqual([
            "/workspace/finance",
            "/workspace/finance/q4-revenue-2",
        ]);
    });
    it("routeForSegments handles the empty root", () => {
        expect(routeForSegments([])).toBe("/workspace");
    });
});
