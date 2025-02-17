import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import session from "express-session";
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode";
import { getUserSettings, updateUserSettings, getUser, createUser } from "./db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Create session middleware
const sessionMiddleware = session({
  secret: "your-secret-key",
  resave: false,
  saveUninitialized: false,
});

app.use(sessionMiddleware);

// Initialize Socket.IO with session support
const io = new Server(server);
io.engine.use(sessionMiddleware);

app.use(express.json());

// Get WhatsApp contacts
app.get("/api/contacts", async (req, res) => {
  if (!req.session.authenticated) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const username = req.session.username;
  const client = clients.get(username);

  if (!client) {
    res.status(404).json({ error: "WhatsApp client not found" });
    return;
  }

  try {
    let contacts = await client.getContacts();
    contacts = contacts.filter((contact) => contact.id.server !== "lid");
    const formattedContacts = contacts.map((contact) => ({
      id: contact.id._serialized,
      name: contact.name || contact.pushname || contact.number || "Unknown",
      number: contact.number || "",
    }));
    res.json(formattedContacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

// Settings API endpoints
app.get("/api/settings", (req, res) => {
  if (!req.session.authenticated) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const userId = req.session.userId;
  getUserSettings(userId)
    .then((settings) => res.json(settings || {}))
    .catch((error) =>
      res.status(500).json({ error: "Failed to load settings" })
    );
});

app.post("/api/settings", (req, res) => {
  if (!req.session.authenticated) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const userId = req.session.userId;
  console.log(userId);
  updateUserSettings(userId, req.body)
    .then(() => res.json({ success: true }))
    .catch((error) =>
      res.status(500).json({ error: "Failed to update settings" })
    );
});

// Mock user credentials (replace with a proper database)
const users = {
  admin: "333",
  bennet: "ligmaballs",
};

// Store active WhatsApp clients and their QR codes
const clients = new Map();
const qrCodes = new Map();
const connectionStatus = new Map();

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (users[username] && users[username] === password) {
    // Check if user exists in database
    let user = await getUser(username);

    // If user doesn't exist in database, create them
    if (!user) {
      const userId = await createUser(username, password);
      if (!userId) {
        res.status(500).json({ error: "Failed to create user" });
        return;
      }
      user = { id: userId, username };
    }

    req.session.authenticated = true;
    req.session.username = username;
    req.session.userId = user.id;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.get(["/qr", "/qr.html"], (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/");
    return;
  }
  res.sendFile(join(__dirname, "public", "qr.html"));
});

app.get(["/settings", "/settings.html"], (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/");
    return;
  }
  res.sendFile(join(__dirname, "public", "settings.html"));
});

app.use(express.static("public"));

if (!process.env.GEMINI_API_KEY) {
  console.error("Please add your Gemini API key to .env file");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

async function classifyMessage(message, userId, chatContext) {
  const userSettings = await getUserSettings(userId);
  if (!userSettings) {
    console.log("No user settings found");
    return false;
  }
  const contextString = chatContext.map((msg) => `"${msg}"`).join("\n");
  const prompt = `Kontext der letzten Nachrichten:\n${contextString}\n\n${userSettings.classification_prompt.replace(
    "{message}",
    message
  )}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().toLowerCase().trim();
  console.log(text);
  return text === "true";
}

async function generateResponse(message, userId, chatContext) {
  const userSettings = await getUserSettings(userId);
  const nickname = userSettings?.nickname;
  const contextString = chatContext.map((msg) => `"${msg}"`).join("\n");
  const customPrompt = `Kontext der letzten Nachrichten:\n${contextString}\n\n${userSettings.response_prompt.replace(
    "{message}",
    message
  )} ${
    nickname
      ? "Verwenden Sie manchmal den Spitznamen " +
        nickname +
        ". Verwenden Sie keinen anderen Spitznamen!!!! und verwenden Sie den Spitznamen nur in seltenen Fällen."
      : "Verwenden sie keine Spitznamen!!!!!"
  }`;

  const result = await model.generateContent(customPrompt);
  return result.response.text();
}

io.on("connection", (socket) => {
  const session = socket.request.session;
  if (!session?.authenticated) {
    socket.disconnect();
    return;
  }

  const username = socket.request.session.username;
  const userId = socket.request.session.userId;
  let client = clients.get(username);

  console.log(
    `Client ${username} connected with ${
      client ? "existing client" : "new client"
    }`
  );

  if (!client) {
    client = new Client({
      authStrategy: new LocalAuth({ clientId: username }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox"],
      },
    });

    client.on("qr", async (qrContent) => {
      console.log(`Client ${username} received QR code`);
      try {
        const qrImageUrl = await qrcode.toDataURL(qrContent);
        qrCodes.set(username, qrImageUrl);
        connectionStatus.set(username, "connecting");
        socket.emit("qr", qrImageUrl);
      } catch (error) {
        socket.emit("error", "Failed to generate QR code");
      }
    });

    client.on("ready", () => {
      console.log(`Client ${username} is authenticated!`);
      socket.emit("ready");
      connectionStatus.set(username, "ready");
    });

    client.on("disconnected", () => {
      console.log(`Client ${username} disconnected`);
      socket.emit("disconnected");
      clients.delete(username);
      qrCodes.delete(username);
      connectionStatus.set(username, "disconnected");
    });

    client.on("message_create", async (message) => {
      try {
        console.log(`[${message.from}] ${message.body}`);

        // Get user settings to check selected contact
        const userSettings = await getUserSettings(userId);
        if (
          !userSettings?.selected_contact ||
          message.from !== userSettings.selected_contact
        ) {
          console.log(
            `Message not from selected contact (${userSettings?.selected_contact}), ignoring`
          );
          return;
        }

        // Fetch the last 10 messages from the chat
        const chat = await message.getChat();
        const messages = await chat.fetchMessages({ limit: 10 });
        const chatContext = messages.map((msg) => msg.body);

        const isStupidQuestion = await classifyMessage(
          message.body,
          userId,
          chatContext
        );
        console.log(
          `The Question is ${isStupidQuestion ? "Stupid" : "Not Stupid"}`
        );
        if (isStupidQuestion) {
          const response = await generateResponse(
            message.body,
            userId,
            chatContext
          );
          console.log("Generated a response");
          await message.reply(response);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    clients.set(username, client);
    connectionStatus.set(username, "qr");
    client.initialize().catch((error) => {
      socket.emit("error", "Failed to initialize WhatsApp client");
    });
  } else {
    switch (connectionStatus.get(username)) {
      case "connecting":
        socket.emit("qr", qrCodes.get(username));
        break;
      case "ready":
        socket.emit("ready");
        break;
      case "disconnected":
        socket.emit("disconnected");
        break;
      case "qr":
        //socket.emit("waiting");
        break;
      default:
        console.log(
          `Client ${username} has unknown connection status ${connectionStatus.get(
            username
          )}`
        );
        socket.emit("error", "Unknown connection status");
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
