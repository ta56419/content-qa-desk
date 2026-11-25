import type { Draft, Finding } from './types';
import { sampleDraft } from './sample';

// Hand-labelled before running the checker. Match rule AND context, not just a total.
// These synthetic drafts cover this tool's narrow rules, not production accuracy.
interface Fixture {
  name: string;
  draft: Draft;
  expected: Pick<Finding, 'rule' | 'context'>[];
}
const withHtml = (html: string): Draft => ({
  title: 'A useful team note',
  metaDescription: 'A short guide to a focused weekly review.',
  html,
});
export const fixtures: Fixture[] = [
  {
    name: 'Clean article',
    draft: withHtml(
      '<h1>A useful team note</h1><p>Read <a href="/guide">the guide</a>.</p><img src="team.png" alt="Three editors reviewing a draft">',
    ),
    expected: [],
  },
  {
    name: 'Decorative images and named fragment',
    draft: withHtml(
      '<H1>Weekly notes</H1><img src="line.svg" alt=""><IMG SRC="dot.svg" ALT=""><a href="#next">Next section</a>',
    ),
    expected: [],
  },
  {
    name: 'Whitespace metadata and missing H1',
    draft: { title: '  ', metaDescription: '\n', html: '<h2>Start here</h2>' },
    expected: [
      { rule: 'title', context: 'Article title' },
      { rule: 'meta', context: 'Search preview' },
      { rule: 'h1', context: 'Article headings' },
    ],
  },
  {
    name: 'Multiple main headings',
    draft: withHtml('<h1>First review</h1><h1>Final review</h1>'),
    expected: [
      { rule: 'h1', context: 'Headings: First review · Final review' },
    ],
  },
  {
    name: 'Missing alt versus empty and descriptive alt',
    draft: withHtml(
      '<h1>Image notes</h1><img src="board.png"><img><img src="line.svg" alt=""><img src="desk.jpg" alt="A writing desk">',
    ),
    expected: [
      { rule: 'alt', context: 'Image: board.png' },
      { rule: 'alt', context: 'Image: (no source, image 2)' },
    ],
  },
  {
    name: 'Four placeholder variants',
    draft: withHtml(
      '<h1>Reading list</h1><a>Missing</a><a href="">Empty</a><a href="#">Hash</a><a href="  ">Spaces</a><a href="/notes">Real</a>',
    ),
    expected: [
      { rule: 'link', context: 'Link: Missing · href=(missing)' },
      { rule: 'link', context: 'Link: Empty · href=""' },
      { rule: 'link', context: 'Link: Hash · href="#"' },
      { rule: 'link', context: 'Link: Spaces · href=""' },
    ],
  },
  {
    name: 'Encoded placeholder and text',
    draft: withHtml(
      '<h1>Escaped text</h1><a href="&#35;">Read &amp; review</a>',
    ),
    expected: [{ rule: 'link', context: 'Link: Read & review · href="#"' }],
  },
  {
    name: 'Malformed HTML recovered by the parser',
    draft: withHtml(
      '<h1>Morning note</h1><p>A note <b>in progress<img src=unfinished.png>',
    ),
    expected: [{ rule: 'alt', context: 'Image: unfinished.png' }],
  },
  {
    name: 'Built-in editorial sample',
    draft: sampleDraft,
    expected: [
      { rule: 'meta', context: 'Search preview' },
      { rule: 'alt', context: 'Image: /images/editor-dashboard.png' },
      { rule: 'link', context: 'Link: Monday review checklist · href="#"' },
    ],
  },
];
