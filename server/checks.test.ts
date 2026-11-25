import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkDraft } from './checks';
import { fixtures } from '../shared/fixtures';
import { sampleDraft } from '../shared/sample';

describe('Hand-labelled fixture rules (unit)', () => {
  for (const fixture of fixtures)
    it(fixture.name, () => {
      const actual = checkDraft(fixture.draft).map(({ rule, context }) => ({
        rule,
        context,
      }));
      assert.deepEqual(actual, fixture.expected);
    });
});
describe('Rule engine edge cases (unit)', () => {
  it('distinguishes missing alt from valid empty alt', () => {
    const results = checkDraft({
      ...sampleDraft,
      html: '<h1>Images</h1><img src="missing.png"><img src="decorative.png" alt="">',
    });
    assert.deepEqual(
      results.filter((f) => f.rule === 'alt').map((f) => f.context),
      ['Image: missing.png'],
    );
  });
  it('does not execute scripts or interpret tags inside a comment', () => {
    const result = checkDraft({
      title: 'Safe text',
      metaDescription: 'Summary',
      html: '<h1>Safe</h1><!-- <img src="fake"> --><script>throw new Error("executed")</script>',
    });
    assert.deepEqual(result, []);
  });
  it('keeps potentially hostile snippets as text', () => {
    const result = checkDraft({
      ...sampleDraft,
      html: '<h1>Safe</h1><img src="&lt;script&gt;alert(1)&lt;/script&gt;">',
    });
    assert.equal(
      result.find((f) => f.rule === 'alt')?.context,
      'Image: <script>alert(1)</script>',
    );
  });
  it('explains the CMS heading caveat for missing and multiple H1s', () => {
    for (const html of ['', '<h1>One</h1><h1>Two</h1>']) {
      assert.match(
        checkDraft({ ...sampleDraft, html }).find((f) => f.rule === 'h1')!
          .suggestion,
        /CMS templates provide the H1 separately/,
      );
    }
  });
  it('produces identical ordered findings on repeated runs', () => {
    assert.deepEqual(checkDraft(sampleDraft), checkDraft(sampleDraft));
  });
});
