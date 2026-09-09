const user = requireLogin("buyer");
if (user) document.getElementById("welcome").textContent = `Hi, ${user.name}`;

function showMsg(text, type) {
  document.getElementById("msg").innerHTML = `<div class="msg ${type}">${text}</div>`;
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

async function loadProducts() {
  const crop = document.getElementById("filterCrop").value.trim();
  const location = document.getElementById("filterLocation").value.trim();
  const el = document.getElementById("products");

  let query = "";
  if (crop) query += `crop=${encodeURIComponent(crop)}&`;
  if (location) query += `location=${encodeURIComponent(location)}&`;

  try {
    const { products } = await api(`/products?${query}`);
    if (!products.length) {
      el.innerHTML = "<p>No produce listed yet. Check back soon!</p>";
      return;
    }
    el.innerHTML = products.map(p => `
      <div class="card">
        <span class="tag">📍 ${p.location}</span>
        <h3>${capitalize(p.crop_name)}</h3>
        <p>Available: ${p.quantity_kg} kg</p>
        <p class="price-ai">₹${p.farmer_price_per_kg}/kg</p>
        <p><small>AI fair estimate: ₹${p.ai_price_per_kg}/kg</small></p>
        <p>Sold by: ${p.farmer_name}</p>
        <input type="number" min="1" max="${p.quantity_kg}" placeholder="Qty (kg)" id="qty-${p.id}" />
        <button class="btn" style="margin-top:8px;width:100%;" onclick="placeOrder(${p.id}, ${p.quantity_kg})">Order Now</button>
      </div>
    `).join("");
  } catch (err) {
    el.innerHTML = `<div class="msg error">${err.message}</div>`;
  }
}

async function placeOrder(productId, maxQty) {
  const qtyInput = document.getElementById(`qty-${productId}`);
  const quantityKg = Number(qtyInput.value);

  if (!quantityKg || quantityKg <= 0 || quantityKg > maxQty) {
    showMsg("Please enter a valid quantity.", "error");
    return;
  }

  try {
    await api("/orders", { method: "POST", auth: true, body: { productId, quantityKg } });
    showMsg("Order placed successfully!", "success");
    loadProducts();
    loadOrders();
  } catch (err) {
    showMsg(err.message, "error");
  }
}

async function loadOrders() {
  const el = document.getElementById("myOrders");
  try {
    const { orders } = await api("/orders/mine", { auth: true });
    if (!orders.length) {
      el.innerHTML = "<p>You haven't placed any orders yet.</p>";
      return;
    }
    el.innerHTML = `
      <table>
        <tr><th>Crop</th><th>Farmer</th><th>Qty</th><th>Total</th><th>Status</th></tr>
        ${orders.map(o => `
          <tr>
            <td>${capitalize(o.crop_name)}</td>
            <td>${o.farmer_name}</td>
            <td>${o.quantity_kg} kg</td>
            <td>₹${o.total_price.toFixed(2)}</td>
            <td><span class="status-badge">${o.status.replace(/_/g, " ")}</span></td>
          </tr>
        `).join("")}
      </table>`;
  } catch (err) {
    el.innerHTML = `<div class="msg error">${err.message}</div>`;
  }
}

loadProducts();
loadOrders();
