export async function parseCSV(file: File): Promise<any[]> {
  const text = await file.text();
  const rows = text.split('\n');
  const headers = rows[0].split(',');
  
  return rows.slice(1).map(row => {
    const values = row.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim();
      return obj;
    }, {} as any);
  });
}
