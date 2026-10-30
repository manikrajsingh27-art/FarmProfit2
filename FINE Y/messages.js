const API_BASE = "/api";

function getUser() {
  try { return JSON.parse(localStorage.getItem("fp_user") || "null"); } catch { return null; }
}

function getHeaders() {
  const user = getUser();
  return {
    "x-user-id": user ? user.id : "",
    "x-user-role": user ? user.role : "",
  };
}

let currentConversation = null;
let messagesInterval = null;

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -80px 0px" });

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  const user = getUser();
  if (!user) {
    alert("Please log in first.");
    window.location.href = "index.html";
    return;
  }

  // Role-based navigation
  const navLinks = document.querySelectorAll(".nav-actions a, .nav-actions button");
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const text = link.textContent || "";
    if (user.role === "farmer" && (href.includes("buyer-dashboard") || text.includes("Buyer Dashboard"))) {
      link.style.display = "none";
    }
    if (user.role === "buyer" && (href.includes("farmer-dashboard") || text.includes("Farmer Dashboard"))) {
      link.style.display = "none";
    }
  });

  // Auto-prefill receiver if coming from a profile page
  const prefillReceiverId = localStorage.getItem("fp_msg_receiver_id");
  const prefillReceiverName = localStorage.getItem("fp_msg_receiver_name");
  const prefillReceiverRole = localStorage.getItem("fp_msg_receiver_role");

  if (prefillReceiverId && prefillReceiverName) {
    localStorage.removeItem("fp_msg_receiver_id");
    localStorage.removeItem("fp_msg_receiver_name");
    localStorage.removeItem("fp_msg_receiver_role");
    currentConversation = { otherUserId: prefillReceiverId, otherUserName: prefillReceiverName };
    document.getElementById("convTitle").textContent = prefillReceiverName;
    document.getElementById("convSub").textContent = `Messaging with ${prefillReceiverName}`;
    document.getElementById("messageForm").style.display = "block";
    document.getElementById("msgReceiverId").value = prefillReceiverId;
    document.getElementById("msgReceiverRole").value = prefillReceiverRole;
    document.getElementById("messagesContainer").innerHTML = `
      <div class="messages-empty"><p>No messages yet. Start the conversation!</p></div>
    `;
    loadMessages(prefillReceiverId);
    return;
  }

  loadConversations();
  startPolling();

  document.getElementById("newMsgBtn").addEventListener("click", () => {
    currentConversation = null;
    document.querySelectorAll(".conversation-item").forEach((el) => el.classList.remove("active"));
    document.getElementById("convTitle").textContent = "New Message";
    document.getElementById("convSub").textContent = "Start a new conversation";
    document.getElementById("messagesContainer").innerHTML = `
      <div class="messages-empty">
        <p style="color: var(--text-muted);">Select a farmer or buyer to message</p>
      </div>
    `;
    document.getElementById("messageForm").style.display = "none";
    loadUsersForNewMessage();
  });

  document.getElementById("messageForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = getUser();
    if (!user) return;

    const receiverId = document.getElementById("msgReceiverId").value;
    const receiverRole = document.getElementById("msgReceiverRole").value;
    const subject = document.getElementById("msgSubject").value;
    const body = document.getElementById("msgBody").value;
    const cropId = document.getElementById("msgCropId").value || null;
    const offerId = document.getElementById("msgOfferId").value || null;

    if (!receiverId || !body) {
      alert("Please select a recipient and type a message.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          receiverId,
          receiverRole,
          senderName: user.name || "User",
          subject,
          message: body,
          cropId,
          offerId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById("msgBody").value = "";
        if (currentConversation) {
          loadMessages(currentConversation.otherUserId);
        } else {
          loadConversations();
        }
      } else {
        alert("Failed to send message: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Cannot connect to backend.");
    }
  });
});

function startPolling() {
  if (messagesInterval) clearInterval(messagesInterval);
  messagesInterval = setInterval(() => {
    if (currentConversation) {
      loadMessages(currentConversation.otherUserId);
    }
    loadConversations();
  }, 5000);
}

async function loadConversations() {
  try {
    const res = await fetch(`${API_BASE}/messages/conversations`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    const container = document.getElementById("convList");
    const emptyState = document.getElementById("emptyState");

    if (!data.success || !data.conversations || data.conversations.length === 0) {
      container.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";
    container.innerHTML = data.conversations.map((conv) => `
      <div class="conversation-item ${currentConversation && currentConversation.otherUserId === conv.otherUserId ? "active" : ""}" onclick="selectConversation('${conv.otherUserId}', '${conv.otherUserName}', this)">
        <div class="conv-avatar">${conv.otherUserName.charAt(0).toUpperCase()}</div>
        <div class="conv-info">
          <div class="conv-name">${conv.otherUserName}</div>
          <div class="conv-preview">${conv.lastMessage || "No messages yet"}</div>
          ${conv.unreadCount > 0 ? `<div class="unread-badge">${conv.unreadCount}</div>` : ""}
        </div>
        <div class="conv-meta">${new Date(conv.lastMessageAt).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}</div>
      </div>
    `).join("");
  } catch (err) {
    console.error("Failed to load conversations:", err);
  }
}

async function loadUsersForNewMessage() {
  const user = getUser();
  try {
    const res = await fetch(`${API_BASE}/buyers`, { headers: getHeaders() });
    const data = await res.json();
    let users = [];
    if (data.success && data.buyers) {
      users = users.concat(data.buyers.map((b) => ({ id: b.userId || b.id, name: b.buyerName || "Buyer", role: "buyer" })));
    }

    const res2 = await fetch(`${API_BASE}/crops`, { headers: getHeaders() });
    const data2 = await res2.json();
    if (data2.success && data2.crops) {
      const farmerIds = [...new Set(data2.crops.map((c) => c.farmerId))];
      farmerIds.forEach((fid) => {
        const crop = data2.crops.find((c) => c.farmerId === fid);
        users.push({ id: fid, name: crop.farmerName || "Farmer", role: "farmer" });
      });
    }

    users = users.filter((u) => u.id !== user.id);
    users = users.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

    const container = document.getElementById("messagesContainer");
    if (users.length === 0) {
      container.innerHTML = `<div class="messages-empty"><p>No users available to message.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div style="padding: 1.5rem;">
        <h3 style="color: var(--text); margin-bottom: 1rem;">Select a user to message</h3>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${users.map((u) => `
            <button class="btn btn-ghost btn-wide" style="text-align: left;" onclick="startNewConversation('${u.id}', '${u.name}', '${u.role}')">
              ${u.name} (${u.role})
            </button>
          `).join("")}
        </div>
      </div>
    `;
    document.getElementById("messageForm").style.display = "none";
  } catch (err) {
    console.error("Failed to load users:", err);
  }
}

function selectConversation(otherUserId, otherUserName, el) {
  currentConversation = { otherUserId, otherUserName };
  document.getElementById("convTitle").textContent = otherUserName;
  document.getElementById("convSub").textContent = `Messaging with ${otherUserName}`;
  document.querySelectorAll(".conversation-item").forEach((node) => node.classList.remove("active"));
  if (el) el.classList.add("active");
  document.getElementById("messageForm").style.display = "block";
  document.getElementById("msgReceiverId").value = otherUserId;
  document.getElementById("msgReceiverRole").value = otherUserId.includes("farmer") ? "farmer" : "buyer";
  loadMessages(otherUserId);
}

function startNewConversation(userId, userName, role) {
  currentConversation = { otherUserId: userId, otherUserName: userName };
  document.getElementById("convTitle").textContent = userName;
  document.getElementById("convSub").textContent = `New conversation with ${userName}`;
  document.getElementById("messageForm").style.display = "block";
  document.getElementById("msgReceiverId").value = userId;
  document.getElementById("msgReceiverRole").value = role;
  document.getElementById("messagesContainer").innerHTML = `
    <div class="messages-empty"><p>No messages yet. Start the conversation!</p></div>
  `;
}

async function loadMessages(otherUserId) {
  if (!otherUserId) return;
  try {
    const res = await fetch(`${API_BASE}/messages?otherUserId=${otherUserId}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    const container = document.getElementById("messagesContainer");
    const user = getUser();

    if (!data.success || !data.messages || data.messages.length === 0) {
      container.innerHTML = `<div class="messages-empty"><p>No messages yet. Start the conversation!</p></div>`;
      return;
    }

    container.innerHTML = data.messages.map((msg) => {
      const isSent = msg.senderId === user.id;
      return `
        <div class="message-bubble ${isSent ? "sent" : "received"}">
          ${msg.subject ? `<span class="message-subject">${msg.subject}</span>` : ""}
          ${msg.message}
          <div class="message-meta">${new Date(msg.createdAt).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})} ${isSent ? "• sent" : "• received"}</div>
        </div>
      `;
    }).join("");
    container.scrollTop = container.scrollHeight;

    // Mark messages as read
    data.messages.forEach((msg) => {
      if (msg.receiverId === user.id && msg.status === "unread") {
        fetch(`${API_BASE}/messages/${msg.id}/read`, {
          method: "POST",
          headers: getHeaders(),
        });
      }
    });
  } catch (err) {
    console.error("Failed to load messages:", err);
  }
}