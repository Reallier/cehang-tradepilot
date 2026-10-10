import {sha256,toUtf8Bytes} from 'ethers';
// Identical canonical encoding in Node and browser; never a source-authenticity claim.
export const hash=value=>sha256(toUtf8Bytes(typeof value==='string'?value:JSON.stringify(value))).slice(2);
