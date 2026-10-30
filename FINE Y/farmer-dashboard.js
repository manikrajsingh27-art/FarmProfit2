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

  // Role-based navigation: hide buyer-only links for farmers
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
    if (user.role === "admin" && (href.includes("farmer-dashboard") || href.includes("buyer-dashboard"))) {
      // Admin can see all
    }
  });

  loadCrops();
  initQuickActions();
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

async function loadCrops() {
  try {
    const user = getUser();
    const farmerId = user ? user.id : null;
    const url = farmerId ? `${API_BASE}/crops?status=active&farmerId=${farmerId}` : `${API_BASE}/crops?status=active`;
    const res = await fetch(url, {
      headers: getHeaders(),
    });
    const data = await res.json();
    const grid = document.querySelector(".crops-grid");
    if (!grid) return;

    if (data.success && data.crops && data.crops.length > 0) {
      grid.innerHTML = "";
      (data.crops || []).forEach((crop) => {
        const card = document.createElement("div");
        card.className = "crop-card reveal";
        card.innerHTML = `
          <div class="crop-badge">${crop.cropName}</div>
          <div class="crop-name">${crop.variety || crop.cropName}</div>
          <div class="crop-meta">
            <span>📦 ${crop.quantity} ${crop.unit}</span>
            <span>• Grade ${crop.qualityGrade}</span>
            <span>• ₹${crop.expectedPrice}/${crop.unit}</span>
          </div>
          <div class="crop-actions">
            <button class="btn btn-ghost btn-sm">Edit</button>
            <button class="btn btn-primary btn-sm" onclick="viewBuyerOptions('${crop.id}')">View Buyers</button>
          </div>
        `;
        grid.appendChild(card);
      });
    } else {
      // Keep hardcoded HTML cards if API returns empty
      console.log("No crops from API, showing hardcoded cards");
    }
  } catch (err) {
    console.error("Failed to load crops:", err);
    // Keep hardcoded HTML cards if API fails
  }
}

function initQuickActions() {
  const cards = document.querySelectorAll(".action-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const title = card.querySelector(".action-title").textContent;
      if (title === "Compare Selling Options") {
        window.location.href = "profit-comparison.html";
      } else if (title === "Book Transport") {
        window.location.href = "storage-transport.html";
      } else if (title === "Storage Options") {
        window.location.href = "storage-transport.html";
      } else if (title === "Track Payments") {
        window.location.href = "order-tracking.html";
      } else {
        alert(`Opening: ${title}`);
      }
    });
  });

  const sellBtns = document.querySelectorAll(".crop-card .btn-primary");
  sellBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = btn.closest(".crop-card");
      const cropId = card.getAttribute("data-id") || "hardcoded-crop";
      const cropName = card.querySelector(".crop-name")?.textContent || "Crop";
      localStorage.setItem("fp_selected_listing", cropId);
      localStorage.setItem("fp_selected_crop_name", cropName);
      localStorage.setItem("fp_matching_buyers", JSON.stringify([
        { id: "b-1", buyerName: "FreshMart Direct", requiredCrop: cropName, requiredQuantity: 100, qualityRequirement: "A", location: "Punjab", maxPrice: 2150, status: "active", verified: true },
        { id: "b-2", buyerName: "GrainHub Traders", requiredCrop: cropName, requiredQuantity: 200, qualityRequirement: "B+", location: "Haryana", maxPrice: 1950, status: "active", verified: true },
        { id: "b-3", buyerName: "AgriFood Processor", requiredCrop: cropName, requiredQuantity: 500, qualityRequirement: "A", location: "Rajasthan", maxPrice: 2550, status: "active", verified: true }
      ]));
      window.location.href = "buyer-option.html";
    });
  });
}

window.viewBuyerOptions = async (listingId) => {
  try {
    const res = await fetch(`${API_BASE}/crops/${listingId}/matching-buyers`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    localStorage.setItem("fp_matching_buyers", JSON.stringify(data.matchingBuyers || []));
    localStorage.setItem("fp_selected_listing", listingId);
    window.location.href = "buyer-option.html";
  } catch (err) {
    alert("Failed to load matching buyers. Is the backend running?");
  }
};