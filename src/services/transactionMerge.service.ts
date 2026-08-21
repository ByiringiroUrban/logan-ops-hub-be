import { prisma } from "../config/prisma";

export async function mergeDuplicateTransactions(): Promise<{ mergedCount: number }> {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        status: { not: "CANCELLED" },
      },
      orderBy: { date: "asc" },
    });

    // Group transactions by (clientId + "_" + productId + "_" + YYYY-MM-DD)
    const groupMap = new Map<string, typeof transactions>();

    for (const tx of transactions) {
      const dStr = tx.date.toISOString().slice(0, 10);
      const key = `${tx.clientId}_${tx.productId}_${dStr}`;
      const group = groupMap.get(key) || [];
      group.push(tx);
      groupMap.set(key, group);
    }

    let mergedCount = 0;

    for (const [key, group] of groupMap.entries()) {
      if (group.length <= 1) continue;

      // Keep the latest record or first record, accumulate quantities
      const primary = group[group.length - 1];
      const others = group.slice(0, group.length - 1);

      const totalQty = group.reduce((sum, t) => sum + t.quantity, 0);
      const unitPrice = primary.unitPrice;
      const totalAmount = totalQty * unitPrice;

      const combinedNotes = Array.from(
        new Set(group.map((t) => t.notes).filter(Boolean))
      ).join(" | ");

      // Update primary
      await prisma.transaction.update({
        where: { id: primary.id },
        data: {
          quantity: totalQty,
          totalAmount,
          notes: combinedNotes || null,
          date: primary.date,
        },
      });

      // Delete the duplicate others
      const idsToDelete = others.map((t) => t.id);
      await prisma.transaction.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      mergedCount += others.length;
    }

    return { mergedCount };
  } catch (error) {
    console.error("Error merging duplicates:", error);
    return { mergedCount: 0 };
  }
}
