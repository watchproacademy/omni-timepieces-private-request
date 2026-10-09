import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serverEnvironment} from '../../src/lib/server/environment';
test('production refuses demo acceptance or incomplete service configuration',()=>{
 const original={...process.env};try{process.env.VERCEL_ENV='production';process.env.WATCH_REQUEST_PREVIEW_MODE='true';assert.throws(serverEnvironment,/forbidden/);process.env.WATCH_REQUEST_PREVIEW_MODE='false';delete process.env.DATABASE_URL;assert.throws(serverEnvironment,/Missing server configuration/);}finally{for(const key of Object.keys(process.env))if(!(key in original))delete process.env[key];Object.assign(process.env,original);}
});
