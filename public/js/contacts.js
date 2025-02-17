// Fetch and manage contacts
async function fetchContacts() {
  try {
    const response = await fetch("/api/contacts");
    if (response.ok) {
      return await response.json();
    }
    throw new Error("Failed to fetch contacts");
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

// Initialize contact search functionality
async function initializeContactSearch() {
  const contacts = await fetchContacts();
  const searchInput = document.getElementById("contactSearch");
  const dropdown = document.getElementById("contactDropdown");
  const selectedContactInput = document.getElementById("selectedContact");

  function filterContacts(query) {
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query.toLowerCase()) ||
        contact.number.includes(query)
    );
  }

  function updateDropdown(filteredContacts) {
    dropdown.innerHTML = "";
    filteredContacts.forEach((contact) => {
      const div = document.createElement("div");
      div.className =
        "cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-100";
      div.innerHTML = `
        <span class="block truncate">${contact.name}</span>
        <span class="block text-sm text-gray-500 truncate">${contact.number}</span>
      `;
      div.onclick = () => {
        searchInput.value = contact.name;
        selectedContactInput.value = contact.id;
        dropdown.classList.add("hidden");
      };
      dropdown.appendChild(div);
    });
  }

  searchInput.addEventListener("focus", () => {
    const filtered = filterContacts(searchInput.value);
    updateDropdown(filtered);
    dropdown.classList.remove("hidden");
  });

  searchInput.addEventListener("input", () => {
    const filtered = filterContacts(searchInput.value);
    updateDropdown(filtered);
    dropdown.classList.remove("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeContactSearch);
