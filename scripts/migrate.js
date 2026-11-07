import {readFile} from 'node:fs/promises';
import {database} from '../server/database.js';
const sql=await readFile(new URL('../db/001_init.sql',import.meta.url),'utf8');
try {await database().query(sql);console.log('OpenShield database schema ready.')}
finally {await database().end()}
