// Configuración
const WEBHOOK_URL =
  "https://n8n.srv1314294.hstgr.cloud/webhook-test/2b915700-f67d-45e1-80a2-bc1f737dcdf8";

let messageHistory = [];
let currentCategory = null;
let waitingForQuestion = false;

// Inicialización
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("welcomeTime").textContent = getCurrentTime();

  // Auto-ajustar altura del textarea
  const textarea = document.getElementById("chatInput");
  if (textarea) {
    textarea.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });
  }
});

// PASO 1: Seleccionar categoría
function selectCategory(category, icon) {
  // Mostrar mensaje del usuario
  addUserMessage(category);

  // Guardar categoría actual
  currentCategory = category;
  waitingForQuestion = true;

  // Ocultar sugerencias
  hideQuickSuggestions();

  // Simular que el bot está escribiendo
  showTypingIndicator();

  // Después de un delay, el bot responde
setTimeout(() => {
    hideTypingIndicator();
    addBotMessage(
      `Perfecto, has seleccionado la categoría: <strong>${currentCategory}</strong><br><br>Ahora sí, ¿cuál es tu pregunta específica sobre este tema?`
    );
    enableInput();
}, 800);
}

// PASO 2: Enviar pregunta a la IA
function sendMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();

  if (message === "") return;

  // Si no hay categoría seleccionada
  if (!currentCategory) {
    addBotMessage(
      "⚠️ Por favor, primero selecciona una categoría de las opciones disponibles.",
    );
    return;
  }

  // Agregar mensaje del usuario
  addUserMessage(message);
  input.value = "";
  input.style.height = "auto";

  // Deshabilitar input mientras se procesa
  disableInput();

  // Mostrar indicador de escritura
  showTypingIndicator();

  // Enviar a n8n con la categoría + pregunta
  sendToN8N(message);
}

// Comunicación con n8n
async function sendToN8N(userQuestion) {
  try {

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: currentCategory,
        question: userQuestion,
        conversationHistory: messageHistory.slice(-10).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
      }),
    });

    if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}

const data = await response.json();

// Validar que llegó una respuesta válida
if (!data || typeof data !== 'object') {
  throw new Error('Respuesta inválida del servidor');
}




   setTimeout(() => {
    hideTypingIndicator();
    
    // Usar la respuesta real de n8n
    const botResponse = data.response || 'Lo siento, no pude procesar tu mensaje.';
addBotMessage(botResponse);


    
    // Después de responder, preguntar si necesita algo más
    setTimeout(() => {
        addBotMessage(
          `¿Tienes alguna otra pregunta sobre <strong>${currentCategory}</strong>? También puedes <a href="#" onclick="resetCategory(); return false;">cambiar de categoría</a>.`
        );
        enableInput();
    }, 1000);
}, 800);

     
  } catch (error) {
    console.error('Error al conectar con n8n:', error);
    hideTypingIndicator();
    
    let errorMessage = 'Lo siento, ';
    if (!navigator.onLine) {
        errorMessage += 'parece que no tienes conexión a Internet.';
    } else if (error.message.includes('status: 500')) {
        errorMessage += 'hay un problema en el servidor. El equipo técnico ha sido notificado.';
    } else {
        errorMessage += 'hay un problema temporal. Por favor, intenta de nuevo.';
    }
    
    addBotMessage(errorMessage);
    enableInput();
    
    // Mantener la categoría seleccionada para que el usuario pueda reintentar
}
}

// Reiniciar para seleccionar nueva categoría
function resetCategory() {
    currentCategory = null;
    waitingForQuestion = false;
    disableInput();
    
    addBotMessage('Perfecto, selecciona una nueva categoría:');
    showCategorySuggestions();
}

// Agregar mensaje del usuario
function addUserMessage(text) {
  const chatBody = document.getElementById("chatBody");
  const time = getCurrentTime();

  const messageHTML = `
                <div class="chat-message user-message">
                    <div class="message-avatar">
                        <i class="bi bi-person-fill"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            <p>${escapeHtml(text)}</p>
                        </div>
                        <span class="message-time">${time}</span>
                    </div>
                </div>
            `;

  chatBody.insertAdjacentHTML("beforeend", messageHTML);
  scrollToBottom();

  messageHistory.push({
    role: "user",
    content: text,
    timestamp: new Date().toISOString(),
  });
}

// Agregar mensaje del bot
function addBotMessage(text) {
  const chatBody = document.getElementById("chatBody");
  const time = getCurrentTime();

  const messageHTML = `
                <div class="chat-message bot-message">
                    <div class="message-avatar">
                        <i class="bi bi-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            ${formatBotMessage(text)}
                        </div>
                        <span class="message-time">${time}</span>
                    </div>
                </div>
            `;

  chatBody.insertAdjacentHTML("beforeend", messageHTML);
  scrollToBottom();

  messageHistory.push({
    role: "bot",
    content: text,
    timestamp: new Date().toISOString(),
  });
}

// Limpiar chat
function clearChat() {
  const chatBody = document.getElementById("chatBody");
  const time = getCurrentTime();

  currentCategory = null;
  waitingForQuestion = false;
  messageHistory = [];

  chatBody.innerHTML = `
                <div class="chat-message bot-message">
                    <div class="message-avatar">
                        <i class="bi bi-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            <p>¡Hola! 👋 Soy el asistente virtual de la Facultad de Ingeniería de Sistemas.</p>
                            <p>Para ayudarte mejor, <strong>primero selecciona una categoría</strong> de las opciones a continuación:</p>
                        </div>
                        <span class="message-time">${time}</span>
                    </div>
                </div>
            `;

  showCategorySuggestions();
  disableInput();
  chatBody.scrollTop = 0;
}

// Mostrar sugerencias de categorías
function showCategorySuggestions() {
  const chatBody = document.getElementById("chatBody");
  const suggestionsHTML = `
                <div class="quick-suggestions" id="quickSuggestions">
                    <div class="suggestions-label">Selecciona una categoría:</div>
                    <button class="suggestion-chip" onclick="selectCategory('Modalidades de trabajos de grado', 'bi-mortarboard-fill')">
                        <i class="bi bi-mortarboard-fill"></i> Modalidades de trabajos de grado
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('TyT PRO / SABER PRO', 'bi-clipboard-check')">
                        <i class="bi bi-clipboard-check"></i> TyT PRO / SABER PRO
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Matrícula y Liquidación', 'bi-cash-coin')">
                        <i class="bi bi-cash-coin"></i> Matrícula / Liquidación
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Usuarios y Contraseñas', 'bi-key-fill')">
                        <i class="bi bi-key-fill"></i> Usuarios / Contraseñas
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Cambio de jornada', 'bi-calendar-week')">
                        <i class="bi bi-calendar-week"></i> Cambio de jornada
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Cambios de grupo y horarios', 'bi-clock-history')">
                        <i class="bi bi-clock-history"></i> Cambios de grupo
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Descuentos', 'bi-percent')">
                        <i class="bi bi-percent"></i> Descuentos
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Inscripciones', 'bi-pencil-square')">
                        <i class="bi bi-pencil-square"></i> Inscripciones
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Documentos de grado', 'bi-file-earmark-text')">
                        <i class="bi bi-file-earmark-text"></i> Documentos de grado
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Readmisión y Reingreso', 'bi-arrow-clockwise')">
                        <i class="bi bi-arrow-clockwise"></i> Readmisión / Reingreso
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Créditos académicos', 'bi-journal-bookmark')">
                        <i class="bi bi-journal-bookmark"></i> Créditos académicos
                    </button>
                    <button class="suggestion-chip" onclick="selectCategory('Cancelación de semestre', 'bi-x-circle')">
                        <i class="bi bi-x-circle"></i> Cancelación de semestre
                    </button>
                </div>
            `;

  chatBody.insertAdjacentHTML("beforeend", suggestionsHTML);
  scrollToBottom();
}

// Habilitar/deshabilitar input
function enableInput() {
  const input = document.getElementById("chatInput");
  const btn = document.getElementById("sendBtn");
  input.disabled = false;
  btn.disabled = false;
  input.placeholder = "Escribe tu pregunta aquí...";
  input.focus();
}

function disableInput() {
  const input = document.getElementById("chatInput");
  const btn = document.getElementById("sendBtn");
  input.disabled = true;
  btn.disabled = true;
  input.placeholder = "Primero selecciona una categoría arriba...";
}

// Utilidades
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatBotMessage(text) {
  text = text.replace(/\n/g, "<br>");
  text = text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank">$1</a>',
  );
  if (!text.includes("<br>") && !text.includes("<p>")) {
    text = `<p>${text}</p>`;
  }
  return text;
}

function scrollToBottom() {
  const chatBody = document.getElementById("chatBody");
  chatBody.scrollTop = chatBody.scrollHeight;
}

function hideQuickSuggestions() {
  const suggestions = document.getElementById("quickSuggestions");
  if (suggestions) {
    suggestions.style.display = "none";
  }
}

function showTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) {
    indicator.style.display = "flex";
  }
}

function hideTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) {
    indicator.style.display = "none";
  }
}

function handleKeyPress(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function getSessionId() {
  let sessionId = sessionStorage.getItem("chatbot_session_id");
  if (!sessionId) {
    sessionId =
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("chatbot_session_id", sessionId);
  }
  return sessionId;
}
