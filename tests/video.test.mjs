import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {renderVideo} from '../lib/local-video.js';
const exec=promisify(execFile);
test('video rejects invalid images before invoking FFmpeg',async()=>{
  await assert.rejects(renderVideo([], 'output'),/1–8/);
  await assert.rejects(renderVideo(['data:image/png;base64,aGVsbG8='],'output'));
});
test('FFmpeg produces a real 5-second vertical MP4 from a local test image', {skip:!process.env.FFMPEG_PATH}, async()=>{
  const out=path.resolve('output/video-test');await mkdir(out,{recursive:true});const png=path.join(out,'test.png');
  await exec(process.env.FFMPEG_PATH,['-nostdin','-y','-f','lavfi','-i','color=c=teal:s=64x64','-frames:v','1',png],{windowsHide:true});
  const filename=await renderVideo(['data:image/png;base64,'+(await readFile(png)).toString('base64')],out);
  const video=path.join(out,filename);assert.ok((await stat(video)).size>1000);
  const {stderr}=await exec(process.env.FFMPEG_PATH,['-nostdin','-i',video,'-f','null','-'],{windowsHide:true});
  assert.match(stderr,/720x1280/);assert.match(stderr,/Duration: 00:00:05/);
});
