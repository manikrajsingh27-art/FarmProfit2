// Vercel serverless adapter for FarmProfit backend
// Wraps the existing server.js handler for Vercel deployment
// Local development continues to use server.js directly

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const DATA_FILE = path.join(__dirname, "db.json");

// Ensure data file exists (serverless: read-only /tmp fallback)
function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initialData = {
        users: [
          { id: "user-farmer-1", email: "demo@farmprofit.com", password: "demo123", role: "farmer", name: "Demo Farmer", verified: true },
          { id: "user-buyer-1", email: "buyer@farmprofit.com", password: "demo123", role: "buyer", name: "Demo Buyer", verified: true },
          { id: "user-admin-1", email: "admin@farmprofit.com", password: "admin123", role: "admin", name: "Admin", verified: true },
        ],
        crops: [],
        buyers: [],
        offers: [],
        transactions: [],
        storage: [
          { id: "s-1", name: "ColdStore Punjab", location: "Punjab, India", availableCapacity: 450, costPerQuintalPerDay: 8, spoilageRisk: "low", distanceKm: 8, isActive: true },
          { id: "s-2", name: "AgriWarehouse North", location: "Haryana, India", availableCapacity: 1200, costPerQuintalPerDay: 6, spoilageRisk: "medium", distanceKm: 15, isActive: true },
          { id: "s-3", name: "HarvestSafe Silos", location: "Punjab, India", availableCapacity: 800, costPerQuintalPerDay: 7, spoilageRisk: "low", distanceKm: 22, isActive: true },
        ],
        transport: [
          { id: "t-1", name: "Kisan Logistics", location: "Punjab, India", vehicleCapacity: 10, pickupCost: 4500, estimatedDeliveryHours: 12, distanceKm: 10, isActive: true },
          { id: "t-2", name: "GreenMove Trucking", location: "Haryana, India", vehicleCapacity: 20, pickupCost: 7200, estimatedDeliveryHours: 18, distanceKm: 18, isActive: true },
          { id: "t-3", name: "AgriHaul Carriers", location: "Punjab, India", vehicleCapacity: 15, pickupCost: 5800, estimatedDeliveryHours: 14, distanceKm: 25, isActive: true },
        ],
        marketPrices: [
          { id: "m-1", cropName: "Basmati Rice", variety: "Pusa Basmati 1121", pricePerQuintal: 2400, location: "Punjab, India", date: new Date().toISOString().split("T")[0] },
          { id: "m-2", cropName: "Wheat", variety: "HD-2967", pricePerQuintal: 2100, location: "Punjab, India", date: new Date().toISOString().split("T")[0] },
          { id: "m-3", cropName: "Mustard Seeds", variety: "Varuna", pricePerQuintal: 5200, location: "Rajasthan, India", date: new Date().toISOString().split("T")[0] },
        ],
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
  } catch (e) {
    // Read-only filesystem on Vercel - use in-memory fallback
  }
}

ensureDataFile();

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    return { users: [], crops: [], buyers: [], offers: [], transactions: [], storage: [], transport: [], marketPrices: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    // Read-only filesystem on Vercel - data won't persist across invocations
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-role",
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); console.log("parseBody data chunk:", chunk.toString().substring(0, 100)); });
    req.on("end", () => {
      console.log("parseBody end, body length:", body.length, "body:", body.substring(0, 200));
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { console.log("parseBody error:", e.message); resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Serve static files (frontend)
  if (method === "GET" && !pathname.startsWith("/api")) {
    let filePath = path.join(__dirname, pathname === "/" ? "/index.html" : pathname);
    const ext = path.extname(filePath);
    const contentType = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpg",
    }[ext] || "text/plain";

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === "ENOENT") {
          fs.readFile(path.join(__dirname, "index.html"), (err2, content2) => {
            if (err2) {
              res.writeHead(404, { "Content-Type": "text/html" });
              res.end("404 Not Found");
            } else {
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(content2);
            }
          });
        } else {
          res.writeHead(500);
          res.end("Server Error");
        }
      } else {
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      }
    });
    return;
  }

  // CORS preflight
  if (method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  // Health check
  if (pathname === "/api/health" && method === "GET") {
    sendJson(res, 200, { status: "healthy", timestamp: new Date().toISOString(), version: "1.0.0" });
    return;
  }

  // Demo login
  if (pathname === "/api/auth/demo-login" && method === "POST") {
    const body = await parseBody(req);
    const role = body.role;
    const db = readDB();
    let user;
    if (role === "farmer") user = db.users.find((u) => u.role === "farmer");
    else if (role === "buyer") user = db.users.find((u) => u.role === "buyer");
    else { sendJson(res, 400, { error: "Invalid role" }); return; }

    sendJson(res, 200, {
      success: true,
      token: `demo-${role}-token-${user.id}`,
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
    });
    return;
  }

  // Get crops
  if (pathname === "/api/crops" && method === "GET") {
    const db = readDB();
    const { status, farmerId } = parsedUrl.query;
    let filtered = db.crops;
    if (status) filtered = filtered.filter((c) => c.status === status);
    if (farmerId) filtered = filtered.filter((c) => c.farmerId === farmerId);
    sendJson(res, 200, { success: true, count: filtered.length, crops: filtered });
    return;
  }

  // Create crop
  if (pathname === "/api/crops" && method === "POST") {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    if (!userId || userRole !== "farmer") { sendJson(res, 403, { error: "Only farmers can list crops" }); return; }

    const body = await parseBody(req);
    const db = readDB();
    const listingId = "crop-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const listing = {
      id: listingId,
      farmerId: userId,
      farmerName: body.farmerName || "Demo Farmer",
      cropName: body.cropName,
      variety: body.variety,
      quantity: parseFloat(body.quantity) || 0,
      qualityGrade: body.qualityGrade,
      unit: body.unit,
      harvestDate: body.harvestDate,
      location: body.location,
      expectedPrice: parseFloat(body.expectedPrice) || 0,
      storageAvailable: body.storageAvailable === "yes",
      photoUrl: body.photoUrl || null,
      voiceInput: body.voiceInput || null,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    db.crops.push(listing);
    writeDB(db);
    sendJson(res, 201, { success: true, listingId, listing });
    return;
  }

  // Get single crop
  const cropMatch = pathname.match(/^\/api\/crops\/([^\/]+)$/);
  if (cropMatch && method === "GET") {
    const db = readDB();
    const listing = db.crops.find((c) => c.id === cropMatch[1]);
    if (!listing) { sendJson(res, 404, { error: "Not found" }); return; }
    sendJson(res, 200, { success: true, listing });
    return;
  }

  // Matching buyers
  const matchMatch = pathname.match(/^\/api\/crops\/([^\/]+)\/matching-buyers$/);
  if (matchMatch && method === "GET") {
    const db = readDB();
    const listing = db.crops.find((c) => c.id === matchMatch[1]);
    if (!listing) { sendJson(res, 404, { error: "Listing not found" }); return; }

    const qualityOrder = { A: 4, "B+": 3, B: 2, C: 1 };
    const matchingBuyers = db.buyers
      .filter((b) => b.status === "active")
      .map((b) => {
        let score = 0;
        const reasons = [];
        if (b.requiredCrop === listing.cropName) { score += 30; reasons.push("Same crop"); }
        if (b.requiredQuantity <= listing.quantity) { score += 20; reasons.push("Quantity matches"); }
        if (b.qualityRequirement && listing.qualityGrade) {
          if (qualityOrder[b.qualityRequirement] <= qualityOrder[listing.qualityGrade]) { score += 15; reasons.push("Quality compatible"); }
        }
        if (b.location === listing.location) { score += 20; reasons.push("Same location"); }
        if (b.deadline && new Date(b.deadline) > new Date()) { score += 10; reasons.push("Active deadline"); }
        return { ...b, matchScore: score, matchReasons: reasons };
      })
      .filter((b) => b.matchScore > 0)
      .sort((a, b) => b.matchScore - b.matchScore);

    sendJson(res, 200, { success: true, listingId: listing.id, matchingBuyers });
    return;
  }

  // Get buyers
  if (pathname === "/api/buyers" && method === "GET") {
    const db = readDB();
    sendJson(res, 200, { success: true, count: db.buyers.length, buyers: db.buyers });
    return;
  }

  // Create buyer requirement
  if (pathname === "/api/buyers/requirements" && method === "POST") {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    if (!userId || userRole !== "buyer") { sendJson(res, 403, { error: "Only buyers can add requirements" }); return; }

    const body = await parseBody(req);
    const db = readDB();
    const buyerId = "buyer-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const buyer = {
      id: buyerId,
      userId,
      buyerName: body.buyerName || "Demo Buyer",
      requiredCrop: body.requiredCrop,
      requiredQuantity: parseFloat(body.requiredQuantity) || 0,
      qualityRequirement: body.qualityRequirement,
      location: body.location,
      deadline: body.deadline || null,
      maxPrice: parseFloat(body.maxPrice) || 0,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    db.buyers.push(buyer);
    writeDB(db);
    sendJson(res, 201, { success: true, buyerId, buyer });
    return;
  }

  // Calculate options
  if (pathname === "/api/calculate-options" && method === "POST") {
    const body = await parseBody(req);
    const qty = parseFloat(body.quantity) || 0;
    const price = parseFloat(body.offeredPrice) || 0;
    const transport = parseFloat(body.transportCost) || 0;
    const storage = parseFloat(body.storageCost) || 0;
    const comm = parseFloat(body.commission) || 0;
    const packaging = parseFloat(body.packagingCost) || 0;
    const spoilage = parseFloat(body.expectedSpoilageLoss) || 0;
    const brokerageRate = parseFloat(body.brokerageRate) || 2.5; // default 2.5%

    const saleValue = price * qty;
    const brokerage = saleValue * (brokerageRate / 100);
    const totalCost = transport + storage + comm + packaging + spoilage + brokerage;
    const netIncome = saleValue - totalCost;

    let riskLevel = "Low";
    let reason = "Good profitability with manageable risks.";
    if (netIncome < 0) { riskLevel = "High"; reason = "Net loss."; }
    else if (netIncome < saleValue * 0.2) { riskLevel = "Medium"; reason = "Thin margin."; }

    sendJson(res, 200, {
      success: true,
      saleValue,
      brokerage,
      totalCost,
      netIncome,
      brokerageRate,
      riskLevel,
      paymentTime: "Within 48 hours",
      recommendationReason: reason,
    });
    return;
  }

  // Create offer
  if (pathname === "/api/offers" && method === "POST") {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    if (!userId || userRole !== "buyer") { sendJson(res, 403, { error: "Only buyers can make offers" }); return; }

    const body = await parseBody(req);
    const db = readDB();
    const listing = db.crops.find((c) => c.id === body.listingId);
    if (!listing) { sendJson(res, 404, { error: "Listing not found" }); return; }
    if (listing.status !== "active") { sendJson(res, 400, { error: "Listing not available" }); return; }

    const saleValue = body.offeredPrice * body.requiredQuantity;
    const offerId = "offer-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const offer = {
      id: offerId,
      listingId: body.listingId,
      buyerId: userId,
      buyerName: body.buyerName || "Demo Buyer",
      farmerId: listing.farmerId,
      offeredPrice: parseFloat(body.offeredPrice) || 0,
      requiredQuantity: parseFloat(body.requiredQuantity) || 0,
      totalOfferValue: saleValue,
      estimatedNetIncome: saleValue * 0.85,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    db.offers.push(offer);
    writeDB(db);
    sendJson(res, 201, { success: true, offerId, offer });
    return;
  }

  // Get offers
  if (pathname === "/api/offers" && method === "GET") {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    if (!userId || userRole !== "farmer") { sendJson(res, 403, { error: "Farmer access required" }); return; }

    const db = readDB();
    const farmerOffers = db.offers.filter((o) => o.farmerId === userId);
    sendJson(res, 200, { success: true, count: farmerOffers.length, offers: farmerOffers });
    return;
  }

  // Accept offer
  const acceptMatch = pathname.match(/^\/api\/offers\/([^\/]+)\/accept$/);
  if (acceptMatch && method === "POST") {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    if (!userId || userRole !== "farmer") { sendJson(res, 403, { error: "Farmer access required" }); return; }

    const db = readDB();
    const offerIndex = db.offers.findIndex((o) => o.id === acceptMatch[1]);
    if (offerIndex === -1) { sendJson(res, 404, { error: "Offer not found" }); return; }
    const offer = db.offers[offerIndex];
    if (offer.farmerId !== userId) { sendJson(res, 403, { error: "Not authorized" }); return; }
    if (offer.status !== "pending") { sendJson(res, 400, { error: "Offer not pending" }); return; }

    const listingIndex = db.crops.findIndex((c) => c.id === offer.listingId);
    if (listingIndex === -1 || db.crops[listingIndex].status !== "active") { sendJson(res, 400, { error: "Listing not available" }); return; }

    offer.status = "accepted";
    db.crops[listingIndex].status = "sold";

    db.offers.forEach((o) => {
      if (o.listingId === offer.listingId && o.id !== offer.id && o.status === "pending") {
        o.status = "rejected";
      }
    });

    const transactionId = "txn-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const transaction = {
      id: transactionId,
      offerId: offer.id,
      listingId: offer.listingId,
      buyerId: offer.buyerId,
      farmerId: offer.farmerId,
      amount: offer.totalOfferValue,
      status: "accepted",
      orderStage: "accepted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.transactions.push(transaction);
    writeDB(db);

    sendJson(res, 200, { success: true, transactionId, offer, listing: db.crops[listingIndex], transaction });
    return;
  }

  // Update order stage
  const stageMatch = pathname.match(/^\/api\/orders\/([^\/]+)\/stage$/);
  if (stageMatch && method === "POST") {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    if (!userId) { sendJson(res, 403, { error: "Authentication required" }); return; }

    const body = await parseBody(req);
    const db = readDB();
    const txnIndex = db.transactions.findIndex((t) => t.id === stageMatch[1]);
    if (txnIndex === -1) { sendJson(res, 404, { error: "Transaction not found" }); return; }

    db.transactions[txnIndex].orderStage = body.stage;
    db.transactions[txnIndex].updatedAt = new Date().toISOString();
    if (body.stage === "payment_completed") {
      db.transactions[txnIndex].status = "completed";
    }
    writeDB(db);

    sendJson(res, 200, { success: true, transaction: db.transactions[txnIndex] });
    return;
  }

  // Get orders
  if (pathname === "/api/orders" && method === "GET") {
    const db = readDB();
    const { userId, role } = parsedUrl.query;
    let filtered = db.transactions;
    if (userId && role === "farmer") filtered = filtered.filter((t) => t.farmerId === userId);
    if (userId && role === "buyer") filtered = filtered.filter((t) => t.buyerId === userId);
    sendJson(res, 200, { success: true, count: filtered.length, orders: filtered });
    return;
  }

  // Get single order
  const orderMatch = pathname.match(/^\/api\/orders\/([^\/]+)$/);
  if (orderMatch && method === "GET") {
    const db = readDB();
    const transaction = db.transactions.find((t) => t.id === orderMatch[1]);
    if (!transaction) { sendJson(res, 404, { error: "Not found" }); return; }
    sendJson(res, 200, { success: true, transaction });
    return;
  }

  // Offline sync
  if (pathname === "/api/sync" && method === "POST") {
    const body = await parseBody(req);
    const { actions } = body;
    if (!actions || !Array.isArray(actions)) { sendJson(res, 400, { error: "Actions array required" }); return; }
    const results = actions.map((a) => ({ localId: a.localId, status: "synced" }));
    sendJson(res, 200, { success: true, synced: results.length, results });
    return;
  }

  // Sync status
  if (pathname === "/api/sync/status" && method === "GET") {
    const db = readDB();
    sendJson(res, 200, {
      success: true,
      serverTime: new Date().toISOString(),
      totalCrops: db.crops.length,
      totalOffers: db.offers.length,
      totalTransactions: db.transactions.length,
    });
    return;
  }

  // Send message (buyer <-> farmer communication)
  if (pathname === "/api/messages" && method === "POST") {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    if (!userId) { sendJson(res, 403, { error: "Authentication required" }); return; }

    const body = await parseBody(req);
    const db = readDB();
    const messageId = "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const message = {
      id: messageId,
      senderId: userId,
      senderRole: userRole,
      senderName: body.senderName || "User",
      receiverId: body.receiverId,
      receiverRole: body.receiverRole,
      subject: body.subject || "",
      message: body.message,
      cropId: body.cropId || null,
      offerId: body.offerId || null,
      status: "unread",
      createdAt: new Date().toISOString(),
    };
    if (!db.messages) db.messages = [];
    db.messages.push(message);
    writeDB(db);
    sendJson(res, 201, { success: true, messageId, message });
    return;
  }

  // Get messages (filtered by user)
  if (pathname === "/api/messages" && method === "GET") {
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    if (!userId) { sendJson(res, 403, { error: "Authentication required" }); return; }

    const db = readDB();
    const { otherUserId } = parsedUrl.query;
    const messages = (db.messages || []).filter((m) =>
      m.senderId === userId || m.receiverId === userId
    ).filter((m) => {
      if (otherUserId) return m.senderId === otherUserId || m.receiverId === otherUserId;
      return true;
    }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    sendJson(res, 200, { success: true, count: messages.length, messages });
    return;
  }

  // Mark message as read
  const msgReadMatch = pathname.match(/^\/api\/messages\/([^\/]+)\/read$/);
  if (msgReadMatch && method === "POST") {
    const userId = req.headers["x-user-id"];
    if (!userId) { sendJson(res, 403, { error: "Authentication required" }); return; }

    const db = readDB();
    const msgIndex = (db.messages || []).findIndex((m) => m.id === msgReadMatch[1]);
    if (msgIndex === -1) { sendJson(res, 404, { error: "Message not found" }); return; }

    db.messages[msgIndex].status = "read";
    writeDB(db);
    sendJson(res, 200, { success: true, message: db.messages[msgIndex] });
    return;
  }

  // Get conversations (unique user pairs)
  if (pathname === "/api/messages/conversations" && method === "GET") {
    const userId = req.headers["x-user-id"];
    if (!userId) { sendJson(res, 403, { error: "Authentication required" }); return; }

    const db = readDB();
    const conversations = {};
    (db.messages || []).forEach((m) => {
      const other = m.senderId === userId ? m.receiverId : m.senderId;
      if (!other) return;
      if (!conversations[other] || new Date(m.createdAt) > new Date(conversations[other].lastMessageAt)) {
        conversations[other] = {
          otherUserId: other,
          otherUserName: m.senderId === userId ? m.senderName : "User",
          lastMessage: m.message,
          lastMessageAt: m.createdAt,
          unreadCount: (conversations[other] && conversations[other].unreadCount) || 0,
        };
      }
      if (m.receiverId === userId && m.status === "unread") {
        if (!conversations[other].unreadCount) conversations[other].unreadCount = 0;
        conversations[other].unreadCount++;
      }
    });

    const convList = Object.values(conversations).sort((a, b) =>
      new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
    );
    sendJson(res, 200, { success: true, count: convList.length, conversations: convList });
    return;
  }

  // Not found
  sendJson(res, 404, { error: "Endpoint not found" });
});

// Vercel serverless function export
module.exports = (req, res) => {
  server.emit("request", req, res);
};

// Only listen when run directly (local dev), not when imported by Vercel
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`FarmProfit Backend running on http://localhost:${PORT}`);
  });
}
