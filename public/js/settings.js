const contactSearch = document.getElementById("contactSearch");
const contactDropdown = document.getElementById("contactDropdown");
const selectedContactInput = document.getElementById("selectedContact");

// Load and display contacts
async function loadContacts() {
  try {
    const response = await fetch("/api/contacts");
    if (response.ok) {
      const contacts = await response.json();
      return contacts;
    }
    return [];
  } catch (error) {
    console.error("Error loading contacts:", error);
    return [];
  }
}

// Filter and display contacts based on search input
function filterContacts(contacts, searchText) {
  return contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
      contact.number.toLowerCase().includes(searchText.toLowerCase())
  );
}

// Display contacts in dropdown
function displayContacts(contacts) {
  contactDropdown.innerHTML = "";
  contacts.forEach((contact) => {
    const div = document.createElement("div");
    div.className = "cursor-pointer p-2 hover:bg-gray-100";
    div.textContent = `${contact.name} (${contact.number})`;
    div.addEventListener("click", () => {
      contactSearch.value = contact.name;
      selectedContactInput.value = contact.id;
      contactDropdown.classList.add("hidden");
    });
    contactDropdown.appendChild(div);
  });
}

// Handle contact search
let allContacts = [];
contactSearch.addEventListener("focus", async () => {
  displayContacts(allContacts);
  contactDropdown.classList.remove("hidden");
});

contactSearch.addEventListener("input", () => {
  const filtered = filterContacts(allContacts, contactSearch.value);
  displayContacts(filtered);
  contactDropdown.classList.remove("hidden");
});

document.addEventListener("click", (e) => {
  if (
    !contactSearch.contains(e.target) &&
    !contactDropdown.contains(e.target)
  ) {
    contactDropdown.classList.add("hidden");
  }
});

document
  .getElementById("settingsForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const nickname = document.getElementById("nickname").value;
    const responsePrompt = document.getElementById("responsePrompt").value;
    const classificationPrompt = document.getElementById(
      "classificationPrompt"
    ).value;
    const selectedContact = document.getElementById("selectedContact").value;

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nickname,
          response_prompt: responsePrompt,
          classification_prompt: classificationPrompt,
          selected_contact: selectedContact,
        }),
      });

      if (response.ok) {
        alert("Settings saved successfully!");
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || "Failed to save settings"}`);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    }
  });

// Load existing settings
async function loadSettings() {
  try {
    const response = await fetch("/api/settings");
    if (response.ok) {
      const settings = await response.json();
      document.getElementById("nickname").value = settings.nickname || "";
      document.getElementById("responsePrompt").value =
        settings.response_prompt || "";
      document.getElementById("classificationPrompt").value =
        settings.classification_prompt || "";
      if (settings.selected_contact) {
        selectedContactInput.value = settings.selected_contact;
        const contact = allContacts.find(
          (c) => c.id === settings.selected_contact
        );
        if (contact) {
          contactSearch.value = contact.name;
        }
      }
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

// Load settings when the page loads
allContacts = await loadContacts();
loadSettings();
