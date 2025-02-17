import { Database } from "bun:sqlite";
import { parseIni } from "./tools";

const db = new Database("users.sqlite");

const config = parseIni(await Bun.file("config.ini").text());

// Initialize database tables
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    nickname TEXT DEFAULT '${config.defaults.nickname}',
    response_prompt TEXT DEFAULT '${config.prompts.response_prompt}',
    classification_prompt TEXT DEFAULT '${config.prompts.classification_prompt}',
    selected_contact TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// User management functions
export async function createUser(username, password) {
  console.log("Creating user");
  try {
    const result = db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, password]
    );
    if (result.lastInsertRowid) {
      await db.run("INSERT INTO user_settings (user_id) VALUES (?)", [
        result.lastInsertRowid,
      ]);
    }
    return result.lastInsertRowid;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

export async function getUser(username) {
  return db.query("SELECT * FROM users WHERE username = ?").get(username);
}

// User settings functions
export async function getUserSettings(userId) {
  const response = db
    .query(
      "SELECT nickname, response_prompt, classification_prompt, selected_contact FROM user_settings WHERE user_id = ?",
      [userId]
    )
    .get(userId);

  if (!response) {
    return {
      nickname: config.defaults.nickname,
      response_prompt: config.prompts.response_prompt,
      classification_prompt: config.prompts.classification_prompt,
      selected_contact: null,
    };
  }
  return response;
}

export async function updateUserSettings(userId, settings) {
  const { nickname, response_prompt, classification_prompt, selected_contact } =
    settings;

  return db.run(
    "UPDATE user_settings SET nickname = ?, response_prompt = ?, classification_prompt = ?, selected_contact = ? WHERE user_id = ?",
    [nickname, response_prompt, classification_prompt, selected_contact, userId]
  );
}
