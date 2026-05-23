import { NextResponse } from "next/server";
  import { getShopCatalog } from "@/lib/shop-catalog";

  export const dynamic = "force-dynamic";

  export async function GET() {
    const catalog = await getShopCatalog();
    return NextResponse.json(catalog);
  }
  