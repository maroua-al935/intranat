// init_mongo_node.js
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function init() {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();
  const db = client.db("anam_db");

  // Drop collections
  await db.collection("cards").drop().catch(() => {});
  await db.collection("articles").drop().catch(() => {});
  await db.collection("users").drop().catch(() => {});

  // Insérer users
  const salt = bcrypt.genSaltSync(10);
  const users = [
    { username: "admin", password: bcrypt.hashSync("admin", salt), role: "admin", createdAt: new Date() },
    { username: "user", password: bcrypt.hashSync("user", salt), role: "user", createdAt: new Date() }
  ];
  await db.collection("users").insertMany(users);

  console.log("DB initialized!");
  await client.close();
}

init();
