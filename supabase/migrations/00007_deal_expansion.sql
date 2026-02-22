ALTER TABLE "Deal" ADD COLUMN "lossReason" text;
ALTER TABLE "Deal" ADD COLUMN "askingPrice" numeric(15,2);

ALTER TABLE "Company" ADD COLUMN "location" text;
ALTER TABLE "Company" ADD COLUMN "employees" integer;
