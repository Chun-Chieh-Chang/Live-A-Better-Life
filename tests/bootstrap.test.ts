import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runSystemCheckAndSetup} from '../scripts/bootstrap.ts';

test('startup checks declared dependencies without generating legacy notes or changing records', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'life-os-bootstrap-'));
  try {
    fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({dependencies:{'fixture-dependency':'1'}}));
    fs.mkdirSync(path.join(root,'node_modules/fixture-dependency'),{recursive:true});
    fs.writeFileSync(path.join(root,'.env.example'),'AGNES_API_KEY=""\n');
    fs.mkdirSync(path.join(root,'Live-A-Better-Life-Data/Notes'),{recursive:true});
    const note = path.join(root,'Live-A-Better-Life-Data/Notes/keep.md');
    fs.writeFileSync(note,'existing-user-note');
    for (const autoFix of [false,true,true]) {
      const report = runSystemCheckAndSetup(autoFix,root);
      assert.equal(report.isReady,true);
      assert.deepEqual(report.dependencies.installedPackages,['fixture-dependency']);
      assert.equal('vault' in report,false);
      for (const folder of ['01_日誌','02_模版','03_知識庫']) assert.equal(fs.existsSync(path.join(root,folder)),false);
      assert.equal(fs.readFileSync(note,'utf8'),'existing-user-note');
    }
    fs.rmdirSync(path.join(root,'node_modules/fixture-dependency'));
    assert.equal(runSystemCheckAndSetup(false,root).isReady,false);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
