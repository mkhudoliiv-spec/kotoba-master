// Loads a JSON file from public/data/. Tries the GitHub Pages subpath first, then
// relative and root paths, so it works both deployed and in local dev.
export async function fetchDataFile(name) {
  const candidatePaths = [
    `/kotoba-master/data/${name}`,
    `./data/${name}`,
    `/data/${name}`
  ];
  for (const path of candidatePaths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // try next candidate path
    }
  }
  throw new Error(`Failed to load ${name}`);
}
