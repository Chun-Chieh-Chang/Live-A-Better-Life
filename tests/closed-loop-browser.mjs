import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
fs.mkdirSync('Live-A-Better-Life-Data/Acceptance/browser/closed-loop',{recursive:true});
try{
const context=await browser.newContext({viewport:{width:390,height:1000}});const page=await context.newPage();
await page.goto('http://127.0.0.1:3000');
await page.evaluate(()=>{const date=new Date();const today=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');localStorage.setItem('life_os_data_v2',JSON.stringify({version:2,data:{entries:[],personalOS:{ifThenStrategies:[{id:'browser-test',ifText:'卡住',thenText:'先做一分鐘',active:true,observations:[{date:'2026-01-01',outcome:'unhelpful'},{date:'2026-01-02',outcome:'unhelpful'}]}],habitQuestions:[],emergencyRecipes:[],avoidanceGuides:[]}}}));});
await page.reload();const panel=page.getByRole('region',{name:'方法的嘗試結果'});
await panel.getByRole('button',{name:'試過，沒幫助',exact:true}).click();await panel.getByText('先休息一下 · 暫不提醒',{exact:false}).waitFor();
await page.reload();await panel.getByText('先休息一下 · 暫不提醒',{exact:false}).waitFor();
await panel.getByRole('button',{name:'試過，有幫助',exact:true}).click();await panel.getByText('再試試看 · 每天提醒',{exact:false}).waitFor();
await page.reload();await panel.getByText('再試試看 · 每天提醒',{exact:false}).waitFor();
await panel.screenshot({path:'Live-A-Better-Life-Data/Acceptance/browser/closed-loop/feedback-390.png'});await context.close();console.log('PASS feedback: automatic pause, correction, persistence after reload');
}finally{await browser.close();}
