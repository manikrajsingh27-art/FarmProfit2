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

  // Role-based navigation: hide farmer-only links for buyers
  const navLinks = document.querySelectorAll(".nav-actions a, .nav-actions button");
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const text = link.textContent || "";
    if (user.role === "buyer" && (href.includes("farmer-dashboard") || text.includes("Farmer Dashboard"))) {
      link.style.display = "none";
    }
    if (user.role === "farmer" && (href.includes("buyer-dashboard") || text.includes("Buyer Dashboard"))) {
      link.style.display = "none";
    }
  });

  initAddRequirement();
  initMatchButtons();
  initOfferButtons();
  initCompareCheckboxes();
  loadRequirements();
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

async function initAddRequirement() {
  const btn = document.getElementById("addReqBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const user = getUser();
    if (!user || user.role !== "buyer") {
      alert("You must be logged in as a buyer to add requirements.");
      return;
    }

    const cropName = prompt("Enter crop name (e.g. Basmati Rice):");
    if (!cropName) return;
    const quantity = parseFloat(prompt("Enter required quantity (quintals):"));
    if (!quantity || quantity <= 0) return;
    const quality = prompt("Enter quality requirement (A, B+, B, C):") || "A";
    const location = prompt("Enter your location (e.g. Punjab, India):");
    if (!location) return;
    const maxPrice = parseFloat(prompt("Enter max price per quintal (₹):"));
    if (!maxPrice || maxPrice <= 0) return;
    const deadline = prompt("Enter deadline date (YYYY-MM-DD) or leave blank:") || null;

    try {
      const res = await fetch(`${API_BASE}/buyers/requirements`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          requiredCrop: cropName,
          requiredQuantity: quantity,
          qualityRequirement: quality,
          location: location,
          deadline: deadline,
          maxPrice: maxPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Requirement added successfully!");
        window.location.reload();
      } else {
        alert("Failed to add requirement: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Cannot connect to backend. Make sure server is running on port 5000.");
    }
  });
}

async function loadRequirements() {
  try {
    const res = await fetch(`${API_BASE}/buyers`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    const grid = document.querySelector(".req-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (data.buyers || []).forEach((req) => {
      const card = document.createElement("div");
      card.className = "req-card";
      card.innerHTML = `
        <div class="req-name">${req.requiredCrop}</div>
        <div class="req-qty">${req.requiredQuantity} quintals</div>
        <div class="req-grade">${req.qualityRequirement}</div>
        <div class="req-price">₹${req.maxPrice || "N/A"} / q max</div>
        <div class="req-actions">
          <button class="btn btn-ghost btn-sm">Edit</button>
          <button class="btn btn-primary btn-sm" onclick="findMatches('${req.requiredCrop}')">Find Matches</button>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load requirements:", err);
  }
}

window.findMatches = async (cropName) => {
  try {
    const res = await fetch(`${API_BASE}/crops?status=active`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    const matches = (data.crops || []).filter((c) => c.cropName === cropName);
    localStorage.setItem("fp_matched_crops", JSON.stringify(matches));
    alert(`Found ${matches.length} matching crop(s) for ${cropName}`);
  } catch (err) {
    alert("Cannot connect to backend. Make sure server is running on port 5000.");
  }
};

function initMatchButtons() {
  const btns = document.querySelectorAll(".req-card .btn-primary");
  btns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".req-card");
      const name = card.querySelector(".req-name").textContent;
      findMatches(name);
    });
  });
}

function initOfferButtons() {
  const btns = document.querySelectorAll(".matched-card .btn-primary");
  btns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".matched-card");
      const crop = card.querySelector(".matched-crop").textContent;
      const price = card.querySelector(".matched-price").textContent;
      alert(`Making offer for: ${crop} at ${price}`);
    });
  });
}

function initCompareCheckboxes() {
  const boxes = document.querySelectorAll(".compare-select input");
  let selected = 0;
  boxes.forEach((box) => {
    box.addEventListener("change", () => {
      if (box.checked) {
        selected++;
        if (selected > 3) {
          box.checked = false;
          selected--;
          alert("You can compare up to 3 listings at a time.");
        }
      } else {
        selected--;
      }
    });
  });
}