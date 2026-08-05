import type { WikiRefTestCase } from 'wikirefs-spec';
import type { MdFn } from './setup';

import assert from 'node:assert/strict';
import { wikiRefCases, wikiAttrWithoutCAML } from 'wikirefs-spec';
import { buildMd } from './setup';


// wikirefs render suite. Runs the full wikiRefCases (attrs + links + embeds) +
// wikiAttrWithoutCAML (the caml-absent attr set — wikirefs handles the wikiattr
// primitive itself here).

let md: MdFn;

describe('marked-wikirefs: render', () => {

  function run(getMd: () => MdFn, contextMsg: string, tests: WikiRefTestCase[], overrides?: Record<string, string>): void {
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

  before(() => {
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
          if (testcase.descr === 'wikiembed; mkdn; w/ other mkdn constructs; gfm; footnote') {
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
              '</div>\n' +
              '</article>\n';
          }
          // wikiembed; header section with footnote
          if (testcase.descr === 'wikiembed; mkdn; w/ other mkdn constructs; header; gfm; section w/ footnote') {
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
              '</div>\n' +
              '</article>\n';
          }
        }
      }
    });
  });

  beforeEach(() => {
    md = buildMd() as MdFn;
  });

  describe('render; mkdn -> html', () => {

    run(() => md, 'wikirefs-spec', wikiRefCases);
    run(() => md, 'wiki attrs (no caml — wikirefs handles the primitive)', wikiAttrWithoutCAML);

  });

});
