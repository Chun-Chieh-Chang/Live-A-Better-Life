import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

test('development server denies private local data and tools over HTTP', async () => {
  const files: string[] = [];
  const server = await createServer({server: {host:'127.0.0.1',port:0,strictPort:false}, logLevel:'silent'});
  try {
    await server.listen();
    const address = server.httpServer!.address() as {port:number};
    for (const directory of ['Live-A-Better-Life-Data','Live-A-Better-Life-Tools']) {
      mkdirSync(directory,{recursive:true});
      const name = '.http-deny-test-'+randomUUID()+'.txt';
      const file = path.resolve(directory,name); files.push(file);
      writeFileSync(file,'public-test-marker');
      for (const route of ['/'+directory+'/'+name, '/@fs/'+file.replaceAll('\\','/')]) {
        const response = await fetch('http://127.0.0.1:'+address.port+route);
        assert.equal(response.status,403,'Private folder must not be served');
      }
    }
  } finally { await server.close(); for (const file of files) unlinkSync(file); }
});
