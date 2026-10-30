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

  loadOrder();
  initActions();
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

async function loadOrder() {
  const transactionId = localStorage.getItem("fp_transaction_id");
  const orderIdEl = document.querySelector(".order-id");
  if (orderIdEl && transactionId) {
    orderIdEl.textContent = `Order #${transactionId}`;
  }

  if (transactionId) {
    try {
      const res = await fetch(`${API_BASE}/orders/${transactionId}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        updateTimeline(data.transaction.orderStage);
      }
    } catch (err) {
      console.error("Failed to load order:", err);
    }
  }
}

function updateTimeline(currentStage) {
  const stages = [
    "offer_accepted",
    "pickup_scheduled",
    "picked_up",
    "delivered",
    "quality_verified",
    "payment_pending",
    "payment_completed",
  ];

  stages.forEach((stage, index) => {
    const item = document.querySelector(`.timeline-item:nth-child(${index + 1})`);
    if (!item) return;
    const marker = item.querySelector(".timeline-marker");
    const step = item.querySelector(".timeline-step");

    const stageMap = {
      "offer_accepted": "Offer Accepted",
      "pickup_scheduled": "Pickup Scheduled",
      "picked_up": "Crop Collected",
      "delivered": "Delivered to Buyer",
      "quality_verified": "Quality Verified",
      "payment_pending": "Payment Pending",
      "payment_completed": "Payment Completed",
    };

    if (step) step.textContent = stageMap[stage] || stage;

    const currentIndex = stages.indexOf(currentStage);
    if (index < currentIndex) {
      item.classList.remove("active", "pending");
      item.classList.add("completed");
      if (marker) {
        marker.textContent = index + 1;
        marker.style.background = "#22c55e";
        marker.style.color = "#0a0a0a";
      }
    } else if (index === currentIndex) {
      item.classList.remove("completed", "pending");
      item.classList.add("active");
      if (marker) {
        marker.textContent = index + 1;
        marker.style.background = "#d4af37";
        marker.style.color = "#0a0a0a";
      }
    } else {
      item.classList.remove("completed", "active");
      item.classList.add("pending");
      if (marker) {
        marker.textContent = index + 1;
        marker.style.background = "transparent";
        marker.style.color = "#666";
        marker.style.border = "2px solid rgba(255,255,255,0.1)";
      }
    }
  });
}

function initActions() {
  const mapBtn = document.getElementById("trackMap");
  const contactBtn = document.getElementById("contactDriver");

  const transactionId = localStorage.getItem("fp_transaction_id");
  const user = getUser();

  if (mapBtn) {
    mapBtn.addEventListener("click", () => {
      if (transactionId) {
        alert(`Opening live tracking map for Order #${transactionId}...`);
      } else {
        alert("Opening live tracking map for Order #FP-2026-8842...");
      }
    });
  }

  if (contactBtn) {
    contactBtn.addEventListener("click", () => {
      alert("Calling driver: +91 98765 43210");
    });
  }

  const stageBtns = document.querySelectorAll(".btn-primary.btn-wide");
  const stages = [
    "pickup_scheduled",
    "picked_up",
    "delivered",
    "quality_verified",
    "payment_pending",
    "payment_completed",
  ];

  stageBtns.forEach((btn, index) => {
    if (stages[index]) {
      btn.textContent = `Update: ${stages[index].replace(/_/g, " ").toUpperCase()}`;
      btn.addEventListener("click", async () => {
        if (!transactionId) {
          alert("No active order found. Please complete a trade first.");
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/orders/${transactionId}/stage`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ stage: stages[index] }),
          });
          const data = await res.json();
          if (data.success) {
            alert(`Order stage updated to: ${stages[index].replace(/_/g, " ").toUpperCase()}`);
            updateTimeline(stages[index]);
          } else {
            alert("Failed to update: " + (data.error || "Unknown error"));
          }
        } catch (err) {
          alert("Cannot connect to backend. Make sure server is running on port 5000.");
        }
      });
    }
  });
}