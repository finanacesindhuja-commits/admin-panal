require('dotenv').config({ path: './.env' });
console.log('PORT:', process.env.PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'PRESENT' : 'MISSING');
console.info('STDOUT TEST');
process.stdout.write('DIRECT WRITE TEST\n');
setTimeout(() => process.exit(0), 1000);
