import assert from 'node:assert/strict';

import { Marked, marked } from 'marked';
import wikirefsExtension from '../../src';

import { makeMockOptsForRenderOnly } from '../config';

import type { WikiRefTestCase, TestFileData } from 'wikirefs-spec';
import { wikiRefCases, fileDataMap } from 'wikirefs-spec';

import * as wikirefs from 'wikirefs';


// setup

let env: any;
let mockOpts: any;// Partial<WikiRefsOptions>;
let md: typeof marked;

// async function run(contextMsg: string, tests: WikiRefTestCase[]): Promise<void> {
//   context(contextMsg, () => {
//     let i: number = 0;
//     for(const test of tests) {
//       const desc: string = `[${('00' + (++i)).slice(-3)}] ` + (test.descr || '');
//       it(desc, () => {
//         const mkdn: string = test.mkdn;
//         const expdHTML: string = test.html;
//         const actlHTML: string = await md(mkdn);
//         assert.strictEqual(actlHTML, expdHTML);
//       });
//     }
//   });
// }

describe('marked-wikirefs', () => {

  beforeEach(() => {
    mockOpts = makeMockOptsForRenderOnly();
    md = marked.use(wikirefsExtension());
    env = { absPath: '/tests/fixtures/file-with-wikilink.md' };
  });

  it('[[hello world]]!', async () => {
    assert.strictEqual(md('[[wikilink]]'), '<p><a href="url">fname</a></p>\n');
  });

  describe('render; mkdn -> html', () => {

    // run('wikirefs-spec', wikiRefCases);

  });

});
