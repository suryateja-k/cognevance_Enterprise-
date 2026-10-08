document.addEventListener('DOMContentLoaded', () => {
  let token = localStorage.getItem('token') || '';
  let user = JSON.parse(localStorage.getItem('user')) || null;
  let products = [];
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  let orders = [];
  let analyticsData = null;

  const authView = document.getElementById('authView');
  const shopView = document.getElementById('shopView');
  const ordersView = document.getElementById('ordersView');
  const adminView = document.getElementById('adminView');

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const checkoutForm = document.getElementById('checkoutForm');
  const productForm = document.getElementById('productForm');

  const header = document.querySelector('.header');
  const headerLinks = document.getElementById('headerLinks');
  const btnGoShop = document.getElementById('btnGoShop');
  const btnGoOrders = document.getElementById('btnGoOrders');
  const btnGoAdmin = document.getElementById('btnGoAdmin');
  const userSession = document.getElementById('userSession');
  const logoBrand = document.getElementById('logoBrand');

  const openCartDrawerBtn = document.getElementById('openCartDrawerBtn');
  const closeCartDrawerBtn = document.getElementById('closeCartDrawerBtn');
  const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
  const cartDrawerItems = document.getElementById('cartDrawerItems');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartBadgeCount = document.getElementById('cartBadgeCount');
  const checkoutBtn = document.getElementById('checkoutBtn');

  const checkoutModal = document.getElementById('checkoutModal');
  const closeCheckoutModalBtn = document.getElementById('closeCheckoutModalBtn');
  const cancelCheckoutBtn = document.getElementById('cancelCheckoutBtn');
  const checkoutTotalVal = document.getElementById('checkoutTotalVal');

  const productModal = document.getElementById('productModal');
  const openProductModalBtn = document.getElementById('openProductModalBtn');
  const closeProductModalBtn = document.querySelectorAll('#productModal .close-modal-btn, #cancelProductBtn');
  const productModalTitle = document.getElementById('productModalTitle');
  const editProductId = document.getElementById('editProductId');

  const productsGrid = document.getElementById('productsGrid');
  const customerOrdersList = document.getElementById('customerOrdersList');
  const adminProductsTable = document.getElementById('adminProductsTable');
  const shopSearch = document.getElementById('shopSearch');
  const catFilterBtns = document.querySelectorAll('#shopCategories .cat-btn');
  const toast = document.getElementById('toast');

  function showToast(message, type = 'success') {
    toast.className = `toast active ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}`;
    setTimeout(() => { toast.classList.remove('active'); }, 3500);
  }

  function getHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
  }

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) { header.classList.add('scrolled'); } else { header.classList.remove('scrolled'); }
  });

  function renderView() {
    authView.style.display = 'none'; shopView.style.display = 'none';
    ordersView.style.display = 'none'; adminView.style.display = 'none';

    if (!token || !user) {
      authView.style.display = 'block'; headerLinks.style.display = 'none';
      renderHeaderAuth(false);
      return;
    }

    renderHeaderAuth(true);
    headerLinks.style.display = 'flex';
    btnGoAdmin.style.display = (user.role === 'admin') ? 'inline-flex' : 'none';

    if (btnGoAdmin.classList.contains('active') && user.role === 'admin') {
      adminView.style.display = 'block'; loadAdminDashboard();
    } else if (btnGoOrders.classList.contains('active')) {
      ordersView.style.display = 'block'; loadOrdersHistory();
    } else {
      btnGoShop.classList.add('active'); btnGoOrders.classList.remove('active'); btnGoAdmin.classList.remove('active');
      shopView.style.display = 'block'; loadStorefront();
    }
    updateCartUI();
  }

  function renderHeaderAuth(isLoggedIn) {
    if (!isLoggedIn) {
      userSession.innerHTML = `<span class="user-profile-tag"><i class="fa-solid fa-store-slash"></i> Guest Mode</span>`;
      return;
    }
    userSession.innerHTML = `
      <span class="user-profile-tag">
        <i class="fa-solid fa-circle-user"></i> ${user.name}
        <span class="role-badge ${user.role}">${user.role}</span>
      </span>
      <button class="btn btn-outline btn-sm" id="logoutBtn"><i class="fa-solid fa-sign-out-alt"></i> Logout</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  }

  btnGoShop.addEventListener('click', () => { setActiveTab(btnGoShop); renderView(); });
  btnGoOrders.addEventListener('click', () => { setActiveTab(btnGoOrders); renderView(); });
  btnGoAdmin.addEventListener('click', () => { setActiveTab(btnGoAdmin); renderView(); });
  logoBrand.addEventListener('click', (e) => { e.preventDefault(); setActiveTab(btnGoShop); renderView(); });

  function setActiveTab(activeBtn) {
    btnGoShop.classList.remove('active'); btnGoOrders.classList.remove('active'); btnGoAdmin.classList.remove('active');
    activeBtn.classList.add('active');
  }

  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    loginForm.classList.add('active'); registerForm.classList.remove('active');
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    registerForm.classList.add('active'); loginForm.classList.remove('active');
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        token = data.token; user = data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        loginForm.reset();
        showToast(`Signed in as ${user.name}`);
        renderView();
      } else { showToast(data.error || 'Invalid credentials.', 'error'); }
    } catch (err) { showToast('Login API network error.', 'error'); }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, role })
      });
      if (res.ok) { showToast('Success! Please login.'); registerForm.reset(); tabLogin.click(); }
    } catch (err) { showToast('Network error.', 'error'); }
  });

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST', headers: getHeaders() }); } catch (e) {}
    token = ''; user = null;
    localStorage.removeItem('token'); localStorage.removeItem('user');
    cart = []; localStorage.removeItem('cart');
    showToast('Logged out.');
    setActiveTab(btnGoShop);
    renderView();
  }

  async function loadStorefront() { await fetchProducts(); renderProducts(); }

  async function fetchProducts(search = '', category = '') {
    try {
      let url = `/api/products?search=${encodeURIComponent(search)}`;
      if (category && category !== 'All') { url += `&category=${encodeURIComponent(category)}`; }
      const res = await fetch(url, { headers: getHeaders() });
      products = await res.json();
    } catch (err) { showToast('Failed to load products.', 'error'); }
  }

  function renderProducts() {
    productsGrid.innerHTML = '';
    if (products.length === 0) {
      productsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No products found.</div>`;
      return;
    }
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      let stockClass = 'in', stockText = `In Stock (${p.stock})`, isOut = false;
      if (p.stock === 0) { stockClass = 'out'; stockText = 'Out of Stock'; isOut = true; }
      else if (p.stock < 5) { stockClass = 'low'; stockText = `Low Stock (${p.stock})`; }

      const imgHtml = p.image_url ? `<img src="${p.image_url}" class="prod-img" alt="${p.name}">`
        : `<div class="mock-img-placeholder"><i class="fa-solid fa-microchip"></i></div>`;

      card.innerHTML = `
        <div class="product-img-box">${imgHtml}</div>
        <div class="product-details">
          <span class="prod-cat">${p.category}</span>
          <h4 class="prod-name">${p.name}</h4>
          <p class="prod-desc">${p.description}</p>
          <div class="prod-footer-row">
            <span class="prod-price">$${p.price.toFixed(2)}</span>
            <span class="prod-stock ${stockClass}">${stockText}</span>
          </div>
          <button class="btn btn-primary w-full btn-add-cart" data-id="${p.id}" ${isOut ? 'disabled' : ''}>
            ${isOut ? 'Sold Out' : 'Add to Cart <i class="fa-solid fa-cart-plus"></i>'}
          </button>
        </div>
      `;
      productsGrid.appendChild(card);
    });

    document.querySelectorAll('.btn-add-cart').forEach(btn => {
      btn.addEventListener('click', () => { addToCart(parseInt(btn.getAttribute('data-id'))); });
    });
  }

  shopSearch.addEventListener('input', () => {
    fetchProducts(shopSearch.value, document.querySelector('#shopCategories .cat-btn.active').getAttribute('data-cat')).then(renderProducts);
  });

  catFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catFilterBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
      fetchProducts(shopSearch.value, btn.getAttribute('data-cat')).then(renderProducts);
    });
  });

  function addToCart(pId) {
    const product = products.find(p => p.id === pId);
    if (!product) return;
    const existing = cart.find(item => item.product_id === pId);
    if (existing) {
      if (existing.quantity >= product.stock) { showToast(`Stock limit reached.`, 'error'); return; }
      existing.quantity += 1;
    } else {
      cart.push({ product_id: pId, name: product.name, price: product.price, quantity: 1, max_stock: product.stock });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    showToast(`Added '${product.name}' to cart.`);
    updateCartUI();
  }

  function updateCartUI() {
    cartBadgeCount.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartDrawerItems.innerHTML = '';
    let total = 0.0;
    if (cart.length === 0) {
      cartDrawerItems.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem 0;">Empty Cart.</div>`;
      cartSubtotal.innerText = '$0.00'; checkoutBtn.disabled = true;
      return;
    }
    checkoutBtn.disabled = false;

    cart.forEach(item => {
      total += item.price * item.quantity;
      const itemDiv = document.createElement('div');
      itemDiv.className = 'cart-item';
      itemDiv.innerHTML = `
        <div class="cart-item-details">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-qty-row">
            <button class="qty-btn btn-qty-minus" data-id="${item.product_id}">-</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="qty-btn btn-qty-plus" data-id="${item.product_id}">+</button>
          </div>
        </div>
        <div><button class="remove-item-btn" data-id="${item.product_id}"><i class="fa-solid fa-trash-can"></i></button></div>
      `;
      cartDrawerItems.appendChild(itemDiv);
    });
    cartSubtotal.innerText = `$${total.toFixed(2)}`;

    document.querySelectorAll('.btn-qty-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = cart.find(i => i.product_id === parseInt(btn.getAttribute('data-id')));
        if (item.quantity > 1) { item.quantity -= 1; } else { cart = cart.filter(i => i.product_id !== item.product_id); }
        localStorage.setItem('cart', JSON.stringify(cart)); updateCartUI();
      });
    });

    document.querySelectorAll('.btn-qty-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = cart.find(i => i.product_id === parseInt(btn.getAttribute('data-id')));
        if (item.quantity < item.max_stock) { item.quantity += 1; } else { showToast(`Stock limit reached.`, 'error'); }
        localStorage.setItem('cart', JSON.stringify(cart)); updateCartUI();
      });
    });

    document.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        cart = cart.filter(i => i.product_id !== parseInt(btn.getAttribute('data-id')));
        localStorage.setItem('cart', JSON.stringify(cart)); updateCartUI();
      });
    });
  }

  openCartDrawerBtn.addEventListener('click', () => cartDrawerOverlay.classList.add('active'));
  const closeCart = () => cartDrawerOverlay.classList.remove('active');
  closeCartDrawerBtn.addEventListener('click', closeCart);
  cartDrawerOverlay.addEventListener('click', (e) => { if (e.target === cartDrawerOverlay) closeCart(); });

  checkoutBtn.addEventListener('click', () => {
    closeCart();
    checkoutTotalVal.innerText = cartSubtotal.innerText;
    checkoutModal.classList.add('active');
  });

  const closeCheckout = () => { checkoutModal.classList.remove('active'); checkoutForm.reset(); };
  closeCheckoutModalBtn.addEventListener('click', closeCheckout);
  cancelCheckoutBtn.addEventListener('click', closeCheckout);

  const cardNumber = document.getElementById('cardNumber');
  cardNumber.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += value[i];
    }
    e.target.value = formatted;
  });

  const cardExpiry = document.getElementById('cardExpiry');
  cardExpiry.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    e.target.value = (val.length > 2) ? val.slice(0,2) + '/' + val.slice(2,4) : val;
  });

  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('placeOrderBtn');
    btn.disabled = true; btn.innerHTML = 'Processing... <i class="fa-solid fa-spinner fa-spin"></i>';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: getHeaders(), body: JSON.stringify({ cart: cart, card_number: cardNumber.value })
      });
      if (res.ok) {
        showToast('Payment successful!'); cart = []; localStorage.removeItem('cart'); closeCheckout();
        setActiveTab(btnGoOrders); renderView();
      }
    } catch (err) { showToast('Transaction failed.', 'error'); }
    finally { btn.disabled = false; btn.innerHTML = 'Pay & Place Order'; }
  });

  async function loadOrdersHistory() {
    try {
      const res = await fetch('/api/orders', { headers: getHeaders() });
      orders = await res.json(); renderOrdersHistory();
    } catch (err) { showToast('Failed to load history.', 'error'); }
  }

  function renderOrdersHistory() {
    customerOrdersList.innerHTML = '';
    if (orders.length === 0) {
      customerOrdersList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 4rem 0;">No receipts found.</div>`;
      return;
    }
    orders.forEach(order => {
      let itemsRows = '';
      order.items.forEach(item => {
        itemsRows += `
          <tr>
            <td>${item.product_name}</td>
            <td style="text-align: center;">x${item.quantity}</td>
            <td style="text-align: right;">$${item.price.toFixed(2)}</td>
            <td style="text-align: right; font-weight:500;">$${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `;
      });

      customerOrdersList.appendChild(Object.assign(document.createElement('div'), {
        className: 'order-card',
        innerHTML: `
          <div class="order-header-row">
            <div class="order-title-info"><h3>Invoice #${order.id}</h3><span>Success</span></div>
            <div class="order-meta-info"><span class="order-status">Completed</span><span class="order-date-text">${new Date(order.created_at).toLocaleString()}</span></div>
          </div>
          <table class="order-items-table"><tbody>${itemsRows}</tbody></table>
          <div class="order-summary-block">
            <span class="payment-details-tag">Card: **** **** **** ${order.card_last4 || '4242'}</span>
            <div>Total: <strong style="color:var(--primary); font-size: 1.25rem;">$${order.total_amount.toFixed(2)}</strong></div>
          </div>
          <div style="background: #090d16; border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-top: 1.5rem; font-family: monospace; font-size: 0.85rem;">
            <div style="color: var(--primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.4rem; margin-bottom: 0.5rem; display:flex; justify-content:space-between;">
              <span><i class="fa-solid fa-envelope"></i> SMTP Server Confirm Logger</span>
            </div>
            <div>To: ${user.email}</div>
            <div>Subject: Purchase Confirmation Reference #${order.id}</div>
            <div style="margin-top: 0.5rem; color: var(--text-secondary);">Your payment of $${order.total_amount.toFixed(2)} has been cleared. Thank you for shopping!</div>
          </div>
        `
      }));
    });
  }

  async function loadAdminDashboard() {
    try {
      const res = await fetch('/api/analytics', { headers: getHeaders() });
      analyticsData = await res.json();
      await fetchProducts(); renderKPIs(); renderInventoryTable();
      setTimeout(() => { drawSalesTrendChart(); drawTopProductsChart(); }, 100);
    } catch (err) { showToast('Analytics fetch error.', 'error'); }
  }

  function renderKPIs() {
    if (!analyticsData) return;
    const k = analyticsData.kpis;
    document.getElementById('kpiTotalSales').innerText = `$${k.total_sales.toFixed(2)}`;
    document.getElementById('kpiTotalOrders').innerText = k.total_orders;
    document.getElementById('kpiAvgOrder').innerText = `$${k.avg_order_value.toFixed(2)}`;
    document.getElementById('kpiTotalCustomers').innerText = k.total_customers;
  }

  function renderInventoryTable() {
    adminProductsTable.innerHTML = '';
    products.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 500;">${p.name}</td>
        <td><span class="role-badge admin">${p.category}</span></td>
        <td>$${p.price.toFixed(2)}</td>
        <td style="font-weight:600; color:${(p.stock < 5) ? 'var(--error)' : 'var(--text-primary)'}">${p.stock}</td>
        <td style="text-align: right;">
          <div class="admin-action-btns">
            <button class="btn btn-outline btn-sm btn-prod-edit" data-id="${p.id}">Edit</button>
            <button class="btn btn-danger btn-sm btn-prod-delete" data-id="${p.id}">Delete</button>
          </div>
        </td>
      `;
      adminProductsTable.appendChild(tr);
    });

    document.querySelectorAll('.btn-prod-edit').forEach(btn => {
      btn.addEventListener('click', () => { openProductModal(products.find(p => p.id === parseInt(btn.getAttribute('data-id')))); });
    });

    document.querySelectorAll('.btn-prod-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete product?')) {
          await fetch(`/api/products/${btn.getAttribute('data-id')}`, { method: 'DELETE', headers: getHeaders() });
          loadAdminDashboard();
        }
      });
    });
  }

  function openProductModal(prod = null) {
    productModal.classList.add('active');
    document.getElementById('uploadStatusText').innerText = '';
    if (prod) {
      productModalTitle.innerText = 'Modify Product Details';
      editProductId.value = prod.id;
      document.getElementById('productName').value = prod.name;
      document.getElementById('productPrice').value = prod.price;
      document.getElementById('productStock').value = prod.stock;
      document.getElementById('productCategory').value = prod.category;
      document.getElementById('productDescription').value = prod.description;
      document.getElementById('productImageUrl').value = prod.image_url || '';
    } else {
      productModalTitle.innerText = 'Add New Store Product'; editProductId.value = ''; productForm.reset();
      document.getElementById('productImageUrl').value = '';
    }
  }

  function closeProductModal() { productModal.classList.remove('active'); productForm.reset(); }
  openProductModalBtn.addEventListener('click', () => openProductModal());
  closeProductModalBtn.forEach(btn => btn.addEventListener('click', closeProductModal));

  const fileInput = document.getElementById('productImage');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0]; if (!file) return;
    const txt = document.getElementById('uploadStatusText'); txt.innerText = 'Uploading...';
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { headers: { 'Authorization': `Bearer ${token}` }, method: 'POST', body: fd });
      const d = await res.json();
      if (res.ok) {
        document.getElementById('productImageUrl').value = d.url;
        txt.innerText = 'Success!'; txt.style.color = 'var(--accent)';
      }
    } catch (e) { txt.innerText = 'Error.'; }
  });

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editProductId.value;
    const pData = {
      name: document.getElementById('productName').value,
      price: parseFloat(document.getElementById('productPrice').value),
      stock: parseInt(document.getElementById('productStock').value),
      category: document.getElementById('productCategory').value,
      description: document.getElementById('productDescription').value,
      image_url: document.getElementById('productImageUrl').value
    };
    try {
      const res = await fetch(id !== '' ? `/api/products/${id}` : '/api/products', {
        method: id !== '' ? 'PUT' : 'POST', headers: getHeaders(), body: JSON.stringify(pData)
      });
      if (res.ok) { showToast('Product saved!'); closeProductModal(); loadAdminDashboard(); }
    } catch (e) { showToast('Save error.', 'error'); }
  });

  function drawSalesTrendChart() {
    const canvas = document.getElementById('salesTrendChart'); if (!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const data = (analyticsData && analyticsData.charts.daily_sales) || [];
    if (data.length === 0) { ctx.fillStyle = '#64748b'; ctx.font = '14px Inter'; ctx.fillText('No sales datasets.', 70, 120); return; }
    
    const pad = 40, w = canvas.width - (pad*2), h = canvas.height - (pad*2);
    const maxVal = Math.max(...data.map(d => d.daily_sum), 100);

    ctx.strokeStyle = '#1e253c'; ctx.lineWidth = 1; ctx.fillStyle = '#64748b'; ctx.font = '10px Inter';
    for (let i = 0; i <= 4; i++) {
      const y = pad + (h * (i/4)), val = maxVal * (1 - (i/4));
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(canvas.width - pad, y); ctx.stroke();
      ctx.fillText(`$${val.toFixed(0)}`, 10, y + 3);
    }

    const pts = [], stepX = w / (data.length - 1 || 1);
    data.forEach((d, idx) => {
      pts.push({ x: pad + (idx * stepX), y: pad + h - ((d.daily_sum/maxVal) * h), label: d.sale_day });
    });

    const grad = ctx.createLinearGradient(0, pad, 0, pad + h);
    grad.addColorStop(0, 'rgba(0, 242, 254, 0.4)'); grad.addColorStop(1, 'rgba(0, 242, 254, 0.0)');
    ctx.beginPath(); ctx.moveTo(pts[0].x, pad + h); pts.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.lineTo(pts[pts.length-1].x, pad + h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.strokeStyle = '#00f2fe'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.forEach(pt => ctx.lineTo(pt.x, pt.y)); ctx.stroke();

    ctx.fillStyle = '#9b51e0';
    pts.forEach(pt => {
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#64748b'; ctx.fillText(pt.label, pt.x - 12, pad + h + 18); ctx.fillStyle = '#9b51e0';
    });
  }

  function drawTopProductsChart() {
    const canvas = document.getElementById('topProductsChart'); if (!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const data = (analyticsData && analyticsData.charts.top_products) || [];
    if (data.length === 0) { ctx.fillStyle = '#64748b'; ctx.font = '14px Inter'; ctx.fillText('No product charts.', 60, 120); return; }

    const padL = 140, padR = 40, padY = 30, w = canvas.width - padL - padR, h = canvas.height - (padY*2);
    const maxVal = Math.max(...data.map(d => d.revenue), 100);
    const barH = Math.min(24, h / (data.length || 1) - 10), stepY = h / (data.length || 1);

    data.forEach((d, idx) => {
      const y = padY + (idx * stepY), barW = (d.revenue / maxVal) * w;
      ctx.fillStyle = '#94a3b8'; ctx.font = '11px Inter';
      ctx.fillText(d.name.length > 18 ? d.name.slice(0, 16) + '...' : d.name, 10, y + (barH/2) + 4);

      const grad = ctx.createLinearGradient(padL, 0, padL + barW, 0);
      grad.addColorStop(0, '#9b51e0'); grad.addColorStop(1, '#00f2fe');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(padL, y, barW, barH, 4); ctx.fill();

      ctx.fillStyle = '#00ff87'; ctx.font = 'bold 10px Inter';
      ctx.fillText(`$${d.revenue.toFixed(0)}`, padL + barW + 8, y + (barH/2) + 4);
    });
  }

  renderView();
});