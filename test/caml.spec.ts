// note: see marked-caml for caml + wikiref interop tests.
//
// hand-off (caml-wikiref-handoff): marked-caml renders wiki attr values as plain string
// spans (<span class="attr string">[[target]]</span> -- the raw key rides the <dt> as
// key__, not the span); marked-wikirefs upgrades them to resolved links in its wikiattr
// postprocess. Here we unit-test that upgrade
// directly (feeding markdown would let wikirefs' inline [[...]] tokenizer eat the
// brackets before postprocess).

import assert from 'node:assert/strict';

import { wikiattrs } from '../src/lib/wikiattr';

describe('marked-wikirefs: resolve caml wiki string spans', () => {

  const opts: any = {
    attrs: { enable: true, render: true, title: 'Attributes' },
    cssNames: {
      attr: 'attr', wiki: 'wiki', invalid: 'invalid',
      reftype: 'reftype__', doctype: 'doctype__',
      attrbox: 'attrbox', attrItem: 'attr-item',
    },
    resolveHtmlHref: (f: string) => f.startsWith('zombie') ? undefined : '/' + f,
    resolveHtmlText: (f: string) => f.startsWith('zombie') ? f : 'Title ' + f,
  };
  const post = (html: string): string => (wikiattrs(opts) as any).hooks.postprocess(html);

  it('upgrades a valid wiki string span to a link (no reftype -- the key rides the dt)', () => {
    const out: string = post('<span class="attr string">[[real-note]]</span>');
    assert.ok(out.includes('<a '), 'upgraded to an anchor');
    assert.ok(out.includes('href="/real-note"'), 'resolved href');
    assert.ok(out.includes('data-href="/real-note"'), 'resolved data-href');
    assert.ok(out.includes('class="attr wiki"'), 'structure only -- key__/reftype__ live on the dt');
    assert.ok(!out.includes('[[real-note]]'), 'brackets removed on resolve');
  });

  it('marks a zombie wiki string span invalid, keeping [[brackets]]', () => {
    const out: string = post('<span class="attr string">[[zombie-x]]</span>');
    assert.ok(out.includes('invalid'), 'invalid class added');
    assert.ok(out.includes('[[zombie-x]]'), 'brackets kept for zombie');
    assert.ok(!/href=/.test(out), 'no href for zombie');
  });

  it('leaves a plain string span (non-wiki) untouched', () => {
    const html: string = '<span class="attr string">hello</span>';
    assert.strictEqual(post(html), html);
  });

});
