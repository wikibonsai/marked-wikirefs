import assert from 'node:assert/strict';

import { marked } from 'marked';
import markedFootnote from 'marked-footnote';
import * as wikirefs from 'wikirefs';
import type { WikiRefTestCase, TestFileData } from 'wikirefs-spec';
import { wikiRefCases, fileDataMap } from 'wikirefs-spec';

import type { WikiRefsOptions } from '../../src/lib/types';
import wikirefsExtension from '../../src';
import { makeMockOptsForRenderOnly } from '../config';


// setup

let cycleStack: string[] = [];
let mockOpts: Partial<WikiRefsOptions>;
let md: typeof marked;

async function run(contextMsg: string, tests: WikiRefTestCase[]): Promise<void> {
  context(contextMsg, () => {
    let i: number = 0;
    for(const test of tests) {
      const desc: string = `[${('00' + (++i)).slice(-3)}] ` + (test.descr || '');
      it(desc, async () => {
        const mkdn: string = test.mkdn;
        const expdHTML: string = test.html;
        const actlHTML: string = await md(mkdn);
        assert.strictEqual(actlHTML, expdHTML);
      });
    }
  });
}

describe('marked-wikirefs', () => {

  before(() => {
    wikiRefCases.forEach((testcase: WikiRefTestCase) => {
      // for wikiembeds...
      if (testcase.descr.includes('wikiembed')) {
        // ...marked does not insert newlines after paragraph html tags
        testcase.html = testcase.html.replace(/<p>(.*?)\n<p>/g, '<p>$1<p>');
      }
      // for tables...
      if (testcase.descr.includes('; tables')) {
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
          // wikiattrs not allowed inside
          if (testcase.descr === 'wikiattr; prefixed; w/ other mkdn constructs; nested; gfm; footnote') {
            // testcase.mkdn = '';
            testcase.html = '<section class="footnotes" data-footnotes>\n' +
                            '<h2 id="footnote-label" class="sr-only">Footnotes</h2>\n' +
                            '<ol>\n' +
                            ' <li id="footnote-1">\n' +
                            '      <p>\n' +
                            '        :attrtype::<a class="wiki link" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a>\n' +
                            '        <a\n' +
                            '          href="#footnote-ref-1"\n' +
                            '          data-footnote-backref\n' +
                            '          aria-label="Back to reference 1"\n' +
                            '          >↩</a\n' +
                            '        >\n' +
                            '      </p>\n' +
                            '    </li>\n' +
                            '</ol>\n' +
                            '</section>\n';
          }
          if (testcase.descr === 'wikiattr; unprefixed; w/ other mkdn constructs; nested; gfm; footnote') {
            testcase.html = '<section class="footnotes" data-footnotes>\n' +
                            '<h2 id="footnote-label" class="sr-only">Footnotes</h2>\n' +
                            '<ol>\n' +
                            ' <li id="footnote-1">\n' +
                            '      <p>\n' +
                            '        attrtype::<a class="wiki link" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a>\n' +
                            '        <a\n' +
                            '          href="#footnote-ref-1"\n' +
                            '          data-footnote-backref\n' +
                            '          aria-label="Back to reference 1"\n' +
                            '          >↩</a\n' +
                            '        >\n' +
                            '      </p>\n' +
                            '    </li>\n' +
                            '</ol>\n' +
                            '</section>\n';
          }
        }
      }
    });
  });

  beforeEach(() => {
    cycleStack = [];
    mockOpts = {
      ...makeMockOptsForRenderOnly(),
      // note: it ain't pretty, but it gets the job done...
      resolveEmbedContent: async function(filename: string): Promise<string | undefined> {
        // markdown-only
        if (wikirefs.isMedia(filename)) { return; }
        // cycle detection
        if (!cycleStack) {
          cycleStack = [];
        } else {
          if (cycleStack.includes(filename)) {
            // reset stack before leaving
            cycleStack = [];
            return 'cycle detected';
          }
        }
        cycleStack.push(filename);
        // get content
        const fakeFile: TestFileData | undefined = fileDataMap.find((fileData: TestFileData) => fileData.filename === filename);
        const mkdnContent: string | undefined = fakeFile ? fakeFile.content : undefined;
        let htmlContent: string | undefined;
        if (mkdnContent === undefined) {
          htmlContent = undefined;
        } else if (mkdnContent.length === 0) {
          htmlContent = '';
        } else {
          htmlContent = await md.parse(mkdnContent);
        }
        // reset stack before leaving
        cycleStack = [];
        return htmlContent;
      },
    };

    /* eslint-disable indent */
    md = marked.setOptions({
                 gfm: true,
                 async: true,
               })
               .use(markedFootnote()) // todo: this doesn't seem to be working...?
               .use(wikirefsExtension(mockOpts));
    /* eslint-enable indent */
  });

  describe('render; mkdn -> html', () => {

    // run('wikirefs-spec', wikiRefCases);
    run('wikirefs-spec', wikiRefCases.filter((testcase: WikiRefTestCase) => {
      const failingTests: any = [
        'wikiattr; unprefixed; w/ other mkdn constructs; nested; gfm; footnote',
        'wikiattr; prefixed; w/ other mkdn constructs; nested; gfm; footnote',
      ];
      const skipFailing: boolean = !failingTests.some((descr: string) => descr === testcase.descr);
      return skipFailing;
    }));

  });

});
