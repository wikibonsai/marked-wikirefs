import assert from 'node:assert/strict';

import { Marked } from 'marked';
import markedFootnote from 'marked-footnote';

import * as wikirefs from 'wikirefs';
import wikirefsExtension from '../src';
import type { WikiRefsOptions } from '../src/lib/types';

import type { WikiRefTestCase, TestFileData } from 'wikirefs-spec';
import { wikiRefCases, fileDataMap, makeMockOptsForRenderOnly } from 'wikirefs-spec';


// shared render-test setup. wikirefs stands alone here — caml is not co-registered
// (caml + wikirefs interop is tested from the caml side, in marked-caml). the embed
// resolver, expected-html overrides, and run() helper live here.

export type MdFn = ((src: string) => Promise<string>) & { parse: (src: string, opt?: unknown) => Promise<string> };

// build a marked pipeline. async (wikirefs' embed hook). the embed resolver recursively
// renders fixture content w/ cycle detection + header extraction.
export function buildMd(): MdFn {
  let cycleStack: string[] = [];
  // eslint-disable-next-line prefer-const -- forward-referenced by the embed resolver closure below, assigned after the pipeline is built
  let md: MdFn;
  const mockOpts: Partial<WikiRefsOptions> = {
    ...makeMockOptsForRenderOnly(),
    // note: it ain't pretty, but it gets the job done...
    resolveEmbedContent: async function(filename: string, hText?: string | undefined): Promise<string | undefined> {
      // markdown-only
      if (wikirefs.isMedia(filename)) { return; }
      // cycle detection
      if (!cycleStack) {
        cycleStack = [];
      } else {
        if (cycleStack.includes(filename)) {
          cycleStack = [];
          return 'cycle detected';
        }
      }
      cycleStack.push(filename);
      // get content
      const fakeFile: TestFileData | undefined = fileDataMap.find((fileData: TestFileData) => fileData.filename === filename);
      let mkdnContent: string | undefined = fakeFile ? fakeFile.content : undefined;
      // section extraction via header
      if (mkdnContent && hText && hText.trim().length > 0) {
        const section: string | undefined = wikirefs.getHeaderSection(mkdnContent, hText);
        if (section !== undefined) {
          mkdnContent = section;
        } else {
          cycleStack = [];
          return (mockOpts.embeds?.errorContent || 'Error: Content not found for ') + '\'' + filename + '\'';
        }
      }
      let htmlContent: string | undefined;
      if (mkdnContent === undefined) {
        htmlContent = undefined;
      } else if (mkdnContent.length === 0) {
        htmlContent = '';
      } else {
        htmlContent = await md.parse(mkdnContent);
      }
      cycleStack = [];
      return htmlContent;
    },
  };
  // a fresh Marked instance so hooks are not accumulated across builds (a marked
  // singleton would chain preprocess/postprocess on each rebuild).
  const instance: Marked = new Marked();
  instance.setOptions({ gfm: true, async: true });
  instance.use(markedFootnote());
  instance.use(wikirefsExtension(mockOpts));
  md = ((src: string, opt?: unknown) => instance.parse(src, opt as never)) as MdFn;
  md.parse = (src: string, opt?: unknown) => instance.parse(src, opt as never);
  return md;
}

// iterate cases, render, assert. getMd returns the per-test md (rebuilt in beforeEach).
// `overrides` (descr -> html) supplies per-suite expected html for cases that diverge
// between the wo/w-caml contexts — applied at assert-time so the shared case objects
// are never mutated.
export function run(getMd: () => MdFn, contextMsg: string, tests: WikiRefTestCase[], overrides?: Record<string, string>): void {
  context(contextMsg, () => {
    let i: number = 0;
    for(const test of tests) {
      const desc: string = `[${('00' + (++i)).slice(-3)}] ` + (test.descr || '');
      it(desc, async () => {
        const md: MdFn = getMd();
        const expdHTML: string = (overrides && (test.descr in overrides)) ? overrides[test.descr] : test.html;
        const actlHTML: string = await md(test.mkdn);
        assert.strictEqual(actlHTML, expdHTML);
      });
    }
  });
}

// mutate the shared wikiRefCases html for cases where the spec ships a placeholder or
// marked diverges from the canonical html (footnotes, embeds whitespace, tables).
// idempotent — safe to call from multiple suites' before(). caml-AGNOSTIC only: these
// are links/embeds/nested-footnote-body cases caml never forms an attrbox from, so the
// expected html is identical with or without caml. the wikiattr-IN-footnote cases (which
// DO differ under caml) are NOT here — they're handled per-suite via run()'s overrides.
export function applyExpectedOverrides(): void {
  wikiRefCases.forEach((testcase: WikiRefTestCase) => {
    // for wikiembeds...
    if (testcase.descr.includes('wikiembed')) {
      // ...marked does not insert newlines after paragraph html tags
      testcase.html = testcase.html.replace(/<p>(.*?)\n<p>/g, '<p>$1<p>');
    }
    // for tables...
    if (testcase.descr.includes('table')) {
      // ...marked does not insert newlines after table body html tags
      testcase.html = testcase.html.replace('<tbody>\n', '<tbody>');
      testcase.html = testcase.html.replace('</tbody>\n', '</tbody>');
    }
    // for gfm...
    if (testcase.descr.includes('gfm')) {
      //  ...supply expected html of footnote cases...
      if (testcase.descr.includes('footnote')) {
        // typed
        if (testcase.descr.includes('; typed;')) {
          testcase.html =
            '<p>Here is<sup><a id="footnote-ref-1" href="#footnote-1" data-footnote-ref aria-describedby="footnote-label">1</a></sup> <a class="wiki link type reftype__linktype1" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a>.</p>\n' +
            '<section class="footnotes" data-footnotes>\n' +
            '<h2 id="footnote-label" class="sr-only">Footnotes</h2>\n' +
            '<ol>\n' +
            '<li id="footnote-1">\n' +
            '<p>A footnote with <a class="wiki link type reftype__linktype2" href="/tests/fixtures/fname-b" data-href="/tests/fixtures/fname-b">title b</a>. <a href="#footnote-ref-1" data-footnote-backref aria-label="Back to reference 1">↩</a></p>\n' +
            '</li>\n' +
            '</ol>\n' +
            '</section>\n';
        }
        // untyped
        if (testcase.descr.includes('; untyped;')) {
          testcase.html =
            '<p>Here is<sup><a id="footnote-ref-1" href="#footnote-1" data-footnote-ref aria-describedby="footnote-label">1</a></sup> <a class="wiki link" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a>.</p>\n' +
            '<section class="footnotes" data-footnotes>\n' +
            '<h2 id="footnote-label" class="sr-only">Footnotes</h2>\n' +
            '<ol>\n' +
            '<li id="footnote-1">\n' +
            '<p>A footnote with <a class="wiki link" href="/tests/fixtures/fname-b" data-href="/tests/fixtures/fname-b">title b</a>. <a href="#footnote-ref-1" data-footnote-backref aria-label="Back to reference 1">↩</a></p>\n' +
            '</li>\n' +
            '</ol>\n' +
            '</section>\n';
        }
        // wikiattrs inside a footnote def: marked-footnote does not form the footnote
        // here (the attr line disrupts it), so the ref + def render as text and the wiki
        // VALUE resolves to a body wikilink. caml-agnostic: caml does not extract an attr
        // from the footnote-def line, so the dual produces the identical output.
        if (testcase.descr === 'wikiattr; unprefixed; w/ other mkdn constructs; nested; gfm; footnote') {
          testcase.html = '<p>[^fn]\n[^fn]<a class="wiki link type reftype__attrtype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></p>\n';
        }
        if (testcase.descr === 'wikiattr; prefixed; w/ other mkdn constructs; nested; gfm; footnote') {
          testcase.html = '<p>[^fn]\n[^fn]: <a class="wiki link type reftype__attrtype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></p>\n';
        }
        // wikiembed; full-doc with footnote
        if (testcase.descr === 'wikiembed; w/ other mkdn constructs; gfm; footnote') {
          testcase.html =
            '<article class="embed-wrapper">\n' +
            '<div class="embed-title">\n' +
            '<a class="wiki embed" href="/tests/fixtures/embed-doc-mkdn-footnote" data-href="/tests/fixtures/embed-doc-mkdn-footnote">\n' +
            'embed doc mkdn footnote\n' +
            '</a>\n' +
            '</div>\n' +
            '<div class="embed-link">\n' +
            '<a class="embed-link-icon" href="/tests/fixtures/embed-doc-mkdn-footnote" data-href="/tests/fixtures/embed-doc-mkdn-footnote">\n' +
            '<i class="link-icon"></i>\n' +
            '</a>\n' +
            '</div>\n' +
            '<div class="embed-content">\n' +
            '<p>Body<sup><a id="footnote-ref-1" href="#footnote-1" data-footnote-ref aria-describedby="footnote-label">1</a></sup>.</p>\n' +
            '<section class="footnotes" data-footnotes>\n' +
            '<h2 id="footnote-label" class="sr-only">Footnotes</h2>\n' +
            '<ol>\n' +
            '<li id="footnote-1">\n' +
            '<p>note text <a href="#footnote-ref-1" data-footnote-backref aria-label="Back to reference 1">↩</a></p>\n' +
            '</li>\n' +
            '</ol>\n' +
            '</section>\n' +
            '\n' +
            '</div>\n' +
            '</article>\n';
        }
        // wikiembed; header section with footnote
        if (testcase.descr === 'wikiembed; w/ other mkdn constructs; header; gfm; section w/ footnote') {
          testcase.html =
            '<article class="embed-wrapper">\n' +
            '<div class="embed-title">\n' +
            '<a class="wiki embed" href="/tests/fixtures/embed-doc-header-mkdn#footnote" data-href="/tests/fixtures/embed-doc-header-mkdn#footnote">\n' +
            'embed doc header constructs\n' +
            '</a>\n' +
            '</div>\n' +
            '<div class="embed-link">\n' +
            '<a class="embed-link-icon" href="/tests/fixtures/embed-doc-header-mkdn#footnote" data-href="/tests/fixtures/embed-doc-header-mkdn#footnote">\n' +
            '<i class="link-icon"></i>\n' +
            '</a>\n' +
            '</div>\n' +
            '<div class="embed-content">\n' +
            '<p>Body<sup><a id="footnote-ref-1" href="#footnote-1" data-footnote-ref aria-describedby="footnote-label">1</a></sup>.</p>\n' +
            '<section class="footnotes" data-footnotes>\n' +
            '<h2 id="footnote-label" class="sr-only">Footnotes</h2>\n' +
            '<ol>\n' +
            '<li id="footnote-1">\n' +
            '<p>note text <a href="#footnote-ref-1" data-footnote-backref aria-label="Back to reference 1">↩</a></p>\n' +
            '</li>\n' +
            '</ol>\n' +
            '</section>\n' +
            '\n' +
            '</div>\n' +
            '</article>\n';
        }
      }
    }
  });
}
