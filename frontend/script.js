const socket = io(window.location.protocol + "//" + window.location.hostname, {
  transports: ["websocket", "polling"],
});
let currentUsername = "Гость";
let isTypingTimeout = null;

function joinChat() {
  const input = document.getElementById("nickname");
  const username = input.value.trim();
  if (username) {
    currentUsername = username;
  }
  document.getElementById("usernameDisplay").textContent = currentUsername;
  document.getElementById("modal").classList.remove("modal--active");
  document.getElementById("chat").style.display = "flex";
  socket.emit("join", currentUsername);
  const messageInput = document.getElementById("messageInput");
  messageInput.disabled = false;
  messageInput.focus();
  fetchMessages();
}

async function fetchMessages() {
  try {
    const response = await fetch("http://localhost:3000/api/messages");
    const messages = await response.json();
    ч;
    renderMessages(messages);
  } catch (error) {
    console.error("Ошибка загрузки сообщений:", error);
  }
}

function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
  if (text) {
    socket.emit("send-message", text);
    input.value = "";
    input.focus();
  }
}

function renderMessages(messages) {
  const container = document.getElementById("messagesContainer");
  container.innerHTML = "";
  messages.forEach((message) => {
    const messageElement = document.createElement("div");
    if (message.type === "system") {
      messageElement.className = "message system";
      messageElement.innerHTML = `
        <div class="message-text">${escapeHtml(message.text)}</div>
      `;
    } else if (message.user === currentUsername) {
      messageElement.className = "message user";
      messageElement.innerHTML = `
        <div class="message-header">
          <span class="message-user">Вы</span>
          <span class="message-time">${formatTime(message.timestamp)}</span>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
      `;
    } else {
      messageElement.className = "message other";
      messageElement.innerHTML = `
        <div class="message-header">
          <span class="message-user">${escapeHtml(message.user)}</span>
          <span class="message-time">${formatTime(message.timestamp)}</span>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
      `;
    }
    container.appendChild(messageElement);
  });
  container.scrollTop = container.scrollHeight;
}

socket.on("new-message", (message) => {
  const container = document.getElementById("messagesContainer");
  const messageElement = document.createElement("div");
  if (message.type === "system") {
    messageElement.className = "message system";
    messageElement.innerHTML = `
      <div class="message-text">${escapeHtml(message.text)}</div>
    `;
  } else if (message.user === currentUsername) {
    messageElement.className = "message user";
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-user">Вы</span>
        <span class="message-time">${formatTime(message.timestamp)}</span>
      </div>
      <div class="message-text">${escapeHtml(message.text)}</div>
    `;
  } else {
    messageElement.className = "message other";
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-user">${escapeHtml(message.user)}</span>
        <span class="message-time">${formatTime(message.timestamp)}</span>
      </div>
      <div class="message-text">${escapeHtml(message.text)}</div>
    `;
  }
  container.appendChild(messageElement);
  container.scrollTop = container.scrollHeight;
});
socket.on("message-history", (messages) => {
  renderMessages(messages);
});
socket.on("user-typing", ({ user, isTyping }) => {
  const indicator = document.getElementById("typingIndicator");

  if (isTyping && user !== currentUsername) {
    indicator.textContent = `${user} печатает...`;
  } else {
    indicator.textContent = "";
  }
});
document.getElementById("messageInput")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});
document.getElementById("messageInput")?.addEventListener("input", () => {
  socket.emit("typing", true);
  clearTimeout(isTypingTimeout);
  isTypingTimeout = setTimeout(() => {
    socket.emit("typing", false);
  }, 1000);
});

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

document.getElementById("nickname")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    joinChat();
  }
});
window.joinChat = joinChat;
window.sendMessage = sendMessage;
