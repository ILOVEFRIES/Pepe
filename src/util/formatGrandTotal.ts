export default function formatGrandTotal(amount: any) {
  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });
  return formatter.format(amount).replace("IDR", "Rp").trim();
}
