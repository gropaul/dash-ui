import {describe, expect, it} from 'vitest';
import {
    blockNames,
    renameRefsInMarkdown,
    appendToMarkdown,
    countRelationReferences,
    referencedRelationIds,
    relationReferenceFence,
    removeRelationReferences,
} from "@/model/dashboard-state";

const PAGE = `# Overview

${relationReferenceFence('rel-a')}

<columngroup>
  <column span="6">
    \`\`\`sql
    -- relation: rel-b
    -- rows: 4
    \`\`\`
  </column>
  <column span="6">
    ${relationReferenceFence('rel-a').split('\n').join('\n    ')}
  </column>
</columngroup>

\`\`\`sql
-- chart: bar
SELECT 1
\`\`\`
`;

describe('dashboard markdown references', () => {
    it('finds the referenced relations, also inside columns', () => {
        expect(referencedRelationIds(PAGE)).toEqual(['rel-a', 'rel-b']);
        expect(countRelationReferences(PAGE, 'rel-a')).toBe(2);
        expect(countRelationReferences(PAGE, 'rel-c')).toBe(0);
    });

    it('removes the references to deleted relations and keeps the rest', () => {
        const page = removeRelationReferences(PAGE, new Set(['rel-a']));
        expect(referencedRelationIds(page)).toEqual(['rel-b']);
        expect(page).toContain('-- chart: bar');
        expect(page).toContain('# Overview');
    });

    it('appends a block at the end of the page', () => {
        expect(appendToMarkdown('', 'Hello')).toBe('Hello\n');
        expect(appendToMarkdown('# Title\n\n', relationReferenceFence('rel-a')))
            .toBe(`# Title\n\n${relationReferenceFence('rel-a')}\n`);
    });
});

describe('renaming a relation in a page', () => {
    const page = [
        '<columngroup>',
        '  <column span="6">',
        '    ```sql by_region',
        '    -- view: bar',
        "    SELECT * FROM refs.sales() WHERE note = 'refs.sales()'",
        '    ```',
        '  </column>',
        '</columngroup>',
        '',
        '```sql',
        '-- view: table',
        'FROM dash.refs.sales(), refs.sales_2()',
        '```',
        '',
    ].join('\n');

    it('renames the calls in every block, indented or not', () => {
        expect(blockNames(page)).toEqual(['by_region']);
        const renamed = renameRefsInMarkdown(page, 'sales', 'revenue');
        expect(renamed).toBe(page
            .replace("FROM refs.sales() WHERE", "FROM refs.revenue() WHERE")
            .replace('FROM dash.refs.sales()', 'FROM dash.refs.revenue()'));
    });

    it('leaves a page alone whose own block has the name', () => {
        const shadowed = page.replace('```sql by_region', '```sql sales');
        expect(renameRefsInMarkdown(shadowed, 'sales', 'revenue')).toBe(shadowed);
    });
});
