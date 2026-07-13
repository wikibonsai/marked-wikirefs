import { wikiRefCases, wikiAttrWithoutCAML } from 'wikirefs-spec';

import type { MdFn } from './setup';
import { buildMd, run, applyExpectedOverrides } from './setup';


// wikirefs render suite. Runs the full wikiRefCases (attrs + links + embeds) +
// wikiAttrWithoutCAML (the caml-absent attr set — wikirefs handles the wikiattr
// primitive itself here).

let md: MdFn;

describe('marked-wikirefs: render', () => {

  before(applyExpectedOverrides);

  beforeEach(() => {
    md = buildMd();
  });

  describe('render; mkdn -> html', () => {

    run(() => md, 'wikirefs-spec', wikiRefCases);
    run(() => md, 'wiki attrs (no caml — wikirefs handles the primitive)', wikiAttrWithoutCAML);

  });

});
