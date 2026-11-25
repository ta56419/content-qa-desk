import { load } from 'cheerio';
import type { Draft, Finding } from '../shared/types';

const excerpt = (text: string) =>
  text.replace(/\s+/g, ' ').trim().slice(0, 180);

// Parsing only: Cheerio does not execute scripts or fetch external resources.
export function checkDraft(draft: Draft): Finding[] {
  const findings: Finding[] = [];
  if (!draft.title.trim())
    findings.push({
      rule: 'title',
      message: 'Title is missing',
      context: 'Article title',
      suggestion: 'Add a clear title that describes this article.',
    });
  if (!draft.metaDescription.trim())
    findings.push({
      rule: 'meta',
      message: 'Meta description is missing',
      context: 'Search preview',
      suggestion: 'Write a short summary of what readers will learn.',
    });
  const $ = load(draft.html);
  const headings = $('h1');
  if (headings.length !== 1)
    findings.push({
      rule: 'h1',
      message:
        headings.length === 0
          ? 'No H1 found in the submitted HTML'
          : 'More than one H1 found',
      context:
        headings.length === 0
          ? 'Article headings'
          : `Headings: ${excerpt(
              headings
                .toArray()
                .map((el) => excerpt($(el).text()) || '(empty heading)')
                .join(' · '),
            )}`,
      suggestion:
        'Aim for one main heading. Some CMS templates provide the H1 separately; check the template before changing the draft.',
    });
  $('img').each((index, element) => {
    const img = $(element);
    if (img.attr('alt') === undefined)
      findings.push({
        rule: 'alt',
        message: 'Image is missing an alt attribute',
        context: `Image: ${excerpt(img.attr('src') || '') || `(no source, image ${index + 1})`}`,
        suggestion:
          'Add a short description, or use alt="" if the image is decorative.',
      });
  });
  $('a').each((index, element) => {
    const link = $(element);
    const href = link.attr('href')?.trim();
    if (!href || href === '#')
      findings.push({
        rule: 'link',
        message: 'Placeholder link',
        context: `Link: ${excerpt(link.text()) || `(no text, link ${index + 1})`} · href=${href === undefined ? '(missing)' : `"${href}"`}`,
        suggestion:
          'Add the intended destination, or remove the link until it is ready.',
      });
  });
  return findings;
}
