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

document.addEventListener("DOMContentLoaded", () => {
  initScrollReveal();
  initStickyNav();

  const user = getUser();
  if (!user) {
    alert("Please log in first.");
    window.location.href = "index.html";
    return;
  }

  // Role-based navigation: hide opposite-role dashboard links
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

  initStorageToggle();
  initVoiceInput();
  initFormSubmit();
  initSaveOffline();
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

function initStorageToggle() {
  const btns = document.querySelectorAll(".toggle-btn");
  const hidden = document.getElementById("storageAvailable");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      hidden.value = btn.dataset.value;
    });
  });
}

function initVoiceInput() {
  const btn = document.getElementById("voiceBtn");
  const status = document.getElementById("voiceStatus");
  if (!btn || !status) return;

  let recognition = null;
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    recognition.onstart = () => {
      status.textContent = "Listening... speak your crop details";
      status.classList.add("listening");
      btn.classList.add("listening");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      status.textContent = `Heard: "${transcript}"`;
      status.classList.remove("listening");
      btn.classList.remove("listening");
      setTimeout(() => {
        status.textContent = "Voice input captured. Fill remaining fields manually.";
        status.classList.remove("listening");
      }, 3000);
    };

    recognition.onerror = () => {
      status.textContent = "Voice input not available. Type details manually.";
      status.classList.remove("listening");
      btn.classList.remove("listening");
    };

    recognition.onend = () => {
      status.classList.remove("listening");
      btn.classList.remove("listening");
    };

    btn.addEventListener("click", () => {
      try { recognition.start(); } catch (e) {
        status.textContent = "Voice input not supported in this browser.";
      }
    });
  } else {
    btn.addEventListener("click", () => {
      status.textContent = "Voice input not supported in this browser.";
    });
  }
}

async function initFormSubmit() {
  const form = document.getElementById("cropForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = getUser();
    if (!user || user.role !== "farmer") {
      alert("You must be logged in as a farmer to list a crop.");
      return;
    }

    const cropName = document.getElementById("cropName").value;
    const variety = document.getElementById("variety").value;
    const quantity = document.getElementById("quantity").value;
    const qualityGrade = document.getElementById("qualityGrade").value;
    const unit = document.getElementById("unit").value;
    const harvestDate = document.getElementById("harvestDate").value;
    const location = document.getElementById("location").value;
    const expectedPrice = document.getElementById("expectedPrice").value;
    const storageAvailable = document.getElementById("storageAvailable").value;

    try {
      const res = await fetch(`${API_BASE}/crops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          "x-user-role": user.role,
        },
        body: JSON.stringify({
          cropName,
          variety,
          quantity,
          qualityGrade,
          unit,
          harvestDate,
          location,
          expectedPrice,
          storageAvailable,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Crop listed successfully! Listing ID: " + data.listingId);
        form.reset();
        document.getElementById("storageAvailable").value = "yes";
        document.querySelector(".toggle-btn[data-value='yes']").classList.add("active");
        document.querySelector(".toggle-btn[data-value='no']").classList.remove("active");
        window.location.href = "farmer-dashboard.html";
      } else {
        alert("Failed to list crop: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Cannot connect to backend. Make sure server is running on port 5000.");
    }
  });
}

function initSaveOffline() {
  const btn = document.getElementById("saveOffline");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const form = document.getElementById("cropForm");
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    localStorage.setItem("farmprofit_draft_crop", JSON.stringify(data));
    alert("Draft saved offline. It will sync when you're back online.");
  });
}