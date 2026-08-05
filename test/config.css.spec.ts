import assert from 'node:assert/strict';

import type { TestCase } from './types';
import { buildMd } from './setup';


describe('config; css class names', () => {

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
  
  // one custom cssName per case. exact-html pins the custom class into the markup AND
  // (by exact-match) guarantees the default class it replaced is gone. some keys only
  // surface on a specific input (typed link / media embed) or need an extra resolver.
  //
  // note: `![[fname-a]]` resolves its embed CONTENT to the not-found placeholder — fname-a
  // has no fixture body in wikirefs-spec's fileDataMap — so embed cases carry an "Error:
  // Content not found" content line. that's incidental; these cases assert the wrapper /
  // title / link / media markup + css classes, not the embedded body.
  run('overrides', [
    {
      descr: 'wiki',
      opts: { cssNames: { wiki: 'custom-wiki' } },
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="attrbox">\n'
          + '<dl>\n'
          + '<div class="attr-item">\n'
          + '<dt>attrtype</dt>\n'
          + '<dd><a class="attr custom-wiki reftype__attrtype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'invalid',
      opts: { cssNames: { invalid: 'custom-invalid' }, resolveHtmlHref: (): string | undefined => undefined },
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="attrbox">\n'
          + '<dl>\n'
          + '<div class="attr-item">\n'
          + '<dt>attrtype</dt>\n'
          + '<dd><a class="attr wiki custom-invalid">[[fname-a]]</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'attr',
      opts: { cssNames: { attr: 'custom-attr' } },
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="attrbox">\n'
          + '<dl>\n'
          + '<div class="attr-item">\n'
          + '<dt>attrtype</dt>\n'
          + '<dd><a class="custom-attr wiki reftype__attrtype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'link',
      opts: { cssNames: { link: 'custom-link' } },
      mkdn: '[[fname-a]]\n',
      html: '<p><a class="wiki custom-link" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></p>\n',
    },
    {
      descr: 'type',
      opts: { cssNames: { type: 'custom-type' } },
      mkdn: ':linktype1::[[fname-a]].',
      html: '<p><a class="wiki link custom-type reftype__linktype1" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a>.</p>\n',
    },
    {
      descr: 'embed',
      opts: { cssNames: { embed: 'custom-embed' } },
      mkdn: '![[fname-a]]\n',
      html: '<article class="embed-wrapper">\n'
          + '<div class="embed-title">\n'
          + '<a class="wiki custom-embed" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">\n'
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
          + '</article>\n',
    },
    {
      descr: 'reftype',
      opts: { cssNames: { reftype: 'custom-reftype__' } },
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="attrbox">\n'
          + '<dl>\n'
          + '<div class="attr-item">\n'
          + '<dt>attrtype</dt>\n'
          + '<dd><a class="attr wiki custom-reftype__attrtype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'doctype',
      opts: { cssNames: { doctype: 'custom-doctype__' }, resolveDocType: (): string | undefined => 'note' },
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="attrbox">\n'
          + '<dl>\n'
          + '<div class="attr-item">\n'
          + '<dt>attrtype</dt>\n'
          + '<dd><a class="attr wiki reftype__attrtype custom-doctype__note" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'attrbox',
      opts: { cssNames: { attrbox: 'custom-attrbox' } },
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="custom-attrbox">\n'
          + '<dl>\n'
          + '<div class="attr-item">\n'
          + '<dt>attrtype</dt>\n'
          + '<dd><a class="attr wiki reftype__attrtype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'attrItem',
      opts: { cssNames: { attrItem: 'custom-attr-item' } },
      mkdn: ':attrtype::[[fname-a]]\n',
      html: '<aside class="attrbox">\n'
          + '<dl>\n'
          + '<div class="custom-attr-item">\n'
          + '<dt>attrtype</dt>\n'
          + '<dd><a class="attr wiki reftype__attrtype" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">title a</a></dd>\n'
          + '</div>\n'
          + '</dl>\n'
          + '</aside>\n',
    },
    {
      descr: 'embedWrapper',
      opts: { cssNames: { embedWrapper: 'custom-embed-wrapper' } },
      mkdn: '![[fname-a]]\n',
      html: '<article class="custom-embed-wrapper">\n'
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
          + '</article>\n',
    },
    {
      descr: 'embedTitle',
      opts: { cssNames: { embedTitle: 'custom-embed-title' } },
      mkdn: '![[fname-a]]\n',
      html: '<article class="embed-wrapper">\n'
          + '<div class="custom-embed-title">\n'
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
          + '</article>\n',
    },
    {
      descr: 'embedLink',
      opts: { cssNames: { embedLink: 'custom-embed-link' } },
      mkdn: '![[fname-a]]\n',
      html: '<article class="embed-wrapper">\n'
          + '<div class="embed-title">\n'
          + '<a class="wiki embed" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">\n'
          + 'title a\n'
          + '</a>\n'
          + '</div>\n'
          + '<div class="custom-embed-link">\n'
          + '<a class="embed-link-icon" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">\n'
          + '<i class="link-icon"></i>\n'
          + '</a>\n'
          + '</div>\n'
          + '<div class="embed-content">\n'
          + 'Error: Content not found for \'fname-a\'\n'
          + '</div>\n'
          + '</article>\n',
    },
    {
      descr: 'embedContent',
      opts: { cssNames: { embedContent: 'custom-embed-content' } },
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
          + '<div class="custom-embed-content">\n'
          + 'Error: Content not found for \'fname-a\'\n'
          + '</div>\n'
          + '</article>\n',
    },
    {
      descr: 'embedLinkIcon',
      opts: { cssNames: { embedLinkIcon: 'custom-embed-link-icon' } },
      mkdn: '![[fname-a]]\n',
      html: '<article class="embed-wrapper">\n'
          + '<div class="embed-title">\n'
          + '<a class="wiki embed" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">\n'
          + 'title a\n'
          + '</a>\n'
          + '</div>\n'
          + '<div class="embed-link">\n'
          + '<a class="custom-embed-link-icon" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">\n'
          + '<i class="link-icon"></i>\n'
          + '</a>\n'
          + '</div>\n'
          + '<div class="embed-content">\n'
          + 'Error: Content not found for \'fname-a\'\n'
          + '</div>\n'
          + '</article>\n',
    },
    {
      descr: 'linkIcon',
      opts: { cssNames: { linkIcon: 'custom-link-icon' } },
      mkdn: '![[fname-a]]\n',
      html: '<article class="embed-wrapper">\n'
          + '<div class="embed-title">\n'
          + '<a class="wiki embed" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">\n'
          + 'title a\n'
          + '</a>\n'
          + '</div>\n'
          + '<div class="embed-link">\n'
          + '<a class="embed-link-icon" href="/tests/fixtures/fname-a" data-href="/tests/fixtures/fname-a">\n'
          + '<i class="custom-link-icon"></i>\n'
          + '</a>\n'
          + '</div>\n'
          + '<div class="embed-content">\n'
          + 'Error: Content not found for \'fname-a\'\n'
          + '</div>\n'
          + '</article>\n',
    },
    {
      descr: 'embedMedia',
      opts: { cssNames: { embedMedia: 'custom-embed-media' } },
      mkdn: '![[image.png]]\n',
      html: '<figure class="custom-embed-media" src="image.png" alt="image.png">\n'
          + '<img class="embed-image" src="/tests/fixtures/image.png" alt="image.png">\n'
          + '</figure>\n',
    },
    {
      descr: 'embedAudio',
      opts: { cssNames: { embedAudio: 'custom-embed-audio' } },
      mkdn: '![[audio.mp3]]\n',
      html: '<figure class="embed-media" src="audio.mp3" alt="audio.mp3">\n'
          + '<audio class="custom-embed-audio" controls type="audio/mp3" src="/tests/fixtures/audio.mp3"></audio>\n'
          + '</figure>\n',
    },
    {
      descr: 'embedImage',
      opts: { cssNames: { embedImage: 'custom-embed-image' } },
      mkdn: '![[image.png]]\n',
      html: '<figure class="embed-media" src="image.png" alt="image.png">\n'
          + '<img class="custom-embed-image" src="/tests/fixtures/image.png" alt="image.png">\n'
          + '</figure>\n',
    },
    {
      descr: 'embedPDF',
      opts: { cssNames: { embedPDF: 'custom-embed-pdf' } },
      mkdn: '![[pdf-doc.pdf]]\n',
      html: '<figure class="embed-media" src="pdf-doc.pdf" alt="pdf-doc.pdf">\n'
          + '<object class="custom-embed-pdf" data="" type="application/pdf">\n'
          + '<a href="">pdf-doc.pdf</a>\n'
          + '</object>\n'
          + '</figure>\n',
    },
    {
      descr: 'embedVideo',
      opts: { cssNames: { embedVideo: 'custom-embed-video' } },
      mkdn: '![[video.mp4]]\n',
      html: '<figure class="embed-media" src="video.mp4" alt="video.mp4">\n'
          + '<video class="custom-embed-video" controls type="video/mp4" src="/tests/fixtures/video.mp4"></video>\n'
          + '</figure>\n',
    },
  ]);

});
