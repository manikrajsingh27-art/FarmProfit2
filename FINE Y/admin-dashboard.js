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

  initAdminActions();
  loadStats();
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

async function loadStats() {
  try {
    const [cropsRes, buyersRes, ordersRes] = await Promise.all([
      fetch(`${API_BASE}/crops`, { headers: getHeaders() }),
      fetch(`${API_BASE}/buyers`, { headers: getHeaders() }),
      fetch(`${API_BASE}/orders`, { headers: getHeaders() }),
    ]);

    const cropsData = await cropsRes.json();
    const buyersData = await buyersRes.json();
    const ordersData = await ordersRes.json();

    const statValues = document.querySelectorAll(".stat-value");
    if (statValues[0]) statValues[0].textContent = buyersData.count || 0;
    if (statValues[2]) statValues[2].textContent = cropsData.count || 0;
    if (statValues[3]) statValues[3].textContent = ordersData.count || 0;
  } catch (err) {
    console.error("Failed to load admin stats:", err);
  }
}

function initAdminActions() {
  const btns = document.querySelectorAll(".admin-card .btn-primary");
  const labels = {
    "Add Buyer": "Add Demo Buyers",
    "Set Rates": "Add Transport Rates",
    "Add Provider": "Add Storage Provider",
    "Update Prices": "Add Market Prices",
    "Verify Users": "Verify Users",
    "View Transactions": "View Transactions",
    "View Totals": "View Produce Matched",
    "View Report": "View Waste Reduction Report"
  };

  btns.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const label = btn.textContent.trim();

      try {
        if (label === "View Transactions") {
          const res = await fetch(`${API_BASE}/orders`, {
            headers: getHeaders(),
          });
          const data = await res.json();
          alert(`Total Transactions: ${data.count || 0}\n` + (data.orders || []).map((o) => `- Order ${o.id}: ${o.orderStage}`).join("\n"));
        } else if (label === "View Totals") {
          const res = await fetch(`${API_BASE}/crops`, {
            headers: getHeaders(),
          });
          const data = await res.json();
          alert(`Total Produce Listed: ${data.count || 0} crop listings`);
        } else if (label === "Add Buyer") {
          alert("Add Demo Buyers feature - use POST /api/buyers/requirements");
        } else if (label === "Set Rates") {
          alert("Add Transport Rates feature - configure logistics pricing");
        } else if (label === "Add Provider") {
          alert("Add Storage Provider feature - register warehouse partners");
        } else if (label === "Update Prices") {
          alert("Add Market Prices feature - update commodity rate cards");
        } else if (label === "Verify Users") {
          alert("Verify Users feature - approve KYC and documents");
        } else if (label === "View Report") {
          alert("View Waste Reduction Report feature - view estimated waste prevented");
        } else {
          alert(`Opening: ${labels[label] || label}`);
        }
      } catch (err) {
        alert("Cannot connect to backend. Make sure server is running on port 5000.");
      }
    });
  });
}