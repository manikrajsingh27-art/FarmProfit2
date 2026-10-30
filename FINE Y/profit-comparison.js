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

  initOptionSelection();
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

function initOptionSelection() {
  const btns = document.querySelectorAll(".option-card .btn-primary");
  btns.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const card = btn.closest(".option-card");
      const name = card.querySelector(".option-name").textContent;

      const quantity = parseFloat(card.querySelector(".meta-value")?.textContent?.replace(/[₹,]/g, "") || "100");
      const offeredPrice = parseFloat(prompt("Enter offered price per quintal:", "2350") || "2350");
      if (!offeredPrice) return;

      try {
        const res = await fetch(`${API_BASE}/calculate-options`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            quantity: quantity,
            offeredPrice: offeredPrice,
            transportCost: 5000,
            storageCost: 0,
            commission: offeredPrice * quantity * 0.03,
            packagingCost: 3000,
            expectedSpoilageLoss: 1000,
            brokerageRate: 2.5,
          }),
        });
        const data = await res.json();
        if (data.success) {
          alert(
            `Option: ${name}\n` +
            `Sale Value: ₹${data.saleValue.toLocaleString()}\n` +
            `FarmProfit Brokerage (2.5%): ₹${data.brokerage.toLocaleString()}\n` +
            `Total Cost: ₹${data.totalCost.toLocaleString()}\n` +
            `Net Income: ₹${data.netIncome.toLocaleString()}\n` +
            `Risk Level: ${data.riskLevel}\n` +
            `Payment Time: ${data.paymentTime}\n` +
            `Reason: ${data.recommendationReason}`
          );
        } else {
          alert("Calculation failed: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        alert("Cannot connect to backend. Make sure server is running on port 5000.");
      }
    });
  });
}