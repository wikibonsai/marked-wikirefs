import assert from 'node:assert/strict';

import type { TestCase } from './types';
import { buildMd } from './setup';


describe('config; resolvers', () => {

  // table-driven exact-html runner (local per file): builds a fresh pipeline per case with
  // `opts` layered over the render-only mock base (buildMd merges via defu), renders `mkdn`,
  // and asserts the FULL html.
  function run(contextMsg: string, tests: TestCase[]): void {
    context(contextMsg, () => {
      let i: number = 0;
      for (const test of tests) {
        const desc: string = `[${('00' + (++i)).slice(-3)}] ` + (test.descr || '');
        it(desc, async () => {
          const actlHtml: string = await buildMd(test.opts)(test.mkdn);
          assert.strictEqual(actlHtml, test.html);
        });
      }
    });
  }

  run('resolver functions', [
    {
      descr: 'resolveHtmlHref; valid',
      opts: { resolveHtmlHref: (f: string): string | undefined => f.startsWith('zombie') ? undefined : '/' + f },
      mkdn: '[[real-note]]\n',
      html: '<p><a class="wiki link" href="/real-note" data-href="/real-note">real-note</a></p>\n',
    },
    {
      descr: 'resolveHtmlHref; zombie',
      opts: { resolveHtmlHref: (f: string): string | undefined => f.startsWith('zombie') ? undefined : '/' + f },
      mkdn: '[[zombie-x]]\n',
      html: '<p><a class="wiki link invalid">[[zombie-x]]</a></p>\n',
    },
    {
      descr: 'resolveHtmlText',
      opts: { resolveHtmlText: (f: string): string => f.startsWith('zombie') ? f : 'Title ' + f },
      mkdn: '[[fname-a]]\n',
      html: '<p><a class="wiki link" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">Title fname-a</a></p>\n',
    },
    {
      descr: 'resolveDocType',
      opts: { resolveDocType: (f: string): string | undefined => f.startsWith('zombie') ? undefined : 'note' },
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="attrbox">\n'
          + '<dl>\n'
          + '<div class="attr-item">\n'
          + '<dt class="reftype__attrtype">attrtype</dt>\n'
          + '<dd><a class="attr wiki doctype__note" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'resolveDocType; none',
      opts: {},
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="attrbox">\n'
          + '<dl>\n'
          + '<div class="attr-item">\n'
          + '<dt class="reftype__attrtype">attrtype</dt>\n'
          + '<dd><a class="attr wiki" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'resolveEmbedContent',
      opts: { resolveEmbedContent: async (f: string): Promise<string | undefined> => 'Embed content for ' + f },
      mkdn: '![[fname-a]]\n',
      html: '<article class="embed-wrapper">\n'
          + '<div class="embed-title">\n'
          + '<a class="wiki embed" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">\n'
          + 'title a\n'
          + '</a>\n'
          + '</div>\n'
          + '<div class="embed-link">\n'
          + '<a class="embed-link-icon" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">\n'
          + '<i class="link-icon"></i>\n'
          + '</a>\n'
          + '</div>\n'
          + '<div class="embed-content">\n'
          + 'Embed content for fname-a\n'
          + '</div>\n'
          + '</article>\n',
    },
  ]);

});
