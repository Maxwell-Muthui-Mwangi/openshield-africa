import pg from 'pg';
import {databaseConfig} from './db-config.js';
const {Pool}=pg;
let pool;
export function database(){
 if(!pool){
  const {config}=databaseConfig();
  pool=new Pool(config);
 }
 return pool;
}
export async function query(sql,values=[]){return database().query(sql,values)}
