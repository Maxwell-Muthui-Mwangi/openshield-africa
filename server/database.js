import pg from 'pg';
const {Pool}=pg;
let pool;
export function database(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required for authenticated storage.');
 if(!pool)pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:5000,ssl:process.env.DATABASE_SSL==='require'?{rejectUnauthorized:true}:undefined});
 return pool;
}
export async function query(sql,values=[]){return database().query(sql,values)}
