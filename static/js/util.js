function dateSorter(a, b) {
  const [dayA, monthA, yearA] = a.split("/");
  const [dayB, monthB, yearB] = b.split("/");

  const dateA = new Date(`${monthA}/${dayA}/${yearA}`);
  const dateB = new Date(`${monthB}/${dayB}/${yearB}`);

  return dateA - dateB;
}
