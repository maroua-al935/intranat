const bcrypt = require('bcryptjs');

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const password = process.env.HASH_PASSWORD;
if (!password) {
  throw new Error('Set HASH_PASSWORD before running this script.');
}

bcrypt.hash(password, 10).then(hash => {
  console.log(hash);
});
