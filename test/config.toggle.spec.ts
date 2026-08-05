import assert from 'node:assert/strict';

import type { WikiRefsOptions } from '../src/lib/types';

import type { TestCase } from './types';
import { buildMd } from './setup';


// construct-toggle opts: exactly one of the three wiki constructs enabled. the same four
// inputs run against each — the point is granularity: an input is only transformed by its
// OWN construct; under any other toggle it falls through as plain text (or, for the attr
// line under links-on, is re-read as a typed link).
const wikiattrOnly:  Partial<WikiRefsOptions> = { attrs: { enable: true },  links: { enable: false }, embeds: { enable: false } };
const wikilinkOnly:  Partial<WikiRefsOptions> = { attrs: { enable: false }, links: { enable: true },  embeds: { enable: false } };
const wikiembedOnly: Partial<WikiRefsOptions> = { attrs: { enable: false }, links: { enable: false }, embeds: { enable: true }  };

describe('config; construct toggling', () => {

  function run(contextMsg: string, tests: TestCase[]): void {
    context(contextMsg, () => {
      let i: number = 0;
      for (const test of tests) {
        const desc: string = `[${('00' + (++i)).slice(-3)}] ` + (test.descr || '');
        it(desc, async () => {
          const actlHtml: string = await buildMd(test.opts)(test.mkdn);
          assert.strictEqual(actlHtml, test.html, test.reason);
        });
      }
    });
  }
  
  // attrs ON, links/embeds OFF: only the attr line becomes an attrbox; link + embed
  // syntax has no active tokenizer, so it survives verbatim as paragraph text.
  run('wikiattrs only', [
    {
      descr: 'wikiattr; prefixed',
      reason: 'renders the attr line as an attrbox aside',
      opts: wikiattrOnly,
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="attrbox">\n'
          + '<dl>\n'
          + '<div class="attr-item">\n'
          + '<dt>attrtype</dt>\n'
          + '<dd><a class="attr wiki reftype__attrtype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'wikilink; typed',
      reason: 'links disabled, so the typed link stays inert text',
      opts: wikiattrOnly,
      mkdn: ':linktype::[[fname-a]].',
      html: '<p>:linktype::[[fname-a]].</p>\n',
    },
    {
      descr: 'wikilink; untyped',
      reason: 'links disabled, so the untyped link stays inert text',
      opts: wikiattrOnly,
      mkdn: '[[fname-a]].',
      html: '<p>[[fname-a]].</p>\n',
    },
    {
      descr: 'wikiembed; mkdn',
      reason: 'embeds disabled, so the embed stays inert text',
      opts: wikiattrOnly,
      mkdn: '![[fname-a]].',
      html: '<p>![[fname-a]].</p>\n',
    },
  ]);

  // links ON, attrs/embeds OFF: an attr line is re-read as a TYPED LINK (the `:type::`
  // prefix supplies the reftype); an embed's leading `!` is left as literal text with the
  // wikilink rendered after it.
  run('wikilinks only', [
    {
      descr: 'wikiattr; prefixed',
      reason: 'attrs disabled, so the attr line is re-read as a typed link',
      opts: wikilinkOnly,
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<p><a class="wiki link type reftype__attrtype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></p>\n',
    },
    {
      descr: 'wikilink; typed',
      reason: 'renders a typed link',
      opts: wikilinkOnly,
      mkdn: ':linktype::[[fname-a]].',
      html: '<p><a class="wiki link type reftype__linktype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a>.</p>\n',
    },
    {
      descr: 'wikilink; untyped',
      reason: 'renders an untyped link',
      opts: wikilinkOnly,
      mkdn: '[[fname-a]].',
      html: '<p><a class="wiki link" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a>.</p>\n',
    },
    {
      descr: 'wikiembed; mkdn',
      reason: 'embeds disabled, so the "!" stays literal and the wikilink renders after it',
      opts: wikilinkOnly,
      mkdn: '![[fname-a]].',
      html: '<p>!<a class="wiki link" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a>.</p>\n',
    },
  ]);

  // embeds ON, attrs/links OFF: only the embed transclusion renders (as a block article,
  // hoisting the trailing '.' into a sibling <p>); attr + link syntax stays as text.
  run('wikiembeds only', [
    {
      descr: 'wikiattr; prefixed',
      reason: 'attrs disabled, so the attr line stays inert text',
      opts: wikiembedOnly,
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<p>:attrtype::[[fname-a]]</p>\n',
    },
    {
      descr: 'wikilink; typed',
      reason: 'links disabled, so the typed link stays inert text',
      opts: wikiembedOnly,
      mkdn: ':linktype::[[fname-a]].',
      html: '<p>:linktype::[[fname-a]].</p>\n',
    },
    {
      descr: 'wikilink; untyped',
      reason: 'links disabled, so the untyped link stays inert text',
      opts: wikiembedOnly,
      mkdn: '[[fname-a]].',
      html: '<p>[[fname-a]].</p>\n',
    },
    {
      descr: 'wikiembed; mkdn',
      reason: 'renders a block article; the trailing "." is hoisted to a sibling <p>',
      opts: wikiembedOnly,
      mkdn: '![[fname-a]].',
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
          + 'Error: Content not found for \'fname-a\'\n'
          + '</div>\n'
          + '</article>\n'
          + '<p>.</p>\n',
    },
  ]);

});
