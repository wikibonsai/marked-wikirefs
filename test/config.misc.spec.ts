import assert from 'node:assert/strict';

import { buildMd } from './setup';


describe('config; misc', () => {

  // attrs enabled but render:false — the attr line is still consumed (stripped from the
  // body during preprocess) but no attrbox is emitted, so the whole document is empty.
  it('attrbox render disabled', async () => {
    const actlHtml: string = await buildMd({ attrs: { enable: true, render: false } })(':attrtype::[[fname-a]]\n');
    assert.strictEqual(actlHtml, '');
  });

  // custom errorContent surfaces when the resolver yields nothing for the embed.
  it('error content', async () => {
    const actlHtml: string = await buildMd({
      embeds: { errorContent: 'Custom Error Content' },
      resolveEmbedContent: async (): Promise<string | undefined> => undefined,
    })('![[fname-a]]\n');
    assert.strictEqual(actlHtml,
      '<article class="embed-wrapper">\n'
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
      + 'Custom Error Content\'fname-a\'\n'
      + '</div>\n'
      + '</article>\n');
  });

});
