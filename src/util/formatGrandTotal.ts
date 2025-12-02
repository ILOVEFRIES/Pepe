export default function formatGrandTotal(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);

  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

  return formatter.format(num).replace("IDR", "Rp").trim();
}
