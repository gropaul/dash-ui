import remarkGfm from "remark-gfm";
import {KEYS} from "platejs";
import {BlockPlaceholderPlugin, ParagraphPlugin} from "platejs/react";
import {
    BlockquotePlugin,
    BoldPlugin,
    CodePlugin,
    H1Plugin,
    H2Plugin,
    H3Plugin,
    H4Plugin,
    HorizontalRulePlugin,
    ItalicPlugin,
    StrikethroughPlugin,
    UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import {
    BlockquoteRules,
    BoldRules,
    CodeRules,
    HeadingRules,
    HorizontalRuleRules,
    ItalicRules,
    StrikethroughRules,
    UnderlineRules,
} from "@platejs/basic-nodes";
import {ColumnItemPlugin, ColumnPlugin} from "@platejs/layout/react";
import {ListPlugin} from "@platejs/list/react";
import {BulletedListRules, OrderedListRules, TaskListRules} from "@platejs/list";
import {IndentPlugin} from "@platejs/indent/react";
import {CodeBlockPlugin, CodeLinePlugin, CodeSyntaxPlugin} from "@platejs/code-block/react";
import {CodeBlockRules} from "@platejs/code-block";
import {DndPlugin} from "@platejs/dnd";
import {LinkPlugin} from "@platejs/link/react";
import {BlockSelectionPlugin} from "@platejs/selection/react";
import {MarkdownPlugin, remarkMdx} from "@platejs/markdown";
import {RelationBlockPlugin} from "@/components/page-editor/relation-block";
import {ColumnElement, ColumnGroupElement} from "@/components/page-editor/column-elements";
import {
    BlockList,
    BlockquoteElement,
    CodeBlockElement,
    CodeLineElement,
    H1Element,
    H2Element,
    H3Element,
    H4Element,
    HrElement,
    ParagraphElement,
} from "@/components/page-editor/text-elements";
import {BlockDraggable} from "@/components/page-editor/block-draggable";
import {BlockHoverPlugin} from "@/components/page-editor/block-hover";
import {isMovableBlock} from "@/components/page-editor/block-moves";
import {ListTabPlugin} from "@/components/page-editor/block-types";
import {pageMarkdownRules} from "@/components/page-editor/markdown";
import {LinkElement} from "@/components/page-editor/link-element";
import {BlockInputPlugin} from "@/components/page-editor/block-relation";

const LIST_TARGETS = [...KEYS.heading, KEYS.p, KEYS.blockquote, KEYS.codeBlock];

export const EMPTY_LINE_PLACEHOLDER = 'Start typing, or press / to add a block';

/** The page editor's blocks with their markdown typing shortcuts, markdown conversion, drag and drop and selection. */
export const PAGE_EDITOR_PLUGINS = [
    ParagraphPlugin.withComponent(ParagraphElement),
    H1Plugin.configure({inputRules: [HeadingRules.markdown()]}).withComponent(H1Element),
    H2Plugin.configure({inputRules: [HeadingRules.markdown()]}).withComponent(H2Element),
    H3Plugin.configure({inputRules: [HeadingRules.markdown()]}).withComponent(H3Element),
    H4Plugin.configure({inputRules: [HeadingRules.markdown()]}).withComponent(H4Element),
    BlockquotePlugin.configure({inputRules: [BlockquoteRules.markdown()]}).withComponent(BlockquoteElement),
    HorizontalRulePlugin.configure({inputRules: [HorizontalRuleRules.markdown()]}).withComponent(HrElement),
    CodeBlockPlugin.configure({inputRules: [CodeBlockRules.markdown({on: 'match'})]}).withComponent(CodeBlockElement),
    CodeLinePlugin.withComponent(CodeLineElement),
    CodeSyntaxPlugin,
    BoldPlugin.configure({inputRules: [BoldRules.markdown()]}),
    ItalicPlugin.configure({inputRules: [ItalicRules.markdown()]}),
    UnderlinePlugin.configure({inputRules: [UnderlineRules.markdown()]}),
    StrikethroughPlugin.configure({inputRules: [StrikethroughRules.markdown()]}),
    CodePlugin.configure({inputRules: [CodeRules.markdown()]}),
    IndentPlugin.configure({inject: {targetPlugins: LIST_TARGETS}}),
    ListPlugin.configure({
        inject: {targetPlugins: LIST_TARGETS},
        render: {belowNodes: BlockList},
        inputRules: [
            BulletedListRules.markdown({variant: '-'}),
            BulletedListRules.markdown({variant: '*'}),
            OrderedListRules.markdown({variant: '.'}),
            TaskListRules.markdown(),
        ],
    }),
    ListTabPlugin,
    ColumnPlugin.withComponent(ColumnGroupElement),
    ColumnItemPlugin.withComponent(ColumnElement),
    RelationBlockPlugin,
    BlockInputPlugin,
    LinkPlugin.withComponent(LinkElement),
    MarkdownPlugin.configure({options: {remarkPlugins: [remarkGfm, remarkMdx], rules: pageMarkdownRules}}),
    DndPlugin.configure({render: {aboveNodes: BlockDraggable}}),
    // Rows aren't selectable, so a selection rectangle picks the blocks it touches, not the whole row.
    BlockSelectionPlugin.configure({
        options: {isSelectable: (element, path) => isMovableBlock(path) && element.type !== KEYS.columnGroup},
    }),
    BlockHoverPlugin,
    // The hint on the empty line holding the cursor; a page that is one empty line shows PlateContent's placeholder.
    BlockPlaceholderPlugin.configure({
        options: {
            className: 'before:pointer-events-none before:absolute before:text-muted-foreground/50 before:content-[attr(placeholder)]',
            placeholders: {[KEYS.p]: EMPTY_LINE_PLACEHOLDER},
            query: ({node, path}) => isMovableBlock(path) && !node.listStyleType,
        },
    }),
];
