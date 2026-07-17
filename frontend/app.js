// ==========================================================
// VORTEX MARKETPLACE CORE ENGINE - APPLICATION CONTROLLER
// ==========================================================

let generatedValidationCode = "";
let pendingRegistrationPayload = {};
let activeUserSession = JSON.parse(sessionStorage.getItem("vortex_active_user")) || null;

const sellersDatabase = {
  "Apex Labs": { rating: 4.8, shippingOrigin: "Karachi, Pakistan", responseRate: "98%" },
  "KeyChron Corp": { rating: 4.9, shippingOrigin: "Lahore, Pakistan", responseRate: "100%" },
  "Metro Tech Outfitters": { rating: 4.5, shippingOrigin: "Islamabad, Pakistan", responseRate: "92%" }
};

// LocalStorage se dynamic products load karna
let productsData = JSON.parse(localStorage.getItem("realProductsDb")) || [];

// Fallback logic: 1st two dummy products are now removed from array completely.
if (productsData.length === 0) {
  productsData = [
    {
      id: 3,
      name: "Nestle Products",
      price: 2500,
      originalPrice: 8900,
      brand: "Nestle",
      sku: "NES-90812-BABY",
      shippingFee: 210,
      category: "Beverages",
      images: ["https://images.unsplash.com/photo-1544206752-4f52abf20457?w=600"],
      inBox: "1x Nestle Baby Pack",
      desc: "Its healthy for Babies etc......",
      owner: "Malik Official Store",
      sellerEmail: "malik@vortex.com",
      rating: 4.5,
      reviews: []
    },
    {
      id: 4,
      name: "Mechanical Pro Keyboard",
      price: 2400,
      originalPrice: 4800,
      brand: "Vortex Pro",
      sku: "MECH-PRO-RGB-26",
      shippingFee: 180,
      category: "Accessories",
      images: ["https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600"],
      inBox: "1x Mechanical Keyboard, User Guide",
      desc: "Precision layout with RGB custom micro controllers...",
      owner: "Malik Official Store",
      sellerEmail: "malik@vortex.com",
      rating: 4.6,
      reviews: []
    }
  ];
  localStorage.setItem("realProductsDb", JSON.stringify(productsData));
}

// App Layout & Interaction States
let pendingCartItem = null;
let activeImageIndex = 0; 
let currentProductSelected = null;
let buyQuantity = 1;

// Setup Session, Header & Grids on load
window.addEventListener("DOMContentLoaded", () => {
  productsData = JSON.parse(localStorage.getItem("realProductsDb")) || productsData;
  updateHeaderSessionUI();
  renderProductsGrid(productsData);
  updateCartBadgeCount();

  const previewId = sessionStorage.getItem("previewProductId");
  if (previewId) {
    sessionStorage.removeItem("previewProductId");
    openProductDetails(parseInt(previewId));
  }

  initializeGoogleLibrary();
});

function updateHeaderSessionUI() {
  const authBtnText = document.getElementById("authButtonText");
  if (activeUserSession) {
    authBtnText.innerText = activeUserSession.ownerName || activeUserSession.email.split('@')[0];
  } else {
    authBtnText.innerText = "Login / Register";
  }
}

function switchScreenView(view) {
  document.getElementById("homePageContent").style.display = (view === 'home') ? 'block' : 'none';
  document.getElementById("productDetailsPage").style.display = (view === 'details') ? 'block' : 'none';
  document.getElementById("cartPage").style.display = (view === 'cart') ? 'block' : 'none';

  const navHomeLink = document.getElementById("navHomeLink");
  if (navHomeLink) {
    navHomeLink.classList.toggle("active", view === 'home');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackToHome() {
  activeImageIndex = 0;
  currentProductSelected = null;
  buyQuantity = 1;
  switchScreenView('home');
  productsData = JSON.parse(localStorage.getItem("realProductsDb")) || productsData;
  renderProductsGrid(productsData);
}

function initializeGoogleLibrary() {
  if (typeof google !== 'undefined') {
    google.accounts.id.initialize({
      client_id: "661726118080-3ulqgqj7i4692hlssn0v6rh8mhbshetl.apps.googleusercontent.com",
      callback: handleGoogleCredentialResponse
    });
  } else {
    console.warn("Google Client Library not fully initialized yet.");
  }
}

function initiateGoogleLogin() {
  if (typeof google !== 'undefined') {
    google.accounts.id.prompt();
  } else {
    alert("Google Authentication SDK still loading. Please wait or try again.");
  }
}

function handleGoogleCredentialResponse(response) {
  try {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const profile = JSON.parse(jsonPayload);
    const userEmail = profile.email;

    activeUserSession = {
      ownerName: profile.name,
      email: userEmail,
      role: "buyer",
      status: "active"
    };
    sessionStorage.setItem("vortex_active_user", JSON.stringify(activeUserSession));
    
    updateHeaderSessionUI();
    updateCartBadgeCount();
    toggleAuthModal();
    alert(`🔓 Logged in successfully via Google as ${userEmail}`);

    if (pendingCartItem) {
      executeAddToCart(pendingCartItem.id);
      pendingCartItem = null;
    }
  } catch (err) {
    console.error("Failed to decode standard JWT token response from Google:", err);
    alert("Error while authenticating with Google.");
  }
}

// Fixed UI display: Removed category label overlapping the item image directly.
function renderProductsGrid(itemsList) {
  const container = document.getElementById("productsGridContainer");
  if (!container) return;
  container.innerHTML = "";

  if (itemsList.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">No items currently available.</p>`;
    return;
  }

  itemsList.forEach(p => {
    const displayImg = (p.images && p.images.length > 0) ? p.images[0] : 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=400';
    const productCard = document.createElement("div");
    productCard.className = "product-card-vortex"; 
    productCard.style.cursor = "pointer";
    productCard.setAttribute("onclick", `openProductDetails(${p.id})`);

    productCard.innerHTML = `
      <div style="position: relative; overflow: hidden; border-radius: 12px 12px 0 0;">
          <img src="${displayImg}" alt="${p.name}" style="width: 100%; height: 200px; object-fit: cover;">
      </div>
      <div style="padding: 16px;">
          <h3 style="font-size: 16px; margin: 0 0 8px 0; color: #0f172a; font-weight: 700;">${p.name}</h3>
          <p style="font-size: 12px; color: #64748b; margin: 0 0 12px 0; line-height: 1.4;">${p.desc.substring(0, 70)}...</p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                  <span style="font-size: 18px; font-weight: 800; color: #0f172a;">Rs. ${p.price.toLocaleString()}</span>
              </div>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 10px;">Category: <strong style="color:#0f172a;">${p.category}</strong> | Seller: <strong>${p.owner}</strong></div>
      </div>
    `;
    container.appendChild(productCard);
  });
}

function filterCategory(cat) {
  productsData = JSON.parse(localStorage.getItem("realProductsDb")) || productsData;

  document.querySelectorAll(".filter-badge").forEach(el => el.classList.remove("active"));
  if (event && event.target) {
    event.target.classList.add("active");
  }

  if (cat === 'all') {
    renderProductsGrid(productsData);
  } else {
    renderProductsGrid(productsData.filter(p => p.category.toLowerCase() === cat.toLowerCase()));
  }
}

function openProductDetails(productId) {
  productsData = JSON.parse(localStorage.getItem("realProductsDb")) || productsData;
  const product = productsData.find(p => p.id === productId);
  if (!product) return;

  currentProductSelected = product;
  buyQuantity = 1; 
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  switchScreenView('details');
  renderProductSpecsMarkup(product);
}

function renderProductSpecsMarkup(product) {
  const detailsContainer = document.getElementById("productDetailsPage");
  if (!detailsContainer) return;

  let thumbnailsHTML = "";
  if (product.images && product.images.length > 0) {
    product.images.forEach((img, idx) => {
      const activeStyle = (idx === activeImageIndex) ? "border: 2px solid #f97316; opacity: 1;" : "border: 1px solid #e2e8f0; opacity: 0.6;";
      thumbnailsHTML += `
        <img src="${img}" onclick="switchCarouselImage(${idx})" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; cursor: pointer; ${activeStyle} transition: all 0.2s;">
      `;
    });
  }

  const currentDisplayImg = (product.images && product.images.length > 0) ? product.images[activeImageIndex] : 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=600';
  const originalPrice = product.originalPrice || product.price;
  const discountPercent = originalPrice > product.price ? Math.round(((originalPrice - product.price) / originalPrice) * 100) : 0;
  const trackingSeller = sellersDatabase[product.owner] || { rating: 4.8, shippingOrigin: "Pakistan", responseRate: "95%" };

  let specsBulletsHTML = "";
  if (product.desc) {
    const lines = product.desc.split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        specsBulletsHTML += `<li style="margin-bottom: 8px; font-size: 13px; color: #475569; list-style-type: square;">${line.trim()}</li>`;
      }
    });
  }

  detailsContainer.innerHTML = `
    <div style="font-size: 12px; color: #64748b; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
      <span style="cursor: pointer; font-weight: 600;" onclick="goBackToHome()">Home</span>
      <i class="fa-solid fa-chevron-right" style="font-size: 10px;"></i>
      <span>${product.category}</span>
      <i class="fa-solid fa-chevron-right" style="font-size: 10px;"></i>
      <span style="color: #0f172a; font-weight: 700;">${product.name}</span>
    </div>
    
    <button onclick="goBackToHome()" style="background: none; border: none; font-size: 14px; font-weight: 600; color: #f97316; cursor: pointer; margin-bottom: 20px; display: flex; align-items: center; gap: 6px;">
        <i class="fa-solid fa-arrow-left"></i> Back to catalog
    </button>

    <div class="details-grid" style="display: grid; grid-template-columns: 1fr 1.1fr 0.9fr; gap: 20px; background: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <div style="width: 100%; height: 350px; overflow: hidden; border-radius: 8px; border: 1px solid #f1f5f9; background: #fafafa;">
          <img src="${currentDisplayImg}" style="width: 100%; height: 100%; object-fit: contain;">
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-start;">
          ${thumbnailsHTML}
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 15px; border-right: 1px solid #f1f5f9; padding-right: 20px;">
        <div>
          <span style="background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 4px; display: inline-block; margin-bottom: 10px;">
            ${product.category}
          </span>
          ${discountPercent > 0 ? `
            <div style="background: #fee2e2; color: #ef4444; font-size: 11px; font-weight: 800; padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 5px; margin-bottom: 10px; margin-left: 5px;">
              <i class="fa-solid fa-bolt"></i> FLASH SALE ACTIVE
            </div>
          ` : ''}
          <h1 style="font-size: 22px; color: #0f172a; font-weight: 800; line-height: 1.3; margin: 0 0 8px 0;">${product.name}</h1>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: #64748b; margin-bottom: 10px;">
            <div style="color: #fbbf24; display: flex; align-items: center; gap: 3px;">
              <i class="fa-solid fa-star"></i>
              <strong style="color: #0f172a;">${product.rating || '4.9'}</strong>
            </div>
            <span>|</span>
            <span>Brand: <strong style="color: #2563eb;">${product.brand || 'No Brand'}</strong></span>
          </div>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 0;">
        
        <div style="background: #fafafa; padding: 15px; border-radius: 8px;">
          <div style="display: flex; align-items: baseline; gap: 10px;">
            <span style="font-size: 28px; font-weight: 900; color: #f97316;">Rs. ${product.price.toLocaleString()}</span>
            ${discountPercent > 0 ? `
              <span style="font-size: 14px; text-decoration: line-through; color: #94a3b8;">Rs. ${originalPrice.toLocaleString()}</span>
              <span style="font-size: 13px; font-weight: 700; color: #ef4444;">-${discountPercent}%</span>
            ` : ''}
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 15px; margin-top: 5px;">
          <span style="font-size: 13px; font-weight: 700; color: #475569;">Quantity:</span>
          <div style="display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #fff; width: 120px; height: 38px;">
            <button onclick="adjustDetailsQty(-1)" style="flex:1; border:none; background:none; font-size:16px; font-weight:bold; cursor:pointer; color:#64748b; display:flex; align-items:center; justify-content:center; height:100%;">–</button>
            <span id="qtyDetailsDisplay" style="flex:1; font-size:14px; font-weight:700; text-align:center; display:flex; align-items:center; justify-content:center; height:100%; border-left:1px solid #cbd5e1; border-right:1px solid #cbd5e1;">${buyQuantity}</span>
            <button onclick="adjustDetailsQty(1)" style="flex:1; border:none; background:none; font-size:16px; font-weight:bold; cursor:pointer; color:#64748b; display:flex; align-items:center; justify-content:center; height:100%;">+</button>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 10px;">
          <button class="checkout-action-btn" onclick="executeBuyNow(${product.id})" style="flex: 1; height: 46px; background: #f97316;">Buy Now</button>
          <button class="checkout-action-btn" onclick="executeAddToCart(${product.id})" style="flex: 1; height: 46px; background: #2563eb;">Add to Cart</button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Delivery Options</div>
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <i class="fa-solid fa-location-dot" style="color: #64748b; margin-top: 3px; font-size: 14px;"></i>
            <div style="font-size: 13px;">
              <span style="color: #0f172a; font-weight: 600;">Sindh, Karachi, Gulshan-e-Iqbal, Block 15</span>
              <span style="color: #2563eb; font-weight: 700; font-size: 11px; cursor: pointer; margin-left: 8px;">CHANGE</span>
            </div>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9;">
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <i class="fa-solid fa-truck" style="color: #64748b; margin-top: 3px; font-size: 14px;"></i>
            <div style="font-size: 13px; display: flex; flex-direction: column; flex-grow: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span style="font-weight: 600; color: #334155;">Standard Delivery</span>
                <span style="font-weight: 700; color: #0f172a;">Rs. ${product.shippingFee || 260}</span>
              </div>
              <span style="font-size: 11px; color: #64748b; margin-top: 2px;">Estimated 2-4 business days.</span>
            </div>
          </div>
          <div style="display: flex; gap: 10px; align-items: flex-start;">
            <i class="fa-solid fa-wallet" style="color: #10b981; margin-top: 3px; font-size: 14px;"></i>
            <div style="font-size: 13px;">
              <span style="font-weight: 600; color: #334155;">Cash on Delivery Available</span>
            </div>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9;">
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Service Guarantees</div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <i class="fa-solid fa-arrow-rotate-left" style="color: #64748b; font-size: 14px;"></i>
            <span style="font-size: 13px; font-weight: 600; color: #334155;">14 Days Easy Returns</span>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <i class="fa-solid fa-shield-halved" style="color: #64748b; font-size: 14px;"></i>
            <span style="font-size: 13px; font-weight: 600; color: #334155;">Vortex Verified Warranty</span>
          </div>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; gap: 12px; background: #fafafa;">
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Sold By</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${product.owner}</div>
              <span style="background: #fef3c7; color: #d97706; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block;"> Flagship Store </span>
            </div>
            <button style="border: 1px solid #2563eb; background: none; color: #2563eb; font-weight: 700; font-size: 11px; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
              <i class="fa-regular fa-comment-dots"></i> Chat Now
            </button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center;">
            <div>
              <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${trackingSeller.rating * 20}%</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Positive Seller Rating</div>
            </div>
            <div>
              <div style="font-size: 16px; font-weight: 800; color: #0f172a;">${trackingSeller.responseRate}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Chat Response Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 25px; padding: 25px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
      <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;"> Product Details of ${product.name} </h3>
      <ul style="padding-left: 20px; line-height: 1.6;"> ${specsBulletsHTML} </ul>
      <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;"> Specifications of ${product.name} </h3>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
          <span style="color: #64748b;">Brand</span>
          <span style="font-weight: 700; color: #334155;">${product.brand || 'No Brand'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
          <span style="color: #64748b;">SKU</span>
          <span style="font-weight: 700; color: #334155;">${product.sku || 'N/A'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
          <span style="color: #64748b;">What's in the box</span>
          <span style="font-weight: 700; color: #334155; max-width: 250px; text-align: right;">${product.inBox || '1x Item Package'}</span>
        </div>
      </div>
    </div>
  `;
}

function adjustDetailsQty(amount) {
  buyQuantity += amount;
  if (buyQuantity < 1) buyQuantity = 1;
  document.getElementById("qtyDetailsDisplay").innerText = buyQuantity;
}

function switchCarouselImage(index) {
  activeImageIndex = index;
  if (currentProductSelected) {
    renderProductSpecsMarkup(currentProductSelected);
  }
}

function executeBuyNow(productId) {
  if (!activeUserSession) {
    alert("⚠️ Authentication Required: Please log in to your account first.");
    toggleAuthModal('login');
    return;
  }
  document.getElementById("checkoutProductId").value = productId;
  toggleCheckoutModal();
}

function executeAddToCart(productId) {
  if (!activeUserSession) {
    alert("⚠️ Authentication Required: Please log in to your account first.");
    pendingCartItem = productsData.find(p => p.id === productId);
    toggleAuthModal('login');
    return;
  }

  productsData = JSON.parse(localStorage.getItem("realProductsDb")) || productsData;
  const product = productsData.find(p => p.id === productId);
  if (!product) return;

  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  let cart = JSON.parse(localStorage.getItem(userCartKey)) || [];

  const qtyToAdd = currentProductSelected && currentProductSelected.id === productId ? buyQuantity : 1;
  const existingIndex = cart.findIndex(item => item.id === productId);

  if (existingIndex > -1) {
    cart[existingIndex].qty += qtyToAdd;
  } else {
    cart.push({ 
      id: product.id,
      title: product.name,
      price: product.price,
      originalPrice: product.originalPrice || product.price,
      category: product.category,
      seller: product.owner,
      image: (product.images && product.images.length > 0) ? product.images[0] : 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=400',
      qty: qtyToAdd,
      selected: true 
    });
  }

  localStorage.setItem(userCartKey, JSON.stringify(cart));
  updateCartBadgeCount();

  alert(`🎉 Added "${product.name}" successfully into your cart.`);
  navigateToCartPage();
}

function updateCartBadgeCount() {
  const badge = document.getElementById("cartCountBadge");
  if (!badge) return;
  
  if (!activeUserSession) {
    badge.innerText = "0";
    return;
  }
  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  const cart = JSON.parse(localStorage.getItem(userCartKey)) || [];
  const count = cart.reduce((total, item) => total + item.qty, 0);
  badge.innerText = count;
}

function navigateToCartPage() {
  if (!activeUserSession) {
    alert("⚠️ Please sign in to access your customized Shopping Cart.");
    toggleAuthModal('login');
    return;
  }
  switchScreenView('cart');
  renderCartPageItems();
}

function renderCartPageItems() {
  const wrapper = document.getElementById("cartGridWrapper");
  if (!wrapper) return;

  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  const cart = JSON.parse(localStorage.getItem(userCartKey)) || [];

  if (cart.length === 0) {
    wrapper.innerHTML = `
      <div style="text-align: center; padding: 50px; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <i class="fa-solid fa-basket-shopping" style="font-size: 50px; color: #cbd5e1; margin-bottom: 15px;"></i>
          <h3 style="color: #0f172a;">Your Vortex Cart is empty</h3>
          <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">Add high-tier performance gear and products inside.</p>
          <button onclick="goBackToHome()" class="auth-submit-btn" style="width: auto; padding: 10px 25px;">Go Shop Now</button>
      </div>
    `;
    return;
  }

  const groupedBySeller = {};
  cart.forEach((item, index) => {
    const seller = item.seller || "Vortex Store";
    if (!groupedBySeller[seller]) {
      groupedBySeller[seller] = [];
    }
    groupedBySeller[seller].push({ ...item, originalIndex: index });
  });

  const totalSelected = cart.filter(item => item.selected).length;
  const isAllChecked = totalSelected === cart.length;

  let sellersHTML = "";
  for (const seller in groupedBySeller) {
    let itemsHTML = "";
    groupedBySeller[seller].forEach(item => {
      itemsHTML += `
        <div class="cart-item-row">
            <input type="checkbox" class="cart-checkbox" ${item.selected ? 'checked' : ''} onchange="toggleCartItemSelection(${item.originalIndex})">
            <img src="${item.image}" class="cart-item-img" alt="${item.title}">
            <div class="cart-item-details">
                <h4 class="cart-item-title">${item.title}</h4>
                <p class="cart-item-seller">Seller: ${seller}</p>
                <div class="quantity-controller">
                    <button class="qty-btn" onclick="updateCartItemQty(${item.originalIndex}, -1)">-</button>
                    <input type="text" class="qty-val" value="${item.qty}" readonly>
                    <button class="qty-btn" onclick="updateCartItemQty(${item.originalIndex}, 1)">+</button>
                </div>
            </div>
            <div class="cart-item-price-block">
                <div class="cart-item-current-price">Rs. ${(item.price * item.qty).toLocaleString()}</div>
                <div class="cart-item-old-price">Rs. ${(item.originalPrice * item.qty).toLocaleString()}</div>
                <button class="delete-item-btn" onclick="deleteCartItem(${item.originalIndex})" style="margin-top: 10px;">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </div>
        </div>
      `;
    });

    sellersHTML += `
      <div class="cart-merchant-section">
          <div class="merchant-section-header">
              <input type="checkbox" class="cart-checkbox" ${groupedBySeller[seller].every(i => i.selected) ? 'checked' : ''} onchange="toggleSellerGroupSelection('${seller}', this.checked)">
              <i class="fa-solid fa-store" style="color: #64748b;"></i> ${seller}
          </div>
          ${itemsHTML}
      </div>
    `;
  }

  const subtotal = cart.reduce((sum, item) => item.selected ? sum + (item.price * item.qty) : sum, 0);
  const shippingFee = subtotal > 0 ? 210 : 0; 
  const totalPayable = subtotal + shippingFee;

  wrapper.innerHTML = `
    <div class="cart-grid-container">
        <div class="cart-items-column">
            <div class="cart-master-bar">
                <div>
                    <input type="checkbox" class="cart-checkbox" id="masterSelectAll" ${isAllChecked ? 'checked' : ''} onchange="toggleSelectAllCart(this.checked)">
                    <label for="masterSelectAll" style="margin-left: 8px; cursor: pointer; font-weight: 600;">SELECT ALL (${cart.length} ITEM(S))</label>
                </div>
                <button style="background: none; border: none; color: #ef4444; font-weight: 600; cursor: pointer;" onclick="clearAllCheckedCartItems()">
                    <i class="fa-regular fa-trash-can"></i> DELETE SELECTED
                </button>
            </div>
            ${sellersHTML}
        </div>

        <div class="cart-summary-column">
            <h3 style="margin-top: 0; font-size: 18px; color: #0f172a; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">Order Summary</h3>
            <div class="summary-row">
                <span>Subtotal (${totalSelected} items)</span>
                <span>Rs. ${subtotal.toLocaleString()}</span>
            </div>
            <div class="summary-row">
                <span>Shipping Fee</span>
                <span>Rs. ${shippingFee.toLocaleString()}</span>
            </div>
            <div class="voucher-input-group">
                <input type="text" placeholder="Enter Voucher Code" class="voucher-field" id="voucherCodeField">
                <button class="voucher-apply-btn" onclick="applyCartVoucher()">APPLY</button>
            </div>
            <div class="summary-row summary-total">
                <span>Total Sum</span>
                <span style="color: #f97316; font-size: 18px;">Rs. ${totalPayable.toLocaleString()}</span>
            </div>
            <button class="checkout-action-btn" onclick="triggerCartCheckoutProceed()">PROCEED TO CHECKOUT (${totalSelected})</button>
        </div>
    </div>
  `;
}

function updateCartItemQty(index, delta) {
  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  let cart = JSON.parse(localStorage.getItem(userCartKey)) || [];
  cart[index].qty += delta;

  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }

  localStorage.setItem(userCartKey, JSON.stringify(cart));
  updateCartBadgeCount();
  renderCartPageItems();
}

function deleteCartItem(index) {
  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  let cart = JSON.parse(localStorage.getItem(userCartKey)) || [];
  cart.splice(index, 1);

  localStorage.setItem(userCartKey, JSON.stringify(cart));
  updateCartBadgeCount();
  renderCartPageItems();
}

function toggleCartItemSelection(index) {
  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  let cart = JSON.parse(localStorage.getItem(userCartKey)) || [];
  cart[index].selected = !cart[index].selected;

  localStorage.setItem(userCartKey, JSON.stringify(cart));
  renderCartPageItems();
}

function toggleSellerGroupSelection(seller, isChecked) {
  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  let cart = JSON.parse(localStorage.getItem(userCartKey)) || [];

  cart.forEach(item => {
    if (item.seller === seller) {
      item.selected = isChecked;
    }
  });

  localStorage.setItem(userCartKey, JSON.stringify(cart));
  renderCartPageItems();
}

function toggleSelectAllCart(isChecked) {
  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  let cart = JSON.parse(localStorage.getItem(userCartKey)) || [];

  cart.forEach(item => {
    item.selected = isChecked;
  });

  localStorage.setItem(userCartKey, JSON.stringify(cart));
  renderCartPageItems();
}

function clearAllCheckedCartItems() {
  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  let cart = JSON.parse(localStorage.getItem(userCartKey)) || [];
  
  cart = cart.filter(item => !item.selected);

  localStorage.setItem(userCartKey, JSON.stringify(cart));
  updateCartBadgeCount();
  renderCartPageItems();
}

function applyCartVoucher() {
  const code = document.getElementById("voucherCodeField").value.trim().toUpperCase();
  if (code === "VORTEX26") {
    alert("🎉 Code Activated: 10% discount application successfully registered.");
  } else {
    alert("⚠️ Code invalid or expired.");
  }
}

function triggerCartCheckoutProceed() {
  const userCartKey = `vortex_cart_${activeUserSession.email}`;
  const cart = JSON.parse(localStorage.getItem(userCartKey)) || [];
  const selectedItems = cart.filter(item => item.selected);

  if (selectedItems.length === 0) {
    alert("⚠️ Checkout Blocked: Please select at least 1 item using checkboxes.");
    return;
  }
  toggleCheckoutModal();
}

function toggleAuthModal(mode = 'login') {
  const dimmer = document.getElementById("authDimmer");
  const modal = document.getElementById("authModal");

  if (dimmer.classList.contains("active")) {
    dimmer.classList.remove("active");
    modal.classList.remove("active");
    setTimeout(() => {
      dimmer.style.display = "none";
      modal.style.display = "none";
    }, 300);
  } else {
    document.getElementById("loginForm").reset();
    document.getElementById("signupForm").reset();

    dimmer.style.display = "block";
    modal.style.display = "block";
    modal.offsetHeight; 
    
    dimmer.classList.add("active");
    modal.classList.add("active");

    switchAuthTab(mode);
  }
}

function switchAuthTab(tabType) {
  document.getElementById('otpVerificationScreen').style.display = 'none';
  document.getElementById('authTabsContainer').style.display = 'flex';
  document.getElementById('socialAuthGroup').style.display = 'block';

  if (tabType === 'login') {
    document.getElementById('loginTabBtn').classList.add('active');
    document.getElementById('signupTabBtn').classList.remove('active');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
  } else {
    document.getElementById('signupTabBtn').classList.add('active');
    document.getElementById('loginTabBtn').classList.remove('active');
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
  }
}

function handleRegistrationSubmit(event) {
  event.preventDefault();

  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;

  if (password !== confirmPassword) {
    alert("⚠️ Confirm password matching failed!");
    return;
  }
  if (password.length < 8) {
    alert("⚠️ Password security warning: Require minimum 8 characters.");
    return;
  }

  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    alert("⚠️ Please provide a valid, existing email domain address.");
    return;
  }

  pendingRegistrationPayload = { firstName, lastName, email, password };
  generatedValidationCode = Math.floor(100000 + Math.random() * 900000).toString();

  const emailData = {
    to_email: email,
    to_name: `${firstName} ${lastName}`,
    verification_code: generatedValidationCode,
    project_name: "Vortex Marketplace"
  };

  emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", emailData)
  .then(function(response) {
    console.log("SUCCESS Email sent!", response.status, response.text);
    alert(`✉️ A real verification code has been dispatched to: ${email}\nCheck your inbox or spam folder!`);
  }, function(error) {
    console.warn("EmailJS Service not configured yet. Falling back to dynamic system alert:", error);
    alert(`✉️ OTP Generated: ${generatedValidationCode}\n(Please configure EmailJS keys in app.js for production-grade dynamic emails)`);
  });

  document.getElementById('signupForm').style.display = 'none';
  document.getElementById('authTabsContainer').style.display = 'none';
  document.getElementById('socialAuthGroup').style.display = 'none';
  
  document.getElementById('verificationEmailTarget').innerText = email;
  document.getElementById('otpVerificationScreen').style.display = 'block';

  for (let i = 1; i <= 6; i++) {
    document.getElementById(`otp${i}`).value = "";
  }
  document.getElementById('otp1').focus();
}

function handleOtpFocus(element, index) {
  element.value = element.value.replace(/[^0-9]/g, '');
  if (element.value !== "" && index < 6) {
    document.getElementById(`otp${index + 1}`).focus();
  }
}

function verifyUserRegistrationOtp() {
  let enteredCode = "";
  for (let i = 1; i <= 6; i++) {
    enteredCode += document.getElementById(`otp${i}`).value;
  }

  if (enteredCode.length < 6) {
    alert("⚠️ Input incomplete. Please fill out all 6 digits.");
    return;
  }

  if (enteredCode === generatedValidationCode) {
    let db = JSON.parse(localStorage.getItem("usersDatabase")) || [];
    
    const newMerchantUserObj = {
      ownerName: `${pendingRegistrationPayload.firstName} ${pendingRegistrationPayload.lastName}`,
      brandName: `${pendingRegistrationPayload.firstName}'s Vortex Lab`,
      email: pendingRegistrationPayload.email,
      password: pendingRegistrationPayload.password,
      role: "owner",
      status: "pending",
      screenshot: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=300"
    };

    db.push(newMerchantUserObj);
    localStorage.setItem("usersDatabase", JSON.stringify(db));

    alert(`🎉 Activation Successful!\nWelcome ${newMerchantUserObj.ownerName}. Your profile is pending verification on the Admin Deck.`);
    toggleAuthModal('login');
    
    pendingRegistrationPayload = {};
    generatedValidationCode = "";
  } else {
    alert("❌ Verification Error: OTP mismatch. Try again.");
    for (let i = 1; i <= 6; i++) {
      document.getElementById(`otp${i}`).value = "";
    }
    document.getElementById('otp1').focus();
  }
}

function cancelOtpFlowState() {
  document.getElementById('otpVerificationScreen').style.display = 'none';
  document.getElementById('authTabsContainer').style.display = 'flex';
  document.getElementById('socialAuthGroup').style.display = 'block';
  document.getElementById('signupForm').style.display = 'block';
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;

  let db = JSON.parse(localStorage.getItem("usersDatabase")) || [];
  const matchedUser = db.find(u => u.email === email && u.password === pass);

  if (matchedUser) {
    if (matchedUser.status === 'blocked' || matchedUser.status === 'removed') {
      alert("❌ Access Denied: This account has been blocked or suspended by systems administration.");
      return;
    }
    
    activeUserSession = matchedUser;
    sessionStorage.setItem("vortex_active_user", JSON.stringify(matchedUser));
    
    updateHeaderSessionUI();
    updateCartBadgeCount();
    alert(`🔓 Welcome back, ${matchedUser.ownerName || 'Merchant'}!`);
    toggleAuthModal();
    goBackToHome();

    if (pendingCartItem) {
      executeAddToCart(pendingCartItem.id);
      pendingCartItem = null;
    }
  } else {
    alert("❌ Authentication Failed: Password or Username mismatch.");
  }
}

function toggleCheckoutModal() {
  const dimmer = document.getElementById("checkoutDimmer");
  const modal = document.getElementById("checkoutModal");

  if (dimmer.classList.contains("open") || dimmer.style.display === "block") {
    dimmer.style.display = "none";
    modal.style.display = "none";
    dimmer.classList.remove("open", "active");
    modal.classList.remove("open", "active");
  } else {
    dimmer.style.display = "block";
    modal.style.display = "block";
    modal.offsetHeight; 
    dimmer.classList.add("open", "active");
    modal.classList.add("open", "active");
  }
}

function handleOrderSubmission(event) {
  event.preventDefault();
  alert("🚀 Congratulations! Your order has been placed successfully. Thank you for shopping with Vortex Store!");
  
  if (activeUserSession) {
    const userCartKey = `vortex_cart_${activeUserSession.email}`;
    localStorage.removeItem(userCartKey);
  }
  
  const purchaseForm = document.getElementById("purchaseForm");
  if (purchaseForm) purchaseForm.reset();

  updateCartBadgeCount();
  toggleCheckoutModal();
  goBackToHome();
}