const user = requireLogin("farmer");
if (user) document.getElementById("welcome").textContent = `Hi, ${user.name}`;

function showMsg(text, type) {
  document.getElementById("msg").innerHTML = `<div class="msg ${type}">${text}</div>`;
}

async function getAIPrice() {
  const crop = document.getElementById("cropName").value;
  const quantity = document.getElementById("quantity").value || 1;

  try {
    const data = await api(`/predict?crop=${crop}&quantity=${quantity}`);
    document.getElementById("aiResult").innerHTML = `
      <div class="msg success">
        🤖 <strong>AI Suggested Price:</strong>
        <span class="price-ai">₹${data.suggestedPricePerKg}/kg</span><br/>
        Fair range: ₹${data.fairRange.low} – ₹${data.fairRange.high} /kg<br/>
        <small>${data.note}</small>
      </div>`;
    document.getElementById("farmerPrice").value = data.suggestedPricePerKg;
  } catch (err) {
    showMsg(err.message, "error");
  }
}

document.getElementById("listForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await api("/products", {
      method: "POST",
      auth: true,
      body: {
        cropName: document.getElementById("cropName").value,
        quantityKg: Number(document.getElementById("quantity").value),
        farmerPricePerKg: Number(document.getElementById("farmerPrice").value) || undefined,
        location: document.getElementById("location").value
      }
    });
    showMsg("Produce listed successfully!", "success");
    document.getElementById("listForm").reset();
    document.getElementById("aiResult").innerHTML = "";
    loadMyProducts();
  } catch (err) {
    showMsg(err.message, "error");
  }
});

async function loadMyProducts() {
  const el = document.getElementById("myProducts");
  try {
    const { products } = await api("/products/mine", { auth: true });
    if (!products.length) {
      el.innerHTML = "<p>No listings yet.</p>";
      return;
    }
    el.innerHTML = products.map(p => `
      <div class="card">
        <span class="tag">${p.status}</span>
        <h3>${capitalize(p.crop_name)}</h3>
        <p>Qty: ${p.quantity_kg} kg</p>
        <p>AI price: ₹${p.ai_price_per_kg}/kg</p>
        <p>Your price: <strong>₹${p.farmer_price_per_kg}/kg</strong></p>
        <p>📍 ${p.location}</p>
        ${p.status === "available" ? `<button class="btn danger" onclick="markSoldOut(${p.id})">Mark Sold Out</button>` : ""}
      </div>
    `).join("");
  } catch (err) {
    el.innerHTML = `<div class="msg error">${err.message}</div>`;
  }
}

async function markSoldOut(id) {
  try {
    await api(`/products/${id}/status`, { method: "PATCH", auth: true, body: { status: "sold_out" } });
    loadMyProducts();
  } catch (err) {
    alert(err.message);
  }
}

async function loadOrders() {
  const el = document.getElementById("ordersTable");
  try {
    const { orders } = await api("/orders/received", { auth: true });
    if (!orders.length) {
      el.innerHTML = "<p>No orders yet.</p>";
      return;
    }
    el.innerHTML = `
      <table>
        <tr><th>Crop</th><th>Buyer</th><th>Qty</th><th>Total</th><th>Status</th><th>Action</th></tr>
        ${orders.map(o => `
          <tr>
            <td>${capitalize(o.crop_name)}</td>
            <td>${o.buyer_name}<br/><small>${o.buyer_phone}</small></td>
            <td>${o.quantity_kg} kg</td>
            <td>₹${o.total_price.toFixed(2)}</td>
            <td><span class="status-badge">${o.status}</span></td>
            <td>${orderActions(o)}</td>
          </tr>
        `).join("")}
      </table>`;
  } catch (err) {
    el.innerHTML = `<div class="msg error">${err.message}</div>`;
  }
}

function orderActions(o) {
  const next = { placed: "confirmed", confirmed: "out_for_delivery", out_for_delivery: "delivered" }[o.status];
  if (!next) return "-";
  return `<button class="btn" onclick="advanceOrder(${o.id}, '${next}')">Mark ${next.replace(/_/g, " ")}</button>`;
}

async function advanceOrder(id, status) {
  try {
    await api(`/orders/${id}/status`, { method: "PATCH", auth: true, body: { status } });
    loadOrders();
  } catch (err) {
    alert(err.message);
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

loadMyProducts();
loadOrders();
