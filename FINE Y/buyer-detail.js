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

  loadBuyerDetail();
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

async function loadBuyerDetail() {
  const buyerId = localStorage.getItem("fp_selected_buyer");
  if (!buyerId) return;

  try {
    const res = await fetch(`${API_BASE}/buyers`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    const buyer = (data.buyers || []).find((b) => b.id === buyerId);
    if (!buyer) return;

    document.querySelector(".buyer-name").textContent = buyer.buyerName;
    document.querySelector(".buyer-verified-badge").textContent = buyer.verified ? "Verified Buyer" : "Basic Verified";
    document.querySelector(".req-name").textContent = buyer.requiredCrop;
    document.querySelector(".req-qty").textContent = `${buyer.requiredQuantity} quintals`;
    document.querySelector(".req-grade").textContent = buyer.qualityRequirement;
    document.querySelector(".price-value").textContent = `₹${buyer.maxPrice || "N/A"} / quintal`;
    if (document.querySelector(".price-total")) {
      document.querySelector(".price-total").textContent = `Total: ₹${(buyer.maxPrice * buyer.requiredQuantity || 0).toLocaleString()}`;
    }
  } catch (err) {
    console.error("Failed to load buyer detail:", err);
  }
}

function initActions() {
  const accept = document.getElementById("acceptOffer");
  const report = document.getElementById("reportBuyer");
  const chat = document.getElementById("chatBuyer");

  if (accept) {
    accept.addEventListener("click", async () => {
      const user = getUser();
      if (!user || user.role !== "farmer") {
        alert("You must be logged in as a farmer to accept offers.");
        return;
      }

      const buyerId = localStorage.getItem("fp_selected_buyer");
      const listing = JSON.parse(localStorage.getItem("fp_selected_listing") || "null");
      if (!listing) {
        alert("No crop listing selected. Please select a crop first.");
        return;
      }

      if (confirm("Accept this buyer's offer? The deal will be moved to order tracking.")) {
        try {
          const res = await fetch(`${API_BASE}/offers`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
              listingId: listing.id,
              offeredPrice: buyer.maxPrice || listing.expectedPrice,
              requiredQuantity: Math.min(buyer.requiredQuantity, listing.quantity),
            }),
          });
          const data = await res.json();
          if (data.success) {
            const acceptRes = await fetch(`${API_BASE}/offers/${data.offerId}/accept`, {
              method: "POST",
              headers: getHeaders(),
            });
            const acceptData = await acceptRes.json();
            if (acceptData.success) {
              localStorage.setItem("fp_transaction_id", acceptData.transactionId);
              alert("Offer accepted! Redirecting to order tracking...");
              window.location.href = "order-tracking.html";
            } else {
              alert("Failed to accept offer: " + (acceptData.error || "Unknown error"));
            }
          } else {
            alert("Failed to create offer: " + (data.error || "Unknown error"));
          }
        } catch (err) {
          alert("Cannot connect to backend. Make sure server is running on port 5000.");
        }
      }
    });
  }

  if (report) {
    report.addEventListener("click", () => {
      alert("Buyer reported. Our compliance team will review within 24 hours.");
    });
  }

  if (chat) {
    chat.addEventListener("click", () => {
      const buyerId = localStorage.getItem("fp_selected_buyer");
      const buyerName = document.querySelector(".buyer-name")?.textContent || "Buyer";
      const buyerRole = "buyer";
      if (!buyerId) {
        alert("No buyer selected.");
        return;
      }
      localStorage.setItem("fp_msg_receiver_id", buyerId);
      localStorage.setItem("fp_msg_receiver_name", buyerName);
      localStorage.setItem("fp_msg_receiver_role", buyerRole);
      window.location.href = "messages.html";
    });
  }
}