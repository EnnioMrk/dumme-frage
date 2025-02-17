const socket = io();
const qrcodeDiv = document.getElementById("qrcode");
const statusText = document.getElementById("status");

socket.on("qr", (qr) => {
  console.log("Received new qr code");
  qrcodeDiv.innerHTML = "";
  const img = document.createElement("img");
  img.src = qr;
  img.alt = "WhatsApp QR Code";
  img.className = "mx-auto";
  qrcodeDiv.appendChild(img);
  statusText.textContent = "Scan this QR code with WhatsApp";
});

socket.on("ready", () => {
  qrcodeDiv.innerHTML = "✅";
  statusText.textContent = "WhatsApp is connected!";
  setTimeout(() => {
    window.location.href = "/settings";
  }, 1000);
});

socket.on("disconnected", () => {
  statusText.textContent = "WhatsApp is disconnected. Please refresh the page.";
});

socket.on("error", (error) => {
  statusText.textContent = `Error: ${error}`;
});
