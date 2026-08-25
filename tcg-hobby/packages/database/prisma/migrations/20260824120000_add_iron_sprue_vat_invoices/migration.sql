CREATE TABLE "IronSprueVatInvoice" (
    "id" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL DEFAULT 'IRON_SPRUE',
    "orderId" TEXT NOT NULL,
    "sequence" SERIAL NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderNumber" TEXT NOT NULL,
    "sellerLegalName" TEXT NOT NULL,
    "sellerCompanyNumber" TEXT NOT NULL,
    "sellerVatNumber" TEXT NOT NULL,
    "sellerRegisteredOffice" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "billingLine1" TEXT NOT NULL,
    "billingLine2" TEXT,
    "billingCity" TEXT NOT NULL,
    "billingRegion" TEXT,
    "billingPostalCode" TEXT NOT NULL,
    "billingCountry" TEXT NOT NULL,
    "subtotalNetMinor" INTEGER NOT NULL,
    "subtotalVatMinor" INTEGER NOT NULL,
    "subtotalGrossMinor" INTEGER NOT NULL,
    "shippingNetMinor" INTEGER NOT NULL,
    "shippingVatMinor" INTEGER NOT NULL,
    "shippingGrossMinor" INTEGER NOT NULL,
    "discountNetMinor" INTEGER NOT NULL DEFAULT 0,
    "discountVatMinor" INTEGER NOT NULL DEFAULT 0,
    "discountGrossMinor" INTEGER NOT NULL DEFAULT 0,
    "orderNetTotalMinor" INTEGER NOT NULL,
    "vatTotalMinor" INTEGER NOT NULL,
    "grossTotalMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IronSprueVatInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IronSprueVatInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "lineType" TEXT NOT NULL DEFAULT 'PRODUCT',
    "description" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitGrossMinor" INTEGER NOT NULL,
    "netMinor" INTEGER NOT NULL,
    "vatRate" INTEGER NOT NULL DEFAULT 20,
    "vatMinor" INTEGER NOT NULL,
    "grossMinor" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IronSprueVatInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IronSprueVatInvoice_orderId_key" ON "IronSprueVatInvoice"("orderId");
CREATE UNIQUE INDEX "IronSprueVatInvoice_sequence_key" ON "IronSprueVatInvoice"("sequence");
CREATE UNIQUE INDEX "IronSprueVatInvoice_invoiceNumber_key" ON "IronSprueVatInvoice"("invoiceNumber");
CREATE INDEX "IronSprueVatInvoice_storeCode_invoiceDate_idx" ON "IronSprueVatInvoice"("storeCode", "invoiceDate");
CREATE INDEX "IronSprueVatInvoice_orderNumber_idx" ON "IronSprueVatInvoice"("orderNumber");
CREATE INDEX "IronSprueVatInvoiceLine_invoiceId_sortOrder_idx" ON "IronSprueVatInvoiceLine"("invoiceId", "sortOrder");
CREATE INDEX "IronSprueVatInvoiceLine_orderItemId_idx" ON "IronSprueVatInvoiceLine"("orderItemId");

ALTER TABLE "IronSprueVatInvoice" ADD CONSTRAINT "IronSprueVatInvoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "IronSprueOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IronSprueVatInvoiceLine" ADD CONSTRAINT "IronSprueVatInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "IronSprueVatInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
