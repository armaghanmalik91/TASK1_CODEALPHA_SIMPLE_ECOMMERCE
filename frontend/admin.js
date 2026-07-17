// ==========================================
// DEFAULT SYSTEM CREDENTIALS
// ==========================================
const DEFAULT_ADMIN_EMAIL = "admin@vortex.com";
const DEFAULT_ADMIN_PASS = "adminPassword123";

let systemSession = null; // 'admin' or 'manager'

// Initialize Databases in LocalStorage if not present
if (!localStorage.getItem("usersDb")) {
    localStorage.setItem("usersDb", JSON.stringify([
        { email: "user@vortex.com", role: "customer", active: true }
    ]));
}
if (!localStorage.getItem("managersDb")) {
    localStorage.setItem("managersDb", JSON.stringify([]));
}
if (!localStorage.getItem("complaintsDb")) {
    localStorage.setItem("complaintsDb", JSON.stringify([
        { id: "T-1002", email: "user@vortex.com", desc: "Refund pending on order COD-221", status: "Open" }
    ]));
}

// Handler: Admin / Manager Login Check
document.getElementById("adminLoginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("adminEmail").value;
    const passInput = document.getElementById("adminPassword").value;

    // Check Admin Credentials
    if (emailInput === DEFAULT_ADMIN_EMAIL && passInput === DEFAULT_ADMIN_PASS) {
        openSystemConsole('Admin');
        return;
    }

    // Check Manager Credentials
    const managers = JSON.parse(localStorage.getItem("managersDb"));
    const matchingManager = managers.find(m => m.email === emailInput && m.password === passInput);
    if (matchingManager) {
        openSystemConsole('Manager', matchingManager.email);
        return;
    }

    alert("❌ System Error: Unauthorized Access / Invalid Credentials!");
});

function openSystemConsole(role, email = "Admin") {
    systemSession = role.toLowerCase();
    document.getElementById("adminLoginArea").style.display = "none";
    document.getElementById("adminMainArea").style.display = "flex";
    document.getElementById("sessionUser").innerText = email.split('@')[0];

    // Managers cannot see managers section or clear logs
    if (systemSession === 'manager') {
        document.querySelectorAll(".sidebar-menu .menu-item")[2].style.display = "none"; // Hide Manager menu
    }

    refreshDashboardMetrics();
}

function refreshDashboardMetrics() {
    const users = JSON.parse(localStorage.getItem("usersDb"));
    const managers = JSON.parse(localStorage.getItem("managersDb"));
    const complaints = JSON.parse(localStorage.getItem("complaintsDb"));

    document.getElementById("statUsers").innerText = users.length;
    document.getElementById("statManagers").innerText = managers.length;
    document.getElementById("statComplaints").innerText = complaints.length;

    // Render Tables
    renderTable("usersTableBody", users, item => `
        <tr><td>${item.email}</td><td><span class="badge badge-active">Active</span></td><td>${item.role}</td></tr>
    `);

    renderTable("managersTableBody", managers, item => `
        <tr><td>${item.email}</td><td>Manager Panel Access</td><td>${item.createdOn}</td></tr>
    `);

    renderTable("complaintsTableBody", complaints, item => `
        <tr><td>${item.id}</td><td>${item.email}</td><td>${item.desc}</td><td><span class="badge" style="background:#fef08a; color:#a16207;">${item.status}</span></td></tr>
    `);
}

function renderTable(elementId, dataset, itemHtmlGenerator) {
    const tableBody = document.getElementById(elementId);
    if (!tableBody) return;
    tableBody.innerHTML = dataset.map(itemHtmlGenerator).join("");
}

// Manager account generation by Admin
function handleCreateManager(event) {
    event.preventDefault();
    if (systemSession !== 'admin') {
        alert("❌ Permission Denied: Only Global System Admin can register Managers.");
        return;
    }

    const email = document.getElementById("mgrEmail").value;
    const password = document.getElementById("mgrPassword").value;
    const managers = JSON.parse(localStorage.getItem("managersDb"));

    if (managers.some(m => m.email === email)) {
        alert("⚠️ Manager email already exists.");
        return;
    }

    managers.push({ email, password, createdOn: new Date().toLocaleDateString() });
    localStorage.setItem("managersDb", JSON.stringify(managers));
    document.getElementById("createManagerForm").reset();
    
    alert("✅ New Manager Profile Provisioned Successfully!");
    refreshDashboardMetrics();
}

function switchSection(secId) {
    document.querySelectorAll(".admin-section").forEach(sec => sec.style.display = "none");
    document.querySelectorAll(".menu-item").forEach(item => item.classList.remove("active"));

    document.getElementById("sec-" + secId).style.display = "block";
    event.currentTarget.classList.add("active");
}

function logoutAdmin() {
    location.reload();
}