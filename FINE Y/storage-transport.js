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

  initStorageActions();
  initTransportActions();
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

function initStorageActions() {
  const btns = document.querySelectorAll(".storage-card .btn-outline");
  btns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".storage-card");
      const name = card.querySelector(".storage-name").textContent;
      alert(`Viewing storage details for: ${name}`);
    });
  });
}

function initTransportActions() {
  const btns = document.querySelectorAll(".transport-card .btn-primary");
  btns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".transport-card");
      const name = card.querySelector(".transport-name").textContent;
      alert(`Booking transport with: ${name}`);
    });
  });
}