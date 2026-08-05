import assert from 'node:assert/strict';

import type { WikiRefsOptions } from '../src/lib/types';
import { buildMd } from './setup';


// metadata suite: the addAttr / addLink / addEmbed option functions. these hooks assert on
// CAPTURED CALLBACK ARGUMENTS (not rendered html), so each case names the hook to wire, the
// mkdn to render, and the expected recorded call args. the header passed to addLink/addEmbed
// is the RAW header text (unslugified) — the slug is applied only when building the href
// fragment — and both are always called with a (possibly undefined) trailing header slot.

interface MetaCase {
  descr: string;
  reason?: string;                             // assert message — surfaced on mismatch
  hook: 'addAttr' | 'addLink' | 'addEmbed';    // metadata option function under test
  mkdn: string;                                // markdown input
  calls: unknown[][];                          // expected captured call arg-tuples
}

function run(tests: MetaCase[]): void {
  for (const test of tests) {
    it(test.descr, async () => {
      const calls: unknown[][] = [];
      const capture = (...args: unknown[]): void => { calls.push(args); };
      await buildMd({ [test.hook]: capture } as Partial<WikiRefsOptions>)(test.mkdn);
      assert.deepStrictEqual(calls, test.calls, test.reason);
    });
  }
}

describe('config; metadata', () => {

  run([
    {
      descr: 'addAttr',
      hook: 'addAttr',
      mkdn: ':attrtype::[[fname-a]]\n',
      calls: [['attrtype', 'fname-a']],
    },
    {
      descr: 'addLink',
      reason: 'typed link so a non-empty linktype is passed through',
      hook: 'addLink',
      mkdn: ':linktype1::[[fname-a]].',
      calls: [['linktype1', 'fname-a', undefined]],
    },
    {
      descr: 'addLink; w/ header',
      reason: 'raw (unslugified) header in the trailing slot',
      hook: 'addLink',
      mkdn: ':linktype1::[[fname-a#header-text]].',
      calls: [['linktype1', 'fname-a', 'header-text']],
    },
    {
      descr: 'addEmbed',
      hook: 'addEmbed',
      mkdn: '![[fname-a]]\n',
      calls: [['fname-a', undefined]],
    },
    {
      descr: 'addEmbed; w/ header',
      reason: 'raw (unslugified) header in the trailing slot',
      hook: 'addEmbed',
      mkdn: '![[fname-a#header-text]]\n',
      calls: [['fname-a', 'header-text']],
    },
  ]);

});
