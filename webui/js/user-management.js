let pendingRemovalUserId = null;
let pendingRemovalUsername = null;
let pendingEditUserId = null;
let pendingEditUsername = null;
let pendingBanUserId = null;
let pendingBanUsername = null;
let currentSort = "reputation";

document.addEventListener("DOMContentLoaded", function () {
  const userSearch = document.getElementById("userSearch");
  const statusFilter = document.getElementById("statusFilter");
  const sortFilter = document.getElementById("sortFilter");

  if (userSearch) {
    userSearch.addEventListener("input", filterAndSortUsers);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", filterAndSortUsers);
  }

  if (sortFilter) {
    sortFilter.addEventListener("change", function () {
      currentSort = this.value;
      filterAndSortUsers();
    });
  }

  const modals = [
    "userDetailsModal",
    "editReputationModal",
    "banUserModal",
    "confirmationModal",
  ];

  modals.forEach((modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === this) {
          closeAllModals();
        }
      });
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAllModals();
    }
  });
});

function filterAndSortUsers() {
  const searchTerm =
    document.getElementById("userSearch")?.value.toLowerCase() || "";
  const statusFilter = document.getElementById("statusFilter")?.value || "all";
  const rows = document.querySelectorAll(".user-row");

  let visibleRows = [];

  rows.forEach((row) => {
    const username = row.dataset.username || "";
    const userid = row.dataset.userid || "";
    const status = row.dataset.status || "";
    const hidden = row.dataset.hidden === "true";
    const reputation = parseInt(row.dataset.reputation) || 0;

    const matchesSearch =
      username.includes(searchTerm) || userid.includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && status === "active") ||
      (statusFilter === "banned" && status === "banned") ||
      (statusFilter === "hidden" && hidden) ||
      (statusFilter === "positive" && reputation > 0) ||
      (statusFilter === "negative" && reputation < 0);

    const shouldShow = matchesSearch && matchesStatus;
    row.style.display = shouldShow ? "" : "none";

    if (shouldShow) {
      visibleRows.push(row);
    }
  });

  sortVisibleRows(visibleRows);
  updateResultCount(visibleRows.length);
}

function sortVisibleRows(rows) {
  rows.sort((a, b) => {
    const aData = a.dataset;
    const bData = b.dataset;

    switch (currentSort) {
      case "reputation":
        return parseInt(bData.reputation) - parseInt(aData.reputation);
      case "messages":
        return parseInt(bData.messages) - parseInt(aData.messages);
      case "recent":
        return (
          parseInt(bData.lastInteraction) - parseInt(aData.lastInteraction)
        );
      case "username":
        return aData.username.localeCompare(bData.username);
      default:
        return 0;
    }
  });

  const tbody = rows[0]?.closest("tbody");
  if (tbody) {
    rows.forEach((row) => tbody.appendChild(row));
  }
}

function updateResultCount(count) {
  const countElement = document.getElementById("resultCount");
  if (countElement) {
    countElement.textContent = `Showing ${count} user${count !== 1 ? "s" : ""}`;
  }
}

function showUserDetails(userId) {
  let userData = null;
  try {
    if (typeof users !== "undefined" && Array.isArray(users)) {
      userData = users.find((u) => u.id === userId);
    }
  } catch (error) {
    console.error("Error accessing user data:", error);
  }

  if (!userData) {
    showNotification("Error", "User data not found", "error");
    return;
  }

  const content = document.getElementById("userDetailsContent");
  if (!content) {
    console.error("User details content element not found");
    return;
  }

  let lastInteractionFormatted = "Never";
  try {
    if (userData.lastInteraction) {
      const date = new Date(userData.lastInteraction);
      lastInteractionFormatted = date.toLocaleString();
    }
  } catch (error) {
    console.error("Error formatting date:", error);
  }

  content.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 class="font-semibold mb-3 text-white">Basic Information</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Username:</span>
                        <span class="text-white">${escapeHtml(userData.username || "Unknown")}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">User ID:</span>
                        <span class="text-white font-mono">${escapeHtml(userData.id || "Unknown")}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Status:</span>
                        <span class="text-white">${userData.banned ? "Banned" : "Active"}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Leaderboard:</span>
                        <span class="text-white">${userData.hiddenFromLeaderboard ? "Hidden" : "Visible"}</span>
                    </div>
                    ${
                      userData.banned && userData.banReason
                        ? `
                        <div class="mt-2">
                            <span class="text-gray-400 block">Ban Reason:</span>
                            <span class="text-white text-xs bg-gray-800 p-2 rounded mt-1 block">${escapeHtml(userData.banReason)}</span>
                        </div>
                    `
                        : ""
                    }
                </div>
            </div>

            <div>
                <h4 class="font-semibold mb-3 text-white">Activity Stats</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-400">Reputation:</span>
                        <span class="text-white font-bold ${userData.score > 0 ? "text-green-400" : userData.score < 0 ? "text-red-400" : ""}">${(userData.score || 0).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Bond Level:</span>
                        <span class="text-white">${userData.bondLvl || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Total Messages:</span>
                        <span class="text-white">${(userData.totalMsgCount || 0).toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Mute Count:</span>
                        <span class="text-white ${userData.muteCount > 5 ? "text-orange-400" : ""}">${userData.muteCount || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-400">Last Active:</span>
                        <span class="text-white text-xs">${lastInteractionFormatted}</span>
                    </div>
                </div>
            </div>

            <div class="md:col-span-2">
                <h4 class="font-semibold mb-3 text-white">Quick Actions</h4>
                <div class="flex flex-wrap gap-2">
                    <button onclick="editReputation('${userData.id}', '${escapeHtml(userData.username)}', ${userData.score}); closeUserDetailsModal();"
                            class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                        <span class="material-symbols-rounded text-sm">edit</span>
                        Edit Reputation
                    </button>
                    <button onclick="toggleLeaderboardVisibility('${userData.id}', '${escapeHtml(userData.username)}', ${userData.hiddenFromLeaderboard}); closeUserDetailsModal();"
                            class="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                        <span class="material-symbols-rounded text-sm">${userData.hiddenFromLeaderboard ? "visibility" : "visibility_off"}</span>
                        ${userData.hiddenFromLeaderboard ? "Show" : "Hide"} on Leaderboard
                    </button>
                    ${
                      !userData.banned
                        ? `
                        <button onclick="banUser('${userData.id}', '${escapeHtml(userData.username)}'); closeUserDetailsModal();"
                                class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                            <span class="material-symbols-rounded text-sm">gavel</span>
                            Ban User
                        </button>
                    `
                        : `
                        <button onclick="unbanUser('${userData.id}', '${escapeHtml(userData.username)}'); closeUserDetailsModal();"
                                class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                            <span class="material-symbols-rounded text-sm">check_circle</span>
                            Unban User
                        </button>
                    `
                    }
                    <button onclick="confirmDataRemoval('${userData.id}', '${escapeHtml(userData.username)}', false); closeUserDetailsModal();"
                            class="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2">
                        <span class="material-symbols-rounded text-sm">delete</span>
                        Remove User Data
                    </button>
                </div>
            </div>
        </div>
    `;

  document.getElementById("userDetailsModal")?.classList.remove("hidden");
}

function editReputation(userId, username, currentReputation) {
  pendingEditUserId = userId;
  pendingEditUsername = username;

  const modal = document.getElementById("editReputationModal");
  const message = document.getElementById("editReputationMessage");
  const input = document.getElementById("newReputation");

  if (!modal || !message || !input) {
    console.error("Edit reputation modal elements not found");
    return;
  }

  message.textContent = `Edit reputation for "${username}":`;
  input.value = currentReputation;
  input.focus();
  input.select();

  modal.classList.remove("hidden");
}

async function saveReputation() {
  if (!pendingEditUserId) {
    showNotification("Error", "No user selected for editing", "error");
    return;
  }

  const input = document.getElementById("newReputation");
  const newReputation = parseInt(input?.value);

  if (isNaN(newReputation)) {
    showNotification("Error", "Please enter a valid number", "error");
    return;
  }

  try {
    const response = await fetch("/api/reputation/save", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: pendingEditUserId,
        score: newReputation,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      showNotification("Success", "Reputation updated successfully", "success");
      closeEditReputationModal();
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showNotification(
        "Error",
        result.error || "Failed to update reputation",
        "error",
      );
    }
  } catch (error) {
    showNotification("Error", "Network error occurred", "error");
    console.error("Reputation update error:", error);
  }
}

async function toggleLeaderboardVisibility(userId, username, currentlyHidden) {
  try {
    const response = await fetch("/api/leaderboard/visibility", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: userId,
        hidden: !currentlyHidden,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      const action = currentlyHidden ? "shown on" : "hidden from";
      showNotification(
        "Success",
        `"${username}" ${action} leaderboard`,
        "success",
      );
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showNotification(
        "Error",
        result.error || "Failed to update leaderboard visibility",
        "error",
      );
    }
  } catch (error) {
    showNotification("Error", "Network error occurred", "error");
    console.error("Leaderboard visibility error:", error);
  }
}

function banUser(userId, username) {
  pendingBanUserId = userId;
  pendingBanUsername = username;

  const modal = document.getElementById("banUserModal");
  const message = document.getElementById("banUserMessage");
  const textarea = document.getElementById("banReason");

  if (!modal || !message || !textarea) {
    console.error("Ban user modal elements not found");
    return;
  }

  message.textContent = `Ban user "${username}":`;
  textarea.value = "";
  textarea.focus();

  modal.classList.remove("hidden");
}

async function executeBan() {
  if (!pendingBanUserId) {
    showNotification("Error", "No user selected for banning", "error");
    return;
  }

  const textarea = document.getElementById("banReason");
  const reason = textarea?.value.trim();

  if (!reason) {
    showNotification("Error", "Ban reason is required", "error");
    return;
  }

  try {
    const response = await fetch("/api/ban", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: pendingBanUserId,
        reason: reason,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(
        "Success",
        `"${pendingBanUsername}" has been banned`,
        "success",
      );
      closeBanUserModal();
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showNotification("Error", result.error || "Failed to ban user", "error");
    }
  } catch (error) {
    showNotification("Error", "Network error occurred", "error");
    console.error("Ban user error:", error);
  }
}

async function unbanUser(userId, username) {
  if (!confirm(`Are you sure you want to unban "${username}"?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/unban/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (response.ok) {
      showNotification("Success", `"${username}" has been unbanned`, "success");
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showNotification(
        "Error",
        result.error || "Failed to unban user",
        "error",
      );
    }
  } catch (error) {
    showNotification("Error", "Network error occurred", "error");
    console.error("Unban user error:", error);
  }
}

function confirmDataRemoval(userId, username, shouldBan) {
  pendingRemovalUserId = userId;
  pendingRemovalUsername = username;

  const modal = document.getElementById("confirmationModal");
  const title = document.getElementById("confirmationTitle");
  const message = document.getElementById("confirmationMessage");

  if (!modal || !title || !message) {
    console.error("Confirmation modal elements not found");
    return;
  }

  title.textContent = "Confirm User Data Removal";
  message.textContent = `Are you sure you want to remove the user record for "${username}"? This will only remove the user from the database. Memories and conversation history will be preserved.`;

  modal.classList.remove("hidden");
}

async function executeDataRemoval() {
  if (!pendingRemovalUserId) {
    showNotification("Error", "No user selected for removal", "error");
    return;
  }

  const confirmButton = document.querySelector(
    '#confirmationModal button[onclick="executeDataRemoval()"]',
  );
  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.textContent = "Removing...";
  }

  try {
    const response = await fetch("/api/user/remove-data", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: pendingRemovalUserId,
        shouldBan: false,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(
        "Success",
        result.message || "User data removed successfully",
        "success",
      );
      closeConfirmationModal();

      const userRow = document.querySelector(
        `[data-userid="${pendingRemovalUserId}"]`,
      );
      if (userRow) {
        userRow.style.transition = "opacity 0.3s ease";
        userRow.style.opacity = "0";
        setTimeout(() => userRow.remove(), 300);
      }

      setTimeout(() => window.location.reload(), 2000);
    } else {
      showNotification(
        "Error",
        result.error || "Failed to remove user data",
        "error",
      );
    }
  } catch (error) {
    showNotification("Error", "Network error occurred", "error");
    console.error("Data removal error:", error);
  } finally {
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.textContent = "Confirm Removal";
    }
  }
}

function closeAllModals() {
  closeUserDetailsModal();
  closeEditReputationModal();
  closeBanUserModal();
  closeConfirmationModal();
}

function closeUserDetailsModal() {
  document.getElementById("userDetailsModal")?.classList.add("hidden");
}

function closeEditReputationModal() {
  document.getElementById("editReputationModal")?.classList.add("hidden");
  pendingEditUserId = null;
  pendingEditUsername = null;
}

function closeBanUserModal() {
  document.getElementById("banUserModal")?.classList.add("hidden");
  pendingBanUserId = null;
  pendingBanUsername = null;
}

function closeConfirmationModal() {
  document.getElementById("confirmationModal")?.classList.add("hidden");
  pendingRemovalUserId = null;
  pendingRemovalUsername = null;
}

function showNotification(title, message, type = "info") {
  const notification = document.getElementById("notification");
  const icon = document.getElementById("notificationIcon");
  const titleEl = document.getElementById("notificationTitle");
  const messageEl = document.getElementById("notificationMessage");

  if (!notification || !icon || !titleEl || !messageEl) {
    console.error("Notification elements not found");
    return;
  }

  const icons = {
    success: { icon: "check_circle", color: "text-green-400" },
    error: { icon: "error", color: "text-red-400" },
    warning: { icon: "warning", color: "text-yellow-400" },
    info: { icon: "info", color: "text-blue-400" },
  };

  const config = icons[type] || icons.info;

  icon.textContent = config.icon;
  icon.className = `material-symbols-rounded text-lg ${config.color}`;
  titleEl.textContent = title;
  messageEl.textContent = message;

  notification.classList.remove("translate-x-full");

  setTimeout(() => {
    notification.classList.add("translate-x-full");
  }, 5000);
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") {
    return String(unsafe || "");
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
