import assert from 'node:assert/strict';

import { Marked } from 'marked';

import wikirefsExtension from '../src';
import type { WikiRefsOptions } from '../src/lib/types';


// options suite: each case builds a fresh marked pipeline with a specific opts
// override and asserts the rendered html reflects it. a fresh Marked instance per
// build keeps hooks from accumulating across cases.

function build(opts: Partial<WikiRefsOptions>): (src: string) => Promise<string> {
  const instance: Marked = new Marked();
  instance.setOptions({ gfm: true, async: true });
  instance.use(wikirefsExtension(opts));
  return (src: string): Promise<string> => instance.parse(src) as Promise<string>;
}

// canonical single-attr / single-link inputs (fname-a is a spec fixture).
const ATTR_MKDN: string = ':attrtype::[[fname-a]]\n';
const LINK_MKDN: string = '[[fname-a]]\n';

describe('options', () => {

  describe('attrs', () => {

    it('toggle attrs', async () => {
      // enabled (default): the attr line is collected + rendered as an attrbox aside.
      const enabled: string = await build({ attrs: { enable: true, render: true } })(ATTR_MKDN);
      assert.ok(enabled.includes('<aside class="attrbox">'), 'attrbox rendered when attrs enabled');
      // disabled: no attr extension registered, so no attrbox is ever produced.
      const disabled: string = await build({ attrs: { enable: false, render: true } })(ATTR_MKDN);
      assert.ok(!disabled.includes('attrbox'), 'no attrbox when attrs disabled');
    });

    it('toggle attrs render', async () => {
      // render:false — attrs are still enabled (so the attr line is stripped from the
      // body during preprocess), but the collected attrbox is not prepended.
      const out: string = await build({ attrs: { enable: true, render: false } })(ATTR_MKDN);
      assert.ok(!out.includes('attrbox'), 'no attrbox rendered when render:false');
      assert.ok(!out.includes('attrtype'), 'attr line stripped from the body even when not rendered');
    });

  });

  describe('css class names', () => {

    // one custom cssName per test — each overrides a single key and asserts that
    // custom name replaces the default in the rendered attrbox link (ATTR_MKDN yields
    // <aside><dl><div><dt><dd><a class="attr wiki reftype__attrtype ...">). `invalid`
    // and `doctype` need an extra opt to make their class appear.

    it('custom attr', async () => {
      const out: string = await build({ cssNames: { attr: 'custom-attr' } })(ATTR_MKDN);
      assert.ok(out.includes('"custom-attr wiki reftype__attrtype"'), 'custom attr class applied');
      assert.ok(!out.includes('"attr wiki'), 'default attr class absent');
    });

    it('custom wiki', async () => {
      const out: string = await build({ cssNames: { wiki: 'custom-wiki' } })(ATTR_MKDN);
      assert.ok(out.includes('"attr custom-wiki reftype__attrtype"'), 'custom wiki class applied');
      assert.ok(!out.includes(' wiki reftype__'), 'default wiki class absent');
    });

    it('custom invalid', async () => {
      // unresolved href -> the attr renders via the invalid branch.
      const out: string = await build({
        cssNames: { invalid: 'custom-invalid' },
        resolveHtmlHref: (): string | undefined => undefined,
      })(ATTR_MKDN);
      assert.ok(out.includes('"attr wiki custom-invalid"'), 'custom invalid class applied');
      assert.ok(!out.includes('"attr wiki invalid"'), 'default invalid class absent');
    });

    it('custom reftype', async () => {
      const out: string = await build({ cssNames: { reftype: 'custom-reftype__' } })(ATTR_MKDN);
      assert.ok(out.includes('custom-reftype__attrtype'), 'custom reftype prefix applied');
      assert.ok(!out.includes(' reftype__attrtype'), 'default reftype prefix absent');
    });

    it('custom doctype', async () => {
      // a resolved doctype appends the doctype class to the attr link.
      const out: string = await build({
        cssNames: { doctype: 'custom-doctype__' },
        resolveDocType: (): string | undefined => 'note',
      })(ATTR_MKDN);
      assert.ok(out.includes('custom-doctype__note'), 'custom doctype prefix applied');
      assert.ok(!out.includes(' doctype__note'), 'default doctype prefix absent');
    });

    it('custom attrbox', async () => {
      const out: string = await build({ cssNames: { attrbox: 'custom-attrbox' } })(ATTR_MKDN);
      assert.ok(out.includes('class="custom-attrbox"'), 'custom attrbox class applied');
      assert.ok(!out.includes('class="attrbox"'), 'default attrbox class absent');
    });

    it('custom attrItem', async () => {
      const out: string = await build({ cssNames: { attrItem: 'custom-attr-item' } })(ATTR_MKDN);
      assert.ok(out.includes('class="custom-attr-item"'), 'custom attr-item class applied');
      assert.ok(!out.includes('class="attr-item"'), 'default attr-item class absent');
    });

  });

  describe('resolvers', () => {

    it('custom resolveHtmlHref', async () => {
      const md = build({
        resolveHtmlHref: (f: string): string | undefined => f.startsWith('zombie') ? undefined : '/' + f,
      });
      // valid target -> custom href
      const valid: string = await md('[[real-note]]\n');
      assert.ok(valid.includes('href="/real-note"'), 'custom href applied');
      assert.ok(valid.includes('data-href="/real-note"'), 'custom data-href applied');
      // zombie target -> undefined href -> invalid link (no href, raw kept)
      const zombie: string = await md('[[zombie-x]]\n');
      assert.ok(zombie.includes('invalid'), 'undefined href marks the link invalid');
      assert.ok(!/href=/.test(zombie), 'no href emitted for an unresolved target');
      assert.ok(zombie.includes('[[zombie-x]]'), 'raw kept for an unresolved link');
    });

    it('custom resolveHtmlText', async () => {
      const out: string = await build({
        resolveHtmlText: (f: string): string => f.startsWith('zombie') ? f : 'Title ' + f,
      })(LINK_MKDN);
      assert.ok(out.includes('>Title fname-a</a>'), 'custom display text applied');
    });

  });

});
