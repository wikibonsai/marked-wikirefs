// note: see marked-caml for caml + wikiref interop tests.
//
// enrich seam (caml-wikiref-enrich-seam): marked-caml owns the attrbox and emits
// INERT wiki markers (<a class="attr wiki reftype__<key>" data-wikiref="<target>">
// [[target]]</a>); marked-wikirefs resolves them in its wikiattr postprocess. Here we
// unit-test that resolution directly (feeding markdown would let wikirefs' inline
// [[...]] tokenizer eat the brackets before postprocess).

import assert from 'node:assert/strict';

import { wikiattrs } from '../src/lib/wikiattr';

describe('marked-wikirefs: enrich caml wiki markers', () => {

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

  it('resolves a valid inert marker to a link (attr classes preserved)', () => {
    const out: string = post('<a class="attr wiki reftype__ref" data-wikiref="real-note">[[real-note]]</a>');
    assert.ok(out.includes('href="/real-note"'), 'resolved href');
    assert.ok(out.includes('data-href="/real-note"'), 'resolved data-href');
    assert.ok(out.includes('class="attr wiki reftype__ref"'), 'caml attr classes preserved');
    assert.ok(!out.includes('data-wikiref'), 'inert marker consumed');
    assert.ok(!out.includes('[[real-note]]'), 'brackets removed on resolve');
  });

  it('marks a zombie inert marker invalid, keeping [[brackets]]', () => {
    const out: string = post('<a class="attr wiki reftype__ref" data-wikiref="zombie-x">[[zombie-x]]</a>');
    assert.ok(out.includes('invalid'), 'invalid class added');
    assert.ok(out.includes('[[zombie-x]]'), 'brackets kept for zombie');
    assert.ok(!/href=/.test(out), 'no href for zombie');
    assert.ok(!out.includes('data-wikiref'), 'inert marker consumed');
  });

  it('leaves non-marker html untouched', () => {
    const html: string = '<p>just <a href="/x">a link</a></p>';
    assert.strictEqual(post(html), html);
  });

});
