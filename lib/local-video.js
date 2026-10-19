import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const exec=promisify(execFile);
export async function renderVideo(images,outputDir) {
  if(!Array.isArray(images)||images.length<1||images.length>8)throw Error('Нужно 1–8 фотографий.');
  const decoded=images.map(value=>{
    if(typeof value!=='string'||!/^data:image\/(jpeg|png);base64,/.test(value))throw Error('Только JPEG и PNG.');
    const body=Buffer.from(value.split(',')[1],'base64');
    if(body.length>5000000||body.length<8)throw Error('Фотография должна быть меньше 5 МБ.');
    const png=body.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg=body[0]===255&&body[1]===216&&body[2]===255;
    if(!png&&!jpg)throw Error('Содержимое файла не JPEG/PNG.');
    return {body,ext:png?'png':'jpg'};
  });
  await mkdir(outputDir,{recursive:true});
  const temp=await mkdtemp(path.join(outputDir,'job-'));
  const filename=randomUUID()+'.mp4';const final=path.join(outputDir,filename);
  try {
    const segments=[];
    for(let i=0;i<decoded.length;i++){
      const source=path.join(temp,`image-${i}.${decoded[i].ext}`);const segment=path.join(temp,`clip-${i}.mp4`);
      await writeFile(source,decoded[i].body);
      await exec(process.env.FFMPEG_PATH||'ffmpeg',['-nostdin','-y','-loop','1','-i',source,'-t','5','-vf','scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1','-r','25','-c:v','libx264','-preset','ultrafast','-threads','2','-pix_fmt','yuv420p',segment],{timeout:60000,windowsHide:true,maxBuffer:1000000});
      segments.push(`file 'clip-${i}.mp4'`);
    }
    await writeFile(path.join(temp,'list.txt'),segments.join('\n'));
    await exec(process.env.FFMPEG_PATH||'ffmpeg',['-nostdin','-y','-f','concat','-safe','1','-i',path.join(temp,'list.txt'),'-c','copy','-movflags','+faststart',final],{timeout:30000,windowsHide:true,maxBuffer:1000000});
    return filename;
  }catch {await rm(final,{force:true});throw Error('FFmpeg не собрал видео. Проверьте фотографии и установку FFmpeg.');}
  finally {await rm(temp,{recursive:true,force:true});}
}
