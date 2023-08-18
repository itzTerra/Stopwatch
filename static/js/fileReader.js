// https://web.dev/patterns/files/drag-and-drop-files/

// Run feature detection.
const supportsFileSystemAccessAPI =
  "getAsFileSystemHandle" in DataTransferItem.prototype;

// This is the drag and drop zone.
const dropZone = document.querySelector(".bootstrap-table");

// Prevent navigation.
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
});

// Visually highlight the drop zone.
dropZone.addEventListener("dragenter", (e) => {
  dropZone.style.outline = "solid #0dcaf0 1px";
});

// Visually unhighlight the drop zone.
dropZone.addEventListener("dragleave", (e) => {
  let rect = dropZone.getBoundingClientRect();
  if (
    e.clientY < rect.top ||
    e.clientY >= rect.bottom ||
    e.clientX < rect.left ||
    e.clientX >= rect.right
  ) {
    dropZone.style.outline = "";
  }
});

// This is where the drop is handled.
dropZone.addEventListener("drop", async (e) => {
  // Prevent navigation.
  e.preventDefault();
  // Unhighlight the drop zone.
  dropZone.style.outline = "";
  // Prepare an array of promises…
  const fileHandlesPromises = [...e.dataTransfer.items]
    // …by including only files (where file misleadingly means actual file _or_
    // directory)…
    .filter((item) => item.kind === "file")
    // …and, depending on previous feature detection…
    .map((item) =>
      supportsFileSystemAccessAPI
        ? // …either get a modern `FileSystemHandle`…
          item.getAsFileSystemHandle()
        : // …or a classic `File`.
          item.getAsFile()
    );
  // Loop over the array of promises.
  for await (const handle of fileHandlesPromises) {
    if (handle.kind === "directory" || handle.isDirectory) return;

    // This is where we can actually exclusively act on the files.
    if (handle.kind === "file" || handle.isFile) {
      let file = handle;
      // console.log(`File: ${file.name}`);
      if (file instanceof FileSystemFileHandle) {
        file = await handle.getFile();
      }

      readFile(file);
    }
  }
});

async function readFile(file) {
  let entries;

  if (file.type == "text/plain" || file.type == "text/csv") {
    entries = readText(await file.text());
  }

  if (entries != null) {
    for (let entry of entries) {
      appendHistoryRow(entry.date, entry.ms);
    }
    saveTimeHistory();
  }
}

function readText(text) {
  let entries = [];

  const lines = text.split("\n");
  for (let i = 2; i < lines.length; i++) {
    const [date, time] = lines[i].split(",");
    if (!date || !time) continue;
    entries.push({ date: dateStrToMs(date), ms: timeStrToMs(time) });
  }

  return entries;
}
