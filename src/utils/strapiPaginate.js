const PAGE_SIZE = 100;

// Fetch every page of a Strapi v4 collection. First page is fetched to
// learn the page count, then pages 2..N are fetched in parallel — keeps
// the wall-clock time close to a single round trip even for 1000+ records.
export async function fetchAllStrapi(apiBase, pathWithQuery) {
  const sep = pathWithQuery.includes('?') ? '&' : '?';
  const url = (page) =>
    `${apiBase}${pathWithQuery}${sep}pagination[page]=${page}&pagination[pageSize]=${PAGE_SIZE}`;

  const firstResp = await fetch(url(1));
  if (!firstResp.ok) throw new Error(`Strapi ${firstResp.status} on ${pathWithQuery}`);
  const firstJson = await firstResp.json();
  const all = firstJson.data || [];
  const pageCount = firstJson.meta?.pagination?.pageCount || 1;
  if (pageCount <= 1) return all;

  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) =>
      fetch(url(i + 2)).then(async (r) => {
        if (!r.ok) throw new Error(`Strapi ${r.status} page ${i + 2}`);
        const j = await r.json();
        return j.data || [];
      })
    )
  );
  for (const arr of rest) all.push(...arr);
  return all;
}
