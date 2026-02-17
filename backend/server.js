const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const fs = require("fs").promises;
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
let chatData = {
  messages: [],
  users: {},
};

async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8");
    chatData = JSON.parse(data);
    console.log("Данные чата загружены");
  } catch (error) {
    console.log("Создаю новый файл данных");
    await saveData();
  }
}

async function saveData() {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(chatData, null, 2));
  } catch (error) {
    console.error("Ошибка сохранения:", error);
  }
}

app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/api/messages", (req, res) => {
  res.json(chatData.messages.slice(-100));
});
io.on("connection", (socket) => {
  console.log("Новый пользователь подключился:", socket.id);
  let currentUser = null;
  socket.on("join", (username) => {
    if (!username || username.trim() === "") {
      username = `Гость_${socket.id.slice(0, 4)}`;
    }
    currentUser = username.trim();
    chatData.users[socket.id] = {
      id: socket.id,
      name: currentUser,
      online: true,
    };
    socket.emit("message-history", chatData.messages.slice(-50));
    const joinMessage = {
      id: Date.now(),
      type: "system",
      text: `${currentUser} присоединился к чату`,
      timestamp: new Date().toISOString(),
    };
    chatData.messages.push(joinMessage);
    ``;
    io.emit("new-message", joinMessage);
    saveData();
    console.log(`${currentUser} вошел в чат`);
  });
  socket.on("send-message", (text) => {
    if (!currentUser || !text || text.trim() === "") return;
    const message = {
      id: Date.now(),
      type: "user",
      user: currentUser,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    chatData.messages.push(message);
    io.emit("new-message", message);
    saveData();
    console.log(`${currentUser}: ${text}`);
  });
  socket.on("disconnect", () => {
    if (currentUser) {
      const leaveMessage = {
        id: Date.now(),
        type: "system",
        text: `${currentUser} вышел из чата`,
        timestamp: new Date().toISOString(),
      };
      chatData.messages.push(leaveMessage);
      io.emit("new-message", leaveMessage);
      saveData();
      delete chatData.users[socket.id];
      console.log(`${currentUser} вышел из чата`);
    }
  });
  socket.on("typing", (isTyping) => {
    if (currentUser) {
      socket.broadcast.emit("user-typing", {
        user: currentUser,
        isTyping,
      });
    }
  });
});

async function startServer() {
  await loadData();
  server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
  });
}

startServer();
