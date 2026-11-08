import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
export function encryptionKey(env=process.env){
 const value=env.OUTBOX_ENCRYPTION_KEY;
 if(!/^[a-f0-9]{64}$/i.test(value||''))throw Error('OUTBOX_ENCRYPTION_KEY must be 32 bytes encoded as 64 hexadecimal characters.');
 return Buffer.from(value,'hex');
}
export function encryptMessage(message,key=encryptionKey()){
 const iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key,iv);
 const payload=Buffer.concat([cipher.update(JSON.stringify(message),'utf8'),cipher.final()]);
 return {payload,iv,authTag:cipher.getAuthTag()};
}
export function decryptMessage(record,key=encryptionKey()){
 const decipher=createDecipheriv('aes-256-gcm',key,record.iv);
 decipher.setAuthTag(record.auth_tag);
 return JSON.parse(Buffer.concat([decipher.update(record.payload),decipher.final()]).toString('utf8'));
}
