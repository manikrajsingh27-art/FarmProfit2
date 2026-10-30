const API_BASE = "/api";

function getUser() {
  try { return JSON.parse(localStorage.getItem("fp_user") || "null"); } catch { return null; }
}

function getHeaders() {
  const user = getUser();
  return {
    "Content-Type": "application/json",
    "x-user-id": user ? user.id : "",
    "x-user-role": user ? user.role : "",
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initStickyNav();
  loadMatchingBuyers();
});

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

function initStickyNav() {
  const nav = document.querySelector(".nav");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  });
}

async function loadMatchingBuyers() {
  const grid = document.querySelector(".buyers-grid");
  if (!grid) return;

  const stored = localStorage.getItem("fp_matching_buyers");
  if (stored) {
    renderBuyers(JSON.parse(stored));
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/buyers`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (data.success && data.buyers && data.buyers.length > 0) {
      renderBuyers(data.buyers);
    }
    // If API returns empty, keep the hardcoded HTML cards already in the page
  } catch (err) {
    console.error("Failed to load buyers from API:", err);
    // Keep the hardcoded HTML cards already in the page
  }
}

function renderBuyers(buyers) {
  const grid = document.querySelector(".buyers-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (!buyers || buyers.length === 0) {
    grid.innerHTML = "<p style='color:#a1a1aa; text-align:center; padding:2rem;'>No matching buyers found.</p>";
    return;
  }

  buyers.forEach((buyer) => {
    const card = document.createElement("div");
    card.className = "buyer-card";
    card.innerHTML = `
      <div class="buyer-header">
        <div class="buyer-avatar">${buyer.buyerName.charAt(0).toUpperCase()}</div>
        <div class="buyer-info">
          <div class="buyer-name">${buyer.buyerName}</div>
          <div class="buyer-verified">${buyer.verified ? "Verified Buyer" : "Basic Verified"}</div>
        </div>
        <div class="buyer-distance">${buyer.location ? buyer.location.split(",")[0] : "Unknown"} away</div>
      </div>
      <div class="buyer-body">
        <div class="offer-row">
          <span class="offer-label">Offered Price</span>
          <span class="offer-value">₹${buyer.maxPrice || "N/A"} / quintal</span>
        </div>
        <div class="offer-row">
          <span class="offer-label">Required Quantity</span>
          <span class="offer-value">${buyer.requiredQuantity} quintals</span>
        </div>
        <div class="offer-row">
          <span class="offer-label">Quality Requirement</span>
          <span class="offer-value">${buyer.qualityRequirement}</span>
        </div>
        <div class="offer-row">
          <span class="offer-label">Pickup Date</span>
          <span class="offer-value">${buyer.deadline || "Flexible"}</span>
        </div>
        <div class="offer-row">
          <span class="offer-label">Estimated Payment</span>
          <span class="offer-value">Within 48 hours</span>
        </div>
      </div>
      <div class="buyer-footer">
        <div class="trust-info">
          <span class="trust-badge">Batch: V-${Math.floor(Math.random() * 9000 + 1000)}</span>
          <span class="trust-score">Reliability 4.${Math.floor(Math.random() * 9)}★</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="msgBuyer('${buyer.id}', '${buyer.buyerName}', '${buyer.role || 'buyer'}')">Message</button>
        <button class="btn btn-ghost btn-sm" onclick="viewBuyerDetail('${buyer.id}')">View Details</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

window.viewBuyerDetail = (buyerId) => {
  localStorage.setItem("fp_selected_buyer", buyerId);
  window.location.href = "buyer-detail.html";
};

window.msgBuyer = (buyerId, buyerName, buyerRole) => {
  const user = getUser();
  if (!user) {
    alert("Please log in first.");
    window.location.href = "index.html";
    return;
  }
  localStorage.setItem("fp_msg_receiver_id", buyerId);
  localStorage.setItem("fp_msg_receiver_name", buyerName);
  localStorage.setItem("fp_msg_receiver_role", buyerRole);
  window.location.href = "messages.html";
};