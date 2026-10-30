const API_BASE = "/api";

document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initStickyNav();
  initLanguageToggle();
  initRoleToggle();
  initDemoLogin();
  initStatusIndicator();
});

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}

function initStickyNav() {
  const nav = document.querySelector(".nav");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) nav.classList.add("scrolled");
    else nav.classList.remove("scrolled");
  });
}

function initLanguageToggle() {
  const btns = document.querySelectorAll(".lang-btn");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function initRoleToggle() {
  const btns = document.querySelectorAll(".role-btn");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

async function initDemoLogin() {
  const btn = document.getElementById("demoLogin");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const role = document.querySelector(".role-btn.active")?.dataset.role || "farmer";
    try {
      const res = await fetch(`${API_BASE}/auth/demo-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("fp_user", JSON.stringify(data.user));
        localStorage.setItem("fp_token", data.token);
        window.location.href = role === "buyer" ? "buyer-dashboard.html" : "farmer-dashboard.html";
      } else {
        alert("Login failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Cannot connect to backend. Make sure server is running on port 5000.");
    }
  });
}

function initStatusIndicator() {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  let online = true;
  setInterval(() => {
    online = !online;
    dot.classList.toggle("offline", !online);
    text.textContent = online ? "Online" : "Offline";
  }, 8000);
}