import {getChatGPTUser} from '../../chatgpt-auth';
import raw from '../../../lib/books-catalog.json';
import {filterBooks,type BookReference} from '../../../lib/books';
const books=raw.books as BookReference[];
export async function GET(req:Request){if(!await getChatGPTUser())return Response.json({error:'سجّل الدخول أولًا.'},{status:401});const u=new URL(req.url),q=(u.searchParams.get('q')||'').slice(0,300),offset=Math.max(0,Math.floor(Number(u.searchParams.get('offset'))||0));if(u.searchParams.get('export')==='1')return Response.json(raw,{headers:{'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="rihla-books-catalog.json"'}});const list=filterBooks(books,q,u.searchParams.get('kind')||'',u.searchParams.get('language')||'');return Response.json({books:list.slice(offset,offset+30),total:list.length,stats:raw.stats},{headers:{'Cache-Control':'private, no-store'}});}
