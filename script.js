(() => {
  "use strict";

  const URL = window.SUPABASE_URL;
  const KEY = window.SUPABASE_ANON_KEY;
  const BUCKET = "Mener";
  const gallery = document.getElementById("gallery");
  const empty = document.getElementById("empty");
  const count = document.getElementById("count");
  const form = document.getElementById("memory-form");
  const status = document.getElementById("status");
  const saveButton = document.getElementById("save-button");
  const template = document.getElementById("memory-template");
  const selectedNote = document.getElementById("selected-note");
  let selectedPerson = "Columbus";
  let supabase;

  document.querySelectorAll(".person").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPerson = button.dataset.person;
      document.querySelectorAll(".person").forEach((personButton) => {
        const active = personButton === button;
        personButton.classList.toggle("selected", active);
        personButton.setAttribute("aria-pressed", String(active));
      });
      selectedNote.textContent = `Du tilføjer minder som ${selectedPerson} ♡`;
    });
  });

  function setStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "#a33e60" : "";
  }

  function niceError(error) {
    const message = error?.message || "Noget gik galt. Prøv igen.";
    if (message.toLowerCase().includes("row-level security")) {
      return "Supabase afviste handlingen. Følg opsætningen i README.md, og kontrollér adgangspolitikkerne.";
    }
    if (message.toLowerCase().includes("bucket")) {
      return "Billedlageret eller uploadtilladelsen mangler. Følg trinene i README.md, og prøv igen.";
    }
    return message;
  }

  async function loadMemories() {
    const { data, error } = await supabase.from("memories").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    if (!gallery) return;
    gallery.replaceChildren();
    const memories = data || [];
    count.textContent = `${memories.length} ${memories.length === 1 ? "minde" : "minder"}`;
    empty.hidden = memories.length > 0;

    memories.forEach((memory) => {
      const card = template.content.cloneNode(true);
      const image = card.querySelector(".memory-photo");
      const date = card.querySelector(".date");
      const title = card.querySelector(".title");
      const place = card.querySelector(".place");
      const story = card.querySelector(".story");
      const uploader = card.querySelector(".uploader");

      image.src = supabase.storage.from(BUCKET).getPublicUrl(memory.image_path).data.publicUrl;
      image.alt = memory.title || "Vores minde";
      date.textContent = memory.memory_date
        ? new Date(`${memory.memory_date}T12:00:00`).toLocaleDateString("da-DK", { year: "numeric", month: "long", day: "numeric" })
        : "";
      title.textContent = memory.title || "Et lille minde";
      place.replaceChildren();
      if (memory.place) {
        const pin = document.createElement("span");
        pin.className = "place-pin";
        pin.setAttribute("aria-hidden", "true");
        pin.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>';
        place.append(pin, document.createTextNode(memory.place));
      }
      story.textContent = memory.story || "";
      uploader.innerHTML = '<svg class="heart-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21s-9-5.7-9-12a5.2 5.2 0 0 1 9-3.5A5.2 5.2 0 0 1 21 9c0 6.3-9 12-9 12Z"/></svg> ';
      uploader.append(document.createTextNode(`Tilføjet af ${memory.uploaded_by || "en af os"}`));
      gallery.appendChild(card);
    });
  }

  async function addMemory(event) {
    event.preventDefault();
    const file = document.getElementById("photo").files[0];
    const title = document.getElementById("title").value.trim();
    const memoryDate = document.getElementById("memory-date").value || null;
    const place = document.getElementById("place").value.trim();
    const story = document.getElementById("story").value.trim();

    if (!file || !title) return setStatus("Vælg et billede, og skriv en titel først.", true);
    if (!file.type.startsWith("image/")) return setStatus("Vælg venligst en billedfil.", true);
    if (file.size > 10 * 1024 * 1024) return setStatus("Vælg et billede, der fylder under 10 MB.", true);

    saveButton.disabled = true;
    setStatus("Gemmer dit minde …");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `public/${crypto.randomUUID()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type
      });
      if (uploadError) throw uploadError;

      const { error: rowError } = await supabase.from("memories").insert({
        title,
        memory_date: memoryDate,
        place,
        story,
        image_path: path,
        uploaded_by: selectedPerson
      });
      if (rowError) throw rowError;

      form.reset();
      if (gallery) await loadMemories();
      setStatus(`Minde tilføjet af ${selectedPerson} ♡`);
    } catch (error) {
      setStatus(niceError(error), true);
    } finally {
      saveButton.disabled = false;
    }
  }

  async function start() {
    if (!URL || !KEY || URL.includes("PASTE_YOUR") || KEY.includes("PASTE_YOUR")) {
      setStatus("Tilføj først din Supabase-adresse og offentlige nøgle i config.js.", true);
      return;
    }
    if (!window.supabase?.createClient) {
      setStatus("Supabase kunne ikke indlæses. Tjek din internetforbindelse.", true);
      return;
    }
    supabase = window.supabase.createClient(URL, KEY);
    try {
      if (gallery) await loadMemories();
    } catch (error) {
      setStatus(niceError(error), true);
    }
  }

  if (form) form.addEventListener("submit", addMemory);
  start();
})();
